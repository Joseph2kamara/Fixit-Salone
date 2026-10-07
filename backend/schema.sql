CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','admin')),
 full_name VARCHAR(160) NOT NULL,
 phone VARCHAR(40) NOT NULL UNIQUE,
 email VARCHAR(255),
 password_hash TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','under_review','suspended','banned')),
 failed_login_count INTEGER NOT NULL DEFAULT 0,
 locked_until TIMESTAMPTZ,
 last_login_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status,role);

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
CREATE INDEX IF NOT EXISTS idx_identity_user ON identity_verifications(user_id,created_at DESC);
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_original_name VARCHAR(255);
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_mime_type VARCHAR(120);
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_ciphertext BYTEA;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_iv BYTEA;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_auth_tag BYTEA;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_original_name VARCHAR(255);
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_mime_type VARCHAR(120);
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_ciphertext BYTEA;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_iv BYTEA;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_auth_tag BYTEA;


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
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status,created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS provider_work (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
 file_url TEXT NOT NULL,
 caption VARCHAR(500) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_work_provider ON provider_work(provider_id,created_at DESC);

CREATE TABLE IF NOT EXISTS phone_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 phone VARCHAR(40) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','expired','failed')),
 provider_reference TEXT,
 verified_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id,created_at DESC);
ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS services (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name VARCHAR(100) NOT NULL UNIQUE,
 description VARCHAR(255),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_services (
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
 pricing_type VARCHAR(30) NOT NULL DEFAULT 'quote_required' CHECK (pricing_type IN ('fixed_price','starting_price','quote_required')),
 price_sle NUMERIC(14,2),
 description VARCHAR(500),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(provider_id,service_id)
);
CREATE INDEX IF NOT EXISTS idx_provider_services_service ON provider_services(service_id);

CREATE TABLE IF NOT EXISTS service_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 provider_id UUID REFERENCES provider_profiles(id) ON DELETE SET NULL,
 service_id UUID REFERENCES services(id) ON DELETE SET NULL,
 region VARCHAR(80) NOT NULL,
 district VARCHAR(100) NOT NULL,
 area VARCHAR(120) NOT NULL,
 service_address TEXT NOT NULL,
 directions TEXT,
 pricing_type VARCHAR(30) NOT NULL CHECK (pricing_type IN ('fixed_price','starting_price','quote_required')),
 job_details TEXT NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','quoted','approved','in_progress','completed','cancelled','declined')),
 quoted_amount NUMERIC(14,2),
 platform_fee NUMERIC(14,2),
 provider_earnings NUMERIC(14,2),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_requests_customer ON service_requests(customer_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_provider ON service_requests(provider_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status,created_at DESC);

CREATE TABLE IF NOT EXISTS service_request_photos (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
 uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 file_url TEXT NOT NULL,
 original_name VARCHAR(255),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_request_photos_request ON service_request_photos(service_request_id,created_at ASC);

INSERT INTO services(name,description) VALUES
('Plumbing','Leaks, pipes, fittings and water systems'),
('Electrical','Wiring, installations, repairs and troubleshooting'),
('Cleaning','Home, office and move-in cleaning'),
('Phone Repair','Phone screens, batteries, charging ports and software'),
('IT & Computer','Computer repair, networking and technical support'),
('Auto Repair','Diagnostics, servicing and vehicle repairs'),
('Beauty','Barbers, stylists and beauty services'),
('Construction','Building, painting, masonry and general construction')
ON CONFLICT (name) DO NOTHING;


CREATE TABLE IF NOT EXISTS payment_transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 service_request_id UUID NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE RESTRICT,
 customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 provider_id UUID REFERENCES provider_profiles(id) ON DELETE SET NULL,
 amount_sle NUMERIC(14,2) NOT NULL CHECK (amount_sle > 0),
 platform_fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
 provider_earnings NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (provider_earnings >= 0),
 currency VARCHAR(10) NOT NULL DEFAULT 'SLE',
 gateway VARCHAR(40) NOT NULL DEFAULT 'not_configured',
 status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled','refunded')),
 provider_reference VARCHAR(180),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_customer ON payment_transactions(customer_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status,created_at DESC);


CREATE TABLE IF NOT EXISTS provider_reviews (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 service_request_id UUID NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
 customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
 review_text VARCHAR(1000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider ON provider_reviews(provider_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_customer ON provider_reviews(customer_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 phone VARCHAR(40) NOT NULL,
 otp_hash TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id,created_at DESC);


CREATE TABLE IF NOT EXISTS provider_subscriptions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 plan_name VARCHAR(50) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
 starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_subscriptions_active ON provider_subscriptions(provider_id,status,expires_at DESC);

CREATE TABLE IF NOT EXISTS provider_subscription_payments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
 plan_name VARCHAR(50) NOT NULL,
 amount_sle NUMERIC(14,2) NOT NULL CHECK (amount_sle > 0),
 gateway VARCHAR(40) NOT NULL DEFAULT 'manual',
 status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
 provider_reference VARCHAR(180),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_subscription_payments_provider ON provider_subscription_payments(provider_id,created_at DESC);
