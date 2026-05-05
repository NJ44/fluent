import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { callId, transcript } = req.body as { callId?: string; transcript?: string };
  if (!callId || !transcript) return res.status(400).json({ error: 'callId and transcript required' });

  // Verify the call belongs to this user
  const supabase = getServiceSupabase();
  const { data: call } = await supabase
    .from('calls')
    .select('intent, recipient_context')
    .eq('id', callId)
    .eq('user_id', auth.userId)
    .single();

  if (!call) return res.status(404).json({ error: 'Call not found' });

  // Take last 800 chars of transcript for context
  const recentTranscript = transcript.slice(-800);

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ options: ['Yes, proceed', 'Try a different approach', 'End the call'] });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `An AI agent is making a phone call. The agent just said it needs to check something or think. Generate 3 short answer options the user can tap to help the agent.

Call goal: ${call.intent}
Recent transcript:
${recentTranscript}

Reply with JSON only: {"options": ["option 1", "option 2", "option 3"]}
Rules:
- Options must be short (under 8 words each)
- Options should be plausible answers to what was just asked
- If no clear question, generate 3 general helpful responses like "Yes, proceed", "Try a different approach", "End the call"`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text.trim()) as { options: string[] };
    return res.status(200).json({ options: parsed.options.slice(0, 3) });
  } catch (err) {
    console.error('[generate-choices] Anthropic error:', err);
    return res.status(200).json({ options: ['Yes, proceed', 'Try a different approach', 'End the call'] });
  }
}
