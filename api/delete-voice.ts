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

  const body = req.body as { clone_id?: string };
  const cloneId = body?.clone_id;

  if (!cloneId) return res.status(400).json({ error: 'clone_id is required' });

  const supabaseAdmin = getServiceSupabase();

  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('voice_clones')
    .select('id, retell_voice_id, sample_url')
    .eq('id', cloneId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (fetchError || !rows || rows.length === 0) {
    return res.status(404).json({ error: 'No active clone found' });
  }

  const clone = rows[0] as { id: string; retell_voice_id: string; sample_url: string | null };

  const retellApiKey = process.env.RETELL_API_KEY;
  if (retellApiKey) {
    try {
      await fetch(`https://api.retellai.com/delete-voice/${clone.retell_voice_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${retellApiKey}` },
      });
    } catch (err) {
      console.error('[delete-voice] Retell delete failed:', err);
    }
  }

  if (clone.sample_url) {
    const { error: storageError } = await supabaseAdmin.storage
      .from('voice-evidence')
      .remove([clone.sample_url]);
    if (storageError) console.error('[delete-voice] Storage remove failed:', storageError);
  }

  const { error: updateError } = await supabaseAdmin
    .from('voice_clones')
    .update({ status: 'deleted' })
    .eq('id', cloneId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('[delete-voice] DB update failed:', updateError);
    return res.status(500).json({ error: 'Failed to update clone status' });
  }

  return res.status(200).json({ success: true });
}
