/**
 * initiate-call.ts
 *
 * POST /.netlify/functions/initiate-call
 *
 * Body: { toNumber: string, intent: string, fallbackRules: string[], consentAttested: boolean }
 *
 * Flow:
 * 1. Authenticate user (verifyBearerToken)
 * 2. Validate request body (E.164, intent length, consent)
 * 3. Verify user has an active voice clone
 * 4. Create calls DB record (status: initiating)
 * 5. Lazy-create Retell LLM + agent if not yet provisioned (createOrGetRetellAgent)
 * 6. Call createPhoneCall with dynamic variables
 * 7. Update calls record to status: ringing with retell_call_id
 * 8. Return { callId, retellCallId }
 */

import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { verifyBearerToken } from './_shared/auth-utils';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';
import { createOrGetRetellAgent } from './setup-retell-agent';

// E.164 format: + followed by country code + number, 8-15 digits total
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const handler: Handler = async (event) => {
  const corsHeaders = getCorsHeaders(event.headers?.origin);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // 1. Authenticate
  const auth = await verifyBearerToken(event);
  if (!auth) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const { userId } = auth;

  // 2. Parse and validate body
  let body: { toNumber?: string; intent?: string; fallbackRules?: string[]; consentAttested?: boolean };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { toNumber, intent, fallbackRules = [], consentAttested } = body;

  if (!toNumber || !intent || consentAttested === undefined) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields: toNumber, intent, consentAttested' }),
    };
  }

  if (!E164_REGEX.test(toNumber)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid phone number. Please use international format: +1 (country code) + number.' }),
    };
  }

  if (intent.trim().length < 10) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Call goal must be at least 10 characters.' }),
    };
  }

  if (!consentAttested) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'You must confirm you have permission to contact this number.' }),
    };
  }

  // Sanitize fallbackRules: max 3, each must be a non-empty string
  const sanitizedRules = (fallbackRules as string[])
    .filter(r => typeof r === 'string' && r.trim().length > 0)
    .slice(0, 3);

  const supabase = getServiceSupabase();

  // 3. Verify active voice clone — server-side check (client check is UX only, not security)
  const { data: clone, error: cloneError } = await supabase
    .from('voice_clones')
    .select('id, retell_voice_id, name, retell_agent_id, retell_llm_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (cloneError || !clone) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No active voice clone found. Please complete voice onboarding first.' }),
    };
  }

  // 4. Create calls DB record (status: initiating) BEFORE calling Retell
  // This ensures we can track the call even if Retell API fails
  const { data: callRecord, error: insertError } = await supabase
    .from('calls')
    .insert({
      user_id: userId,
      to_number: toNumber,
      intent: intent.trim(),
      fallback_rules: sanitizedRules,
      consent_attested: true,
      status: 'initiating',
    })
    .select('id')
    .single();

  if (insertError || !callRecord) {
    console.error('[initiate-call] Failed to create call record:', insertError);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to create call record. Please try again.' }),
    };
  }

  const fluentCallId = callRecord.id;

  try {
    // 5. Lazy-create or retrieve Retell agent
    const { agentId } = await createOrGetRetellAgent(
      clone.id,
      clone.retell_voice_id,
      userId,
      clone.retell_agent_id,
      clone.retell_llm_id,
      supabase,
    );

    // 6. Place the outbound call
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
        // Join rules with "; " separator for LLM readability
        fallback_rules: sanitizedRules.length > 0
          ? sanitizedRules.join('; ')
          : 'If the primary goal cannot be achieved, politely end the call.',
      },
      metadata: {
        fluent_call_id: fluentCallId, // Critical: used by retell-webhook.ts to correlate events
        user_id: userId,
      },
    });

    // 7. Update record to ringing with retell identifiers
    await supabase
      .from('calls')
      .update({
        status: 'ringing',
        retell_call_id: phoneCall.call_id,
        retell_agent_id: agentId,
      })
      .eq('id', fluentCallId);

    // 8. Return success
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        callId: fluentCallId,
        retellCallId: phoneCall.call_id,
        status: 'ringing',
      }),
    };
  } catch (err) {
    // On any error after DB record is created, mark call as failed
    console.error('[initiate-call] Error placing call:', err);
    await supabase
      .from('calls')
      .update({ status: 'failed' })
      .eq('id', fluentCallId);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to place call. Please try again.',
        callId: fluentCallId, // Return ID so UI can poll for status
      }),
    };
  }
};
