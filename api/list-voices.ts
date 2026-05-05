import type { VercelRequest, VercelResponse } from '@vercel/node';
import Retell from 'retell-sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const client = new Retell({ apiKey: process.env.RETELL_API_KEY || '' });

  const voices = await client.voice.list();

  // Filter to first 8, return minimal shape
  const result = voices.slice(0, 8).map(v => ({
    voice_id: v.voice_id,
    voice_name: v.voice_name,
    preview_audio_url: (v as { preview_audio_url?: string }).preview_audio_url ?? null,
  }));

  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(result);
}
