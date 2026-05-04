import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';

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

  // Parse request body
  let cloneId: string | undefined;
  try {
    const body = JSON.parse(event.body || '{}') as { clone_id?: string };
    cloneId = body.clone_id;
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  if (!cloneId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'clone_id is required' }),
    };
  }

  const supabaseAdmin = getServiceSupabase();

  // Fetch the active clone row (ownership check via user_id)
  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('voice_clones')
    .select('id, retell_voice_id, sample_url')
    .eq('id', cloneId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (fetchError || !rows || rows.length === 0) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No active clone found' }),
    };
  }

  const clone = rows[0] as { id: string; retell_voice_id: string; sample_url: string | null };

  // --- Step 1: Delete from Retell ---
  const retellApiKey = process.env.RETELL_API_KEY;
  if (retellApiKey) {
    try {
      await fetch(`https://api.retellai.com/delete-voice/${clone.retell_voice_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${retellApiKey}` },
      });
    } catch (err) {
      // Log but continue — GDPR delete proceeds even if Retell call fails
      console.error('[delete-voice] Retell delete failed:', err);
    }
  }

  // --- Step 2: Remove consent evidence from Supabase Storage ---
  if (clone.sample_url) {
    const { error: storageError } = await supabaseAdmin.storage
      .from('voice-evidence')
      .remove([clone.sample_url]);
    if (storageError) {
      // Log but continue — audit trail DB update is the critical step
      console.error('[delete-voice] Storage remove failed:', storageError);
    }
  }

  // --- Step 3: Soft-delete in DB (keep row for audit trail) ---
  const { error: updateError } = await supabaseAdmin
    .from('voice_clones')
    .update({ status: 'deleted' })
    .eq('id', cloneId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('[delete-voice] DB update failed:', updateError);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to update clone status' }),
    };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};
