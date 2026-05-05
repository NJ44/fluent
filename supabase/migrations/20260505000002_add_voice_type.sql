ALTER TABLE voice_clones
  ADD COLUMN IF NOT EXISTS voice_type text NOT NULL DEFAULT 'cloned'
    CHECK (voice_type IN ('cloned', 'ai'));
