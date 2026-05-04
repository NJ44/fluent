-- calls: full lifecycle tracking for outbound AI calls
-- Status machine: draft → initiating → ringing → active → ended → analyzed | failed
CREATE TABLE IF NOT EXISTS calls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Retell identifiers (populated progressively by webhooks)
  retell_call_id        text,                -- null until call_started webhook; NOT NULL constraint intentionally omitted
  retell_agent_id       text,                -- agent used for this call

  -- Call target
  to_number             text NOT NULL,       -- E.164 recipient phone (CALL-08)

  -- Intent
  intent                text NOT NULL,       -- User's plain-English goal (INTENT-01)
  fallback_rules        text[] DEFAULT '{}', -- 0-3 fallback rules (INTENT-03)

  -- User consent attestation (TCPA — user attests they have permission to call this number)
  consent_attested      boolean NOT NULL DEFAULT false,

  -- Lifecycle state machine (CALL-05)
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','initiating','ringing','active','ended','analyzed','failed')),

  -- Post-call data (populated by retell-webhook)
  transcript            text,               -- Raw transcript from call_ended/call_analyzed (POST-02)
  outcome_summary       text,               -- Claude-generated 1-sentence summary (POST-01)
  disconnection_reason  text,               -- Retell disconnection_reason field (CALL-07)
  duration_ms           bigint,             -- end_timestamp - start_timestamp (CALL-08)

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  ended_at              timestamptz
);

-- RLS: users see only their own calls (HIST-01, HIST-02)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_owner_only" ON calls
  FOR ALL USING (user_id = auth.uid());

-- Index: call history list ordered by most recent (HIST-01)
CREATE INDEX calls_user_created_idx ON calls(user_id, created_at DESC);

-- Index: webhook correlation by retell_call_id
CREATE INDEX calls_retell_call_id_idx ON calls(retell_call_id) WHERE retell_call_id IS NOT NULL;

-- Enable Realtime for Phase 3 live transcript streaming (free to enable early)
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
