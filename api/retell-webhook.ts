import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { verifyRetellSignature } from './_shared/verify-signatures';
import { getServiceSupabase } from './_shared/token-utils';
import { isFailureDisconnection } from '../src/types/calls';

// Disable body parser — HMAC verification requires the raw body bytes
export const config = { api: { bodyParser: false } };

interface RetellCallPayload {
  call_id: string;
  call_status?: string;
  transcript?: string;
  disconnection_reason?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  metadata?: {
    fluent_call_id?: string;
    user_id?: string;
  };
}

interface RetellWebhookBody {
  event: 'call_started' | 'call_ended' | 'call_analyzed';
  call: RetellCallPayload;
}

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString('utf-8'); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawBody = await readRawBody(req);
  const signatureHeader = (req.headers['x-retell-signature'] || '') as string;

  if (!verifyRetellSignature(rawBody, signatureHeader)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: RetellWebhookBody;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { event: eventType, call } = payload;
  const fluentCallId = call.metadata?.fluent_call_id;

  if (!fluentCallId) {
    console.warn('[retell-webhook] Missing fluent_call_id in metadata — cannot correlate', {
      retellCallId: call.call_id,
      event: eventType,
    });
    return res.status(200).json({ ack: true, warning: 'no_fluent_call_id' });
  }

  const supabase = getServiceSupabase();

  if (eventType === 'call_started') {
    await supabase
      .from('calls')
      .update({
        status: 'active',
        retell_call_id: call.call_id,
        started_at: new Date().toISOString(),
      })
      .eq('id', fluentCallId);
  }

  else if (eventType === 'call_ended') {
    const duration =
      call.end_timestamp && call.start_timestamp
        ? call.end_timestamp - call.start_timestamp
        : null;

    const newStatus = isFailureDisconnection(call.disconnection_reason) ? 'failed' : 'ended';

    await supabase
      .from('calls')
      .update({
        status: newStatus,
        transcript: call.transcript || null,
        disconnection_reason: call.disconnection_reason || null,
        duration_ms: duration,
        ended_at: new Date().toISOString(),
      })
      .eq('id', fluentCallId);
  }

  else if (eventType === 'call_analyzed') {
    await supabase
      .from('calls')
      .update({
        status: 'analyzed',
        transcript: call.transcript || null,
      })
      .eq('id', fluentCallId);

    // Fire-and-forget: return 200 immediately, summarize async
    void generateOutcomeSummary(fluentCallId, call.transcript || '', supabase);
  }

  return res.status(200).json({ ack: true });
}

async function generateOutcomeSummary(
  callId: string,
  transcript: string,
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<void> {
  if (!transcript || transcript.trim().length < 10) {
    await supabase
      .from('calls')
      .update({ outcome_summary: 'Call ended without a transcript.' })
      .eq('id', callId);
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system:
        'You summarize phone call transcripts in exactly one concise sentence describing the outcome. ' +
        'Examples: "Appointment confirmed for Tuesday at 4:00 PM." ' +
        'or "Restaurant was fully booked; tried alternative times without success." ' +
        'or "No answer — call disconnected after 3 seconds." ' +
        'Be factual and specific. Include times, dates, or names if they appear in the transcript.',
      messages: [
        {
          role: 'user',
          content: `Summarize this phone call in one sentence:\n\n${transcript}`,
        },
      ],
    });

    const summary =
      msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : 'Summary unavailable.';

    await supabase
      .from('calls')
      .update({ outcome_summary: summary })
      .eq('id', callId);
  } catch (err) {
    console.error('[retell-webhook] Claude summarization failed for call', callId, err);
    try {
      await supabase
        .from('calls')
        .update({ outcome_summary: 'Summary generation failed.' })
        .eq('id', callId);
    } catch {
      // ignore
    }
  }
}
