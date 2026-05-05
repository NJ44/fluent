/**
 * setup-retell-agent.ts
 *
 * Creates a Retell LLM + Voice Agent for a user the first time they initiate a call.
 * On subsequent calls, returns the cached agent_id from voice_clones table.
 *
 * Architecture: One agent per user (not per call). The agent's LLM has:
 * - begin_message: HARDCODED TCPA preamble — fires before any task content (CALL-02, CALL-03)
 * - general_prompt: task context via {{intent}}, {{fallback_rules}}, {{user_name}} dynamic variables
 *
 * Source: 02-RESEARCH.md Patterns 2, 3
 */

import Retell from 'retell-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

// TCPA preamble — hardcoded in begin_message so it CANNOT be skipped or overridden.
// Legal basis: FCC Feb 2024 Declaratory Ruling (AI voices = "artificial or prerecorded voice" under TCPA)
// Texas SB140: disclosure required within first 30 seconds.
// The 0.5s pause prefix lets the telephony codec stabilize before audio starts (Pitfall 7).
const TCPA_BEGIN_MESSAGE =
  'Hi, this is an AI assistant placing this call on behalf of {{user_name}}. ' +
  'This call is using artificial intelligence voice technology. ' +
  'This call may be recorded. ' +
  'You can say "stop" at any time to end this call.';

const GENERAL_PROMPT = `You are an AI assistant calling on behalf of {{user_name}}.

TASK: {{intent}}

FALLBACK RULES: {{fallback_rules}}

GUIDELINES:
- Be polite, clear, and concise
- Follow the fallback rules if the primary goal cannot be achieved
- When the task is complete or clearly not achievable, say goodbye and hang up
- Never claim to be a human if asked directly
- Never share personal information about the user beyond what is needed for the task
- If the recipient asks to be removed from calls, confirm and hang up immediately`;

export interface RetellAgentResult {
  agentId: string;
  llmId: string;
}

/**
 * Returns the existing Retell agent for this user's voice clone,
 * or creates a new LLM + agent pair if none exists yet.
 *
 * @param cloneId - The voice_clones.id for this user's active clone
 * @param retellVoiceId - The retell_voice_id from voice_clones table
 * @param userId - The user's ID (used for agent_name)
 * @param existingAgentId - voice_clones.retell_agent_id (null if first call)
 * @param existingLlmId - voice_clones.retell_llm_id (null if first call)
 * @param supabase - Service role Supabase client
 */
export async function createOrGetRetellAgent(
  cloneId: string,
  retellVoiceId: string,
  userId: string,
  existingAgentId: string | null,
  existingLlmId: string | null,
  supabase: SupabaseClient,
): Promise<RetellAgentResult> {
  // Fast path: agent already exists — reuse it
  if (existingAgentId && existingLlmId) {
    return { agentId: existingAgentId, llmId: existingLlmId };
  }

  const webhookUrl = process.env.URL
    ? `${process.env.URL}/.netlify/functions/retell-webhook`
    : 'https://placeholder.netlify.app/.netlify/functions/retell-webhook';

  const client = new Retell({ apiKey: process.env.RETELL_API_KEY || '' });

  // Step 1: Create the Retell LLM
  // begin_message is HARDCODED — not overrideable at call time (TCPA safety)
  const llm = await client.llm.create({
    begin_message: TCPA_BEGIN_MESSAGE,
    general_prompt: GENERAL_PROMPT,
    model: 'gpt-4.1',
    default_dynamic_variables: {
      user_name: 'the user',
      intent: 'assist the recipient',
      fallback_rules: 'If unavailable, thank them and hang up',
    },
  });

  // Step 2: Create the Voice Agent bound to this user's LLM and voice
  const agent = await client.agent.create({
    response_engine: {
      type: 'retell-llm',
      llm_id: llm.llm_id,
    },
    voice_id: retellVoiceId,
    voice_model: 'eleven_flash_v2_5', // ElevenLabs Flash v2.5 — required for <1.5s latency (CALL-06)
    agent_name: `fluent-${userId.slice(0, 8)}`,
    webhook_url: webhookUrl,
    webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
  });

  // Step 3: Store both IDs in voice_clones for reuse
  const { error } = await supabase
    .from('voice_clones')
    .update({
      retell_agent_id: agent.agent_id,
      retell_llm_id: llm.llm_id,
    })
    .eq('id', cloneId);

  if (error) {
    console.error('[setup-retell-agent] Failed to store agent IDs in voice_clones:', error);
    // Don't throw — the call can still proceed even if we fail to persist
    // (agent will be re-created on next call, slightly slower)
  }

  return { agentId: agent.agent_id, llmId: llm.llm_id };
}
