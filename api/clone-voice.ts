import type { VercelRequest, VercelResponse } from '@vercel/node';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const busboy = require('busboy') as (opts: import('busboy').BusboyConfig) => import('busboy').Busboy;
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';

// Disable body parser — multipart needs raw stream piped to busboy
export const config = { api: { bodyParser: false } };

interface ParsedMultipart {
  fields: Record<string, string>;
  files: Record<string, { data: Buffer; filename: string; mimeType: string }>;
}

function parseMultipart(req: VercelRequest): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Record<string, { data: Buffer; filename: string; mimeType: string }> = {};

    const bb = busboy({ headers: req.headers as Record<string, string | string[]> });

    bb.on('field', (name: string, value: string) => { fields[name] = value; });

    bb.on('file', (name: string, stream: NodeJS.ReadableStream, info: import('busboy').FileInfo) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files[name] = { data: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType };
      });
    });

    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);

    req.pipe(bb);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { userId } = auth;

  let parsed: ParsedMultipart;
  try {
    parsed = await parseMultipart(req);
  } catch {
    return res.status(400).json({ error: 'Failed to parse multipart body' });
  }

  const { files, fields } = parsed;
  const action = fields['action'] || 'new';

  if (!files['mainAudio'] || !files['passphraseAudio']) {
    return res.status(400).json({ error: 'Both mainAudio and passphraseAudio are required' });
  }

  const supabaseAdmin = getServiceSupabase();

  if (action === 'reclone') {
    const { error: supersededError } = await supabaseAdmin
      .from('voice_clones')
      .update({ status: 'superseded', superseded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');
    if (supersededError) console.error('[clone-voice] Failed to supersede existing clone:', supersededError);
  }

  const timestamp = Date.now();
  const storagePath = `${userId}/consent-${timestamp}.webm`;
  const passphraseBuffer = files['passphraseAudio'].data;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('voice-evidence')
    .upload(storagePath, passphraseBuffer, { contentType: 'audio/webm', upsert: false });

  if (uploadError) {
    console.error('[clone-voice] Storage upload failed:', uploadError);
    return res.status(500).json({ error: 'Failed to store consent evidence' });
  }

  const voiceName = `fluent-${userId}-${timestamp}`;
  const retellFormData = new FormData();
  retellFormData.append('voice_name', voiceName);
  retellFormData.append('voice_provider', 'platform');

  const mainBlob = new Blob([files['mainAudio'].data], { type: 'audio/webm' });
  const passphraseBlob = new Blob([passphraseBuffer], { type: 'audio/webm' });
  retellFormData.append('files', mainBlob, 'voice-sample.webm');
  retellFormData.append('files', passphraseBlob, 'consent.webm');

  const retellApiKey = process.env.RETELL_API_KEY;
  if (!retellApiKey) {
    return res.status(500).json({ error: 'Voice cloning service not configured' });
  }

  const retellResponse = await fetch('https://api.retellai.com/clone-voice', {
    method: 'POST',
    headers: { Authorization: `Bearer ${retellApiKey}` },
    body: retellFormData,
  });

  if (!retellResponse.ok) {
    const errText = await retellResponse.text();
    console.error('[clone-voice] Retell API error:', retellResponse.status, errText);
    return res.status(502).json({ error: 'Voice cloning failed' });
  }

  const retellData = (await retellResponse.json()) as {
    voice_id: string;
    voice_name: string;
    provider: string;
    preview_audio_url?: string;
  };

  const { voice_id: retellVoiceId, preview_audio_url: previewAudioUrl } = retellData;

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
      return res.status(409).json({ error: 'Active clone conflict — please try again' });
    }
    return res.status(500).json({ error: 'Failed to save voice clone record' });
  }

  return res.status(200).json({ voice_id: retellVoiceId, preview_audio_url: previewAudioUrl || null });
}
