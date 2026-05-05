import type { VercelRequest, VercelResponse } from '@vercel/node';

// Twilio calls this URL when the browser Voice SDK connects.
// We return TwiML that joins the caller into the correct conference room.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const callId = (req.body?.callId || req.query?.callId || '') as string;
  const conferenceName = callId ? `fluent-${callId}` : 'fluent-default';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      startConferenceOnEnter="true"
      endConferenceOnExit="false"
      muted="true"
      beep="false"
      waitUrl=""
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}
