CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','admin')),
 full_name VARCHAR(160) NOT NULL,
 phone VARCHAR(40) NOT NULL UNIQUE,
 email VARCHAR(255),
 password_hash TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','under_review','suspended','banned')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 business_name VARCHAR(180) NOT NULL,
 region VARCHAR(80),
 district VARCHAR(100),
 area VARCHAR(120),
 service_address TEXT,
 verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected','under_review')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','under_review')),
 document_type VARCHAR(50),
 document_reference TEXT,
 document_storage_key TEXT,
 selfie_storage_key TEXT,
 verified_at TIMESTAMPTZ,
 reviewed_by UUID REFERENCES users(id),
 rejection_reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_identity_user ON identity_verifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 job_id UUID,
 reason VARCHAR(80) NOT NULL,
 details TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','dismissed')),
 priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 resolved_at TIMESTAMPTZ,
 resolved_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(50),
 entity_id UUID,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS provider_work (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
 file_url TEXT NOT NULL,
 caption VARCHAR(500) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_work_provider ON provider_work(provider_id, created_at DESC);