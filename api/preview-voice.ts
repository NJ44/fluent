import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);

  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { userId } = auth;

  const supabaseAdmin = getServiceSupabase();

  const { data: rows, error } = await supabaseAdmin
    .from('voice_clones')
    .select('retell_voice_id, preview_audio_url')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.error('[preview-voice] DB fetch failed:', error);
    return res.status(500).json({ error: 'Failed to fetch clone' });
  }

  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: 'No active clone found' });
  }

  const clone = rows[0] as { retell_voice_id: string; preview_audio_url: string | null };

  return res.status(200).json({
    preview_audio_url: clone.preview_audio_url || null,
    retell_voice_id: clone.retell_voice_id,
  });
}
