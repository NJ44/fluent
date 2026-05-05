import type { VercelRequest, VercelResponse } from '@vercel/node';
import Retell from 'retell-sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { applyCors } from './_shared/cors';
import { createOrGetRetellAgent } from './setup-retell-agent';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin as string);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { userId } = auth;

  const body = req.body as {
    toNumber?: string;
    intent?: string;
    fallbackRules?: string[];
    consentAttested?: boolean;
    callType?: string;
    recipientName?: string;
    recipientContext?: string;
  };

  const { toNumber, intent, fallbackRules = [], consentAttested, callType = 'outbound', recipientName, recipientContext } = body || {};

  if (!toNumber || !intent || consentAttested === undefined) {
    return res.status(400).json({ error: 'Missing required fields: toNumber, intent, consentAttested' });
  }
  if (!E164_REGEX.test(toNumber)) {
    return res.status(400).json({ error: 'Invalid phone number. Please use international format: +1 (country code) + number.' });
  }
  if (intent.trim().length < 10) {
    return res.status(400).json({ error: 'Call goal must be at least 10 characters.' });
  }
  if (!consentAttested) {
    return res.status(400).json({ error: 'You must confirm you have permission to contact this number.' });
  }

  const sanitizedRules = (fallbackRules as string[])
    .filter(r => typeof r === 'string' && r.trim().length > 0)
    .slice(0, 3);

  const supabase = getServiceSupabase();

  const { data: clone, error: cloneError } = await supabase
    .from('voice_clones')
    .select('id, retell_voice_id, name, retell_agent_id, retell_llm_id, voice_type')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (cloneError || !clone) {
    return res.status(403).json({ error: 'No active voice clone found. Please complete voice onboarding first.' });
  }

  const { data: callRecord, error: insertError } = await supabase
    .from('calls')
    .insert({
      user_id: userId,
      to_number: toNumber,
      intent: intent.trim(),
      fallback_rules: sanitizedRules,
      consent_attested: true,
      status: 'initiating',
      call_type: callType,
      recipient_name: recipientName || null,
      recipient_context: recipientContext || null,
    })
    .select('id')
    .single();

  if (insertError || !callRecord) {
    console.error('[initiate-call] Failed to create call record:', insertError);
    return res.status(500).json({ error: 'Failed to create call record. Please try again.' });
  }

  const fluentCallId = callRecord.id;

  try {
    const { agentId } = await createOrGetRetellAgent(
      clone.id,
      clone.retell_voice_id,
      userId,
      clone.retell_agent_id,
      clone.retell_llm_id,
      supabase,
      clone.voice_type ?? 'cloned',
    );

    const fromNumber = process.env.RETELL_FROM_NUMBER;
    if (!fromNumber) throw new Error('RETELL_FROM_NUMBER env var not set');

    const client = new Retell({ apiKey: process.env.RETELL_API_KEY! });

    const phoneCall = await client.call.createPhoneCall({
      from_number: fromNumber,
      to_number: toNumber,
      override_agent_id: agentId,
      retell_llm_dynamic_variables: {
        user_name: clone.name || 'the user',
        intent: intent.trim(),
        fallback_rules: sanitizedRules.length > 0
          ? sanitizedRules.join('; ')
          : 'If the primary goal cannot be achieved, politely end the call.',
        ...(recipientName ? { recipient_name: recipientName } : {}),
        ...(recipientContext ? { recipient_context: recipientContext } : {}),
      },
      metadata: {
        fluent_call_id: fluentCallId,
        user_id: userId,
      },
    });

    // Store Twilio Conference friendly name for barge-in (graceful — skipped if not configured)
    // The conference is created implicitly when a call leg joins via TwiML <Conference>
    let twilioConferenceName: string | null = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      twilioConferenceName = `fluent-${fluentCallId}`;
    }

    await supabase
      .from('calls')
      .update({ status: 'ringing', retell_call_id: phoneCall.call_id, retell_agent_id: agentId, twilio_conference_sid: twilioConferenceName })
      .eq('id', fluentCallId);

    return res.status(200).json({ callId: fluentCallId, retellCallId: phoneCall.call_id, status: 'ringing' });
  } catch (err) {
    console.error('[initiate-call] Error placing call:', err);
    await supabase.from('calls').update({ status: 'failed' }).eq('id', fluentCallId);
    return res.status(500).json({ error: 'Failed to place call. Please try again.', callId: fluentCallId });
  }
}
