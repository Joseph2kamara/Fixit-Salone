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

### Trust & Safety foundation
- Private identity verification records and verification status
- Incident/report records with severity and investigation status
- Admin audit-log structure
- Public profiles show trust status, not ID documents or ID numbers

### Backend foundation
- Node.js / Express API
- PostgreSQL connection
- Provider portfolio records
- Image/video upload validation
- Health endpoint

### Important deployment note
The backend is not yet connected to a live database, production authentication/OTP provider, KYC verification provider, or cloud media storage. The Trust & Safety UI and database foundation are beta-ready, but identity documents must not be collected in the public beta until authenticated, encrypted storage and admin access controls are deployed. The browser portfolio remains demo-only until the secure provider authentication and persistent storage layer is deployed.

### Render static site
- Service type: Static Site
- Branch: `main`
- Build command: leave blank
- Publish directory: `.`

Never commit passwords, database URLs, JWT secrets, or payment credentials to this repository.
