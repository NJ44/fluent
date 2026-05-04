import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const busboy = require('busboy') as (opts: import('busboy').BusboyConfig) => import('busboy').Busboy;
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';

interface ParsedMultipart {
  fields: Record<string, string>;
  files: Record<string, { data: Buffer; filename: string; mimeType: string }>;
}

function parseMultipart(event: HandlerEvent): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Record<string, { data: Buffer; filename: string; mimeType: string }> = {};

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    const bb = busboy({ headers: { 'content-type': contentType } });

    bb.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    bb.on('file', (name: string, stream: NodeJS.ReadableStream, info: import('busboy').FileInfo) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files[name] = {
          data: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        };
      });
    });

    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);

    const bodyStr = event.body || '';
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(bodyStr, 'base64')
      : Buffer.from(bodyStr, 'utf-8');

    bb.write(bodyBuffer);
    bb.end();
  });
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const corsHeaders = getCorsHeaders(event.headers['origin']);

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Verify JWT
  const auth = await verifyBearerToken(event);
  if (!auth) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }
  const { userId } = auth;

  // Parse multipart body
  let parsed: ParsedMultipart;
  try {
    parsed = await parseMultipart(event);
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to parse multipart body' }),
    };
  }

  const { files, fields } = parsed;
  const action = fields['action'] || 'new';

  // Validate required audio files
  if (!files['mainAudio'] || !files['passphraseAudio']) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Both mainAudio and passphraseAudio are required' }),
    };
  }

  const supabaseAdmin = getServiceSupabase();

  // If reclone: supersede the existing active clone BEFORE creating a new one
  if (action === 'reclone') {
    const { error: supersededError } = await supabaseAdmin
      .from('voice_clones')
      .update({ status: 'superseded', superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (supersededError) {
      console.error('[clone-voice] Failed to supersede existing clone:', supersededError);
      // Continue — partial supersede is better than blocking the user
    }
  }

  // Upload passphrase (consent) audio to Supabase Storage
  const timestamp = Date.now();
  const storagePath = `${userId}/consent-${timestamp}.webm`;
  const passphraseBuffer = files['passphraseAudio'].data;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('voice-evidence')
    .upload(storagePath, passphraseBuffer, {
      contentType: 'audio/webm',
      upsert: false,
    });

  if (uploadError) {
    console.error('[clone-voice] Storage upload failed:', uploadError);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to store consent evidence' }),
    };
  }

  // Call Retell clone API
  const voiceName = `fluent-${userId}-${timestamp}`;
  const retellFormData = new FormData();
  retellFormData.append('voice_name', voiceName);
  retellFormData.append('voice_provider', 'platform');

  // Append both audio files — two files improve clone quality
  const mainBlob = new Blob([files['mainAudio'].data], { type: 'audio/webm' });
  const passphraseBlob = new Blob([passphraseBuffer], { type: 'audio/webm' });
  retellFormData.append('files', mainBlob, 'voice-sample.webm');
  retellFormData.append('files', passphraseBlob, 'consent.webm');

  const retellApiKey = process.env.RETELL_API_KEY;
  if (!retellApiKey) {
    console.error('[clone-voice] RETELL_API_KEY not configured');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Voice cloning service not configured' }),
    };
  }

  const retellResponse = await fetch('https://api.retellai.com/clone-voice', {
    method: 'POST',
    headers: { Authorization: `Bearer ${retellApiKey}` },
    // Do NOT set Content-Type — fetch sets it with boundary automatically
    body: retellFormData,
  });

  if (!retellResponse.ok) {
    const errText = await retellResponse.text();
    console.error('[clone-voice] Retell API error:', retellResponse.status, errText);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Voice cloning failed' }),
    };
  }

  const retellData = (await retellResponse.json()) as {
    voice_id: string;
    voice_name: string;
    provider: string;
    preview_audio_url?: string;
  };

  const { voice_id: retellVoiceId, preview_audio_url: previewAudioUrl } = retellData;

  // Insert new active clone row
  const { error: insertError } = await supabaseAdmin
    .from('voice_clones')
    .insert({
      user_id: userId,
      retell_voice_id: retellVoiceId,
      status: 'active',
      sample_url: storagePath,
      preview_audio_url: previewAudioUrl || null,
    });

  if (insertError) {
    console.error('[clone-voice] DB insert failed:', insertError);
    if (insertError.code === '23505') {
      // Unique violation: two active clones (shouldn't happen if supersede ran)
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Active clone conflict — please try again' }),
      };
    }
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to save voice clone record' }),
    };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice_id: retellVoiceId,
      preview_audio_url: previewAudioUrl || null,
    }),
  };
};
