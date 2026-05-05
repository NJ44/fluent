import Retell from 'retell-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function createOrGetRetellAgent(
  cloneId: string,
  retellVoiceId: string,
  userId: string,
  existingAgentId: string | null,
  existingLlmId: string | null,
  supabase: SupabaseClient,
): Promise<RetellAgentResult> {
  if (existingAgentId && existingLlmId) {
    return { agentId: existingAgentId, llmId: existingLlmId };
  }

  // APP_URL is the stable production alias (set in Vercel env vars)
  // Falls back to VERCEL_URL (deployment-specific) then localhost
  const baseUrl = process.env.APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const webhookUrl = `${baseUrl}/api/retell-webhook`;

  const client = new Retell({ apiKey: process.env.RETELL_API_KEY || '' });

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

  const agent = await client.agent.create({
    response_engine: {
      type: 'retell-llm',
      llm_id: llm.llm_id,
    },
    voice_id: retellVoiceId,
    voice_model: 'eleven_flash_v2_5',
    agent_name: `fluent-${userId.slice(0, 8)}`,
    webhook_url: webhookUrl,
    webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
  });

  const { error } = await supabase
    .from('voice_clones')
    .update({
      retell_agent_id: agent.agent_id,
      retell_llm_id: llm.llm_id,
    })
    .eq('id', cloneId);

  if (error) {
    console.error('[setup-retell-agent] Failed to store agent IDs in voice_clones:', error);
  }

  return { agentId: agent.agent_id, llmId: llm.llm_id };
}
