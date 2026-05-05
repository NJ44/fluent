import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import Retell from 'retell-sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { callId, action } = req.body as { callId?: string; action?: 'barge_in' | 'end_call' };

  if (!callId || !action) {
    return res.status(400).json({ error: 'callId and action required' });
  }

  const supabase = getServiceSupabase();
  const { data: call, error } = await supabase
    .from('calls')
    .select('retell_call_id, twilio_conference_sid, user_id')
    .eq('id', callId)
    .eq('user_id', auth.userId)
    .single();

  if (error || !call) {
    return res.status(404).json({ error: 'Call not found' });
  }

  if (action === 'end_call') {
    // End the Retell call
    if (call.retell_call_id) {
      try {
        const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY! });
        await retellClient.call.retrieve(call.retell_call_id);
        // Retell doesn't have a direct "end call" API — we update status
      } catch { /* ignore */ }
    }
    // Update call status
    await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callId);
    return res.status(200).json({ success: true });
  }

  if (action === 'barge_in') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || !call.twilio_conference_sid) {
      return res.status(503).json({ error: 'Barge-in not available for this call' });
    }

    const client = twilio(accountSid, authToken);

    // Look up the conference by friendlyName (we store the name; SID is resolved at runtime)
    const conferences = await client.conferences.list({ friendlyName: call.twilio_conference_sid, status: 'in-progress', limit: 1 });
    if (!conferences.length) {
      return res.status(503).json({ error: 'Conference not active yet' });
    }
    const conferenceSid = conferences[0].sid;

    // List participants and mute all legs (AI agent + recipient)
    // The user unmutes themselves via the browser SDK after joining
    const participants = await client.conferences(conferenceSid).participants.list();
    for (const p of participants) {
      if (!p.muted) {
        await client.conferences(conferenceSid).participants(p.callSid).update({ muted: true });
      }
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
