/**
 * retell-webhook.ts
 *
 * POST /.netlify/functions/retell-webhook
 *
 * Receives Retell call lifecycle events and drives the calls state machine.
 *
 * CRITICAL IMPLEMENTATION NOTES:
 * 1. Signature must be verified against RAW body bytes (before JSON.parse)
 * 2. Return 200 IMMEDIATELY — do not await Claude in the request handler
 * 3. Use metadata.fluent_call_id to correlate to Supabase record (not retell_call_id)
 * 4. call_ended with failure reason → status='failed' (not 'ended')
 *
 * Source: 02-RESEARCH.md Patterns 5, 6, 7
 */

import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { verifyRetellSignature } from './_shared/verify-signatures';
import { getServiceSupabase } from './_shared/token-utils';
import { isFailureDisconnection } from '../../src/types/calls';

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

export const handler: Handler = async (event) => {
  // 1. Get raw body for signature verification — MUST happen before JSON.parse
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : (event.body || '');

  const signatureHeader = event.headers?.['x-retell-signature'] || '';

  // 2. Verify signature FIRST — reject before any processing
  if (!verifyRetellSignature(rawBody, signatureHeader)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // 3. Parse payload
  let payload: RetellWebhookBody;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { event: eventType, call } = payload;
  const fluentCallId = call.metadata?.fluent_call_id;

  if (!fluentCallId) {
    // This can happen if createPhoneCall didn't set metadata — log and return 200
    // (don't return 4xx — Retell would retry indefinitely)
    console.warn('[retell-webhook] Missing fluent_call_id in metadata — cannot correlate', {
      retellCallId: call.call_id,
      event: eventType,
    });
    return { statusCode: 200, body: JSON.stringify({ ack: true, warning: 'no_fluent_call_id' }) };
  }

  const supabase = getServiceSupabase();

  // 4. Handle each event type
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

    // Determine status: failure vs. normal end
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
    // Update to analyzed status with final transcript — do this synchronously
    await supabase
      .from('calls')
      .update({
        status: 'analyzed',
        transcript: call.transcript || null, // final version from Retell
      })
      .eq('id', fluentCallId);

    // Fire-and-forget: Claude summarization MUST NOT block the 200 response.
    // Netlify's event loop stays open briefly after the handler returns 200,
    // giving the async work time to complete.
    void generateOutcomeSummary(fluentCallId, call.transcript || '', supabase);
  }

  // 5. Return 200 immediately — Retell expects fast ack
  return {
    statusCode: 200,
    body: JSON.stringify({ ack: true }),
  };
};

/**
 * Generates a 1-sentence outcome summary using Claude claude-haiku-4-5.
 * Called async (fire-and-forget) after returning 200 from call_analyzed handler.
 *
 * Source: 02-RESEARCH.md Pattern 7
 * Model: claude-haiku-4-5 ($1/MTok input — cheapest, fastest; sufficient for 1-sentence summaries)
 */
async function generateOutcomeSummary(
  callId: string,
  transcript: string,
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<void> {
  // Skip if transcript is empty — no useful summary possible
  if (!transcript || transcript.trim().length < 10) {
    await supabase
      .from('calls')
      .update({ outcome_summary: 'Call ended without a transcript.' })
      .eq('id', callId);
    return;
  }

  try {
    // Instantiate with whatever key is available — SDK constructor will throw
    // at message-creation time if the key is invalid. In tests the entire SDK
    // is mocked so the constructor is never called for real.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
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
    // Log but do not throw — a failed summary should not affect the call record
    console.error('[retell-webhook] Claude summarization failed for call', callId, err);
    try {
      await supabase
        .from('calls')
        .update({ outcome_summary: 'Summary generation failed.' })
        .eq('id', callId);
    } catch {
      // Ignore secondary failure — best-effort update
    }
  }
}
