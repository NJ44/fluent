ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS call_type text NOT NULL DEFAULT 'outbound'
    CHECK (call_type IN ('outbound', 'inbound')),
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_context text;
