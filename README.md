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
