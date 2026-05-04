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

  const supabaseAdmin = getServiceSupabase();

  // Fetch the user's active clone
  const { data: rows, error } = await supabaseAdmin
    .from('voice_clones')
    .select('retell_voice_id, preview_audio_url')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.error('[preview-voice] DB fetch failed:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to fetch clone' }),
    };
  }

  if (!rows || rows.length === 0) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No active clone found' }),
    };
  }

  const clone = rows[0] as { retell_voice_id: string; preview_audio_url: string | null };

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preview_audio_url: clone.preview_audio_url || null,
      retell_voice_id: clone.retell_voice_id,
    }),
  };
};
