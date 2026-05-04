-- Additive migration: add preview_audio_url column to voice_clones
-- IMPORTANT: Never modify 20260504000002_create_voice_clones.sql — it is immutable once applied.
-- This migration adds the column needed by the clone-voice function to store Retell's preview URL.
ALTER TABLE voice_clones ADD COLUMN IF NOT EXISTS preview_audio_url text;
