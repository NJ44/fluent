import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { callId, answer } = req.body as { callId?: string; answer?: string };
  if (!callId || !answer) return res.status(400).json({ error: 'callId and answer required' });

  const supabase = getServiceSupabase();

  // Append the user's answer to recipient_context so AI has it available
  const { data: call } = await supabase
    .from('calls')
    .select('recipient_context')
    .eq('id', callId)
    .eq('user_id', auth.userId)
    .single();

  if (!call) return res.status(404).json({ error: 'Call not found' });

  const updatedContext = [call.recipient_context, `[User input: ${answer}]`]
    .filter(Boolean)
    .join('\n');

  await supabase
    .from('calls')
    .update({ recipient_context: updatedContext })
    .eq('id', callId)
    .eq('user_id', auth.userId);

  return res.status(200).json({ success: true });
}
