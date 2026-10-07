# FixIt Salone 🇸🇱

FixIt Salone is a Sierra Leone-focused marketplace for finding local service providers.

## Current build

The repository contains the public beta marketplace frontend plus a backend foundation for the next deployment stage.

### Frontend
- Customer service search by category, region and district
- Provider profiles
- Service requests
- Provider quote calculation
- 1% FixIt platform fee display
- Provider work portfolio UI

### Trust & Safety
- Private identity verification records and verification status
- Incident/report records with severity and investigation status
- Admin audit-log structure
- Public profiles show trust status, not ID documents or ID numbers
- Protected admin API using JWT authentication and admin role checks
- Rate limiting on authentication and admin API routes
- Admin account status controls and audit entries for admin mutations

### Backend
- Node.js / Express API
- PostgreSQL connection
- bcrypt password hashing
- JWT authentication
- Provider portfolio records
- Image/video upload validation
- Health endpoint

### Create the first admin

Run this on a trusted machine or server with `DATABASE_URL` configured:

```bash
cd backend
npm install
node scripts/create-admin.js "+232XXXXXXXXX" "use-a-long-random-password" "FixIt Admin"
```

Never put the admin password, database URL or JWT secret into GitHub.

### Admin dashboard

The admin page is protected at:

`/admin.html`

It requires a successful backend login and an account with `role = admin`. The page stores the short-lived JWT only in the browser session for this beta. For a hardened production deployment, move authentication to secure HttpOnly cookies plus CSRF protection.

### Important deployment note

The backend is not yet connected to a live production database, production OTP provider, KYC verification provider, or private cloud media storage. Do not collect real identity documents in the public beta until authenticated encrypted storage, access controls, backups and retention/deletion controls are deployed.

The current phone verification endpoint is only a database foundation and does **not** send real SMS OTPs.

### Render static site
- Service type: Static Site
- Branch: `main`
- Build command: leave blank
- Publish directory: `.`

Never commit passwords, database URLs, JWT secrets, or payment credentials to this repository.


## Secure KYC configuration

Identity documents and selfies are encrypted before database storage. To enable KYC submissions, configure the Render environment variable:

- `KYC_ENCRYPTION_KEY` — a private 32-byte key encoded as 64 hex characters or base64.

Generate a key locally with:

```bash
openssl rand -hex 32
```

Never commit the key to GitHub or send it in chat. Keep it only in the backend environment.


## Permanent file storage

FixIt uses Cloudflare R2 through its S3-compatible API for provider portfolio media and service-request photos. The backend keeps the bucket private and serves objects through short-lived signed access URLs. Cloudflare documents the S3 endpoint format as `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` and recommends scoped Object Read & Write credentials for a specific bucket. citeturn1search0turn1search1

Render variables:

```text
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=fixit-salone
```

Create an R2 bucket named `fixit-salone`, then create an R2 API token with **Object Read & Write** access scoped only to that bucket. Keep the Access Key ID and Secret Access Key private and store them only in Render. citeturn1search0turn1search1

When these variables are present, new uploads go to R2. If they are absent, the backend temporarily falls back to local storage for development; Render local storage should not be treated as permanent.
