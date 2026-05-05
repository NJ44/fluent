-- Add Retell LLM + Agent IDs to voice_clones
-- These are created lazily on the user's first call (setup-retell-agent Netlify function)
-- and reused for all subsequent calls by that user.
ALTER TABLE voice_clones
  ADD COLUMN IF NOT EXISTS retell_agent_id text,
  ADD COLUMN IF NOT EXISTS retell_llm_id   text;

-- Comment for clarity
COMMENT ON COLUMN voice_clones.retell_agent_id IS 'Retell Agent ID — created lazily on first call; reused for all calls from this user';
COMMENT ON COLUMN voice_clones.retell_llm_id IS 'Retell LLM ID — bound to the agent; holds begin_message (TCPA) + general_prompt with dynamic variable slots';
