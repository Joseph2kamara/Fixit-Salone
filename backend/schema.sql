CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS provider_work (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
 file_url TEXT NOT NULL,
 caption VARCHAR(500) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_work_provider ON provider_work(provider_id, created_at DESC);