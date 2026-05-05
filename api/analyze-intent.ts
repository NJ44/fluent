import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { intent, recipientName, recipientContext, callType, fallbackRules } = req.body as {
    intent?: string;
    recipientName?: string;
    recipientContext?: string;
    callType?: string;
    fallbackRules?: string[];
  };

  if (!intent || intent.trim().length < 10) {
    return res.status(400).json({ error: 'intent must be at least 10 characters' });
  }

  // Fast path: if enough context provided, skip Claude call
  const hasContext = (recipientContext && recipientContext.trim().length > 10) || callType === 'inbound';
  if (intent.trim().length >= 30 && hasContext) {
    return res.status(200).json({ sufficient: true, questions: [] });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userInfo = [
    `Call type: ${callType || 'outbound'}`,
    `Call goal: ${intent.trim()}`,
    recipientName ? `Recipient: ${recipientName}` : null,
    recipientContext ? `Context provided: ${recipientContext.trim()}` : null,
    fallbackRules?.length ? `Fallback rules: ${fallbackRules.join('; ')}` : null,
  ].filter(Boolean).join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are helping prepare an AI phone agent. Determine if enough info exists to make this call successfully, or if 1-2 short clarification questions are needed.

${userInfo}

Reply with JSON only (no markdown):
{"sufficient": true/false, "questions": ["question 1", "question 2"]}

Rules:
- If sufficient=true, questions must be []
- Maximum 2 questions
- Questions should be short (under 15 words each)
- Only ask if truly critical info is missing
- For simple tasks (restaurant booking, appointment scheduling), default to sufficient=true`
    }],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{"sufficient":true,"questions":[]}';
    const parsed = JSON.parse(text.trim()) as { sufficient: boolean; questions: string[] };
    return res.status(200).json(parsed);
  } catch {
    return res.status(200).json({ sufficient: true, questions: [] });
  }
}
