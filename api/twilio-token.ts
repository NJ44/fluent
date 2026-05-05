import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import { verifyBearerToken } from './_shared/auth-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !authToken || !twimlAppSid) {
    return res.status(503).json({ error: 'Barge-in not configured' });
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  const token = new AccessToken(accountSid, process.env.TWILIO_API_KEY!, process.env.TWILIO_API_SECRET!, {
    identity: auth.userId,
    ttl: 3600,
  });
  token.addGrant(voiceGrant);

  return res.status(200).json({ token: token.toJwt() });
}
