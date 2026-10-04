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

### Backend foundation
- Node.js / Express API
- PostgreSQL connection
- Provider portfolio records
- Image/video upload validation
- Health endpoint

### Important deployment note
The backend is not yet connected to a live database, authentication provider, or cloud media storage. The browser portfolio remains demo-only until the secure provider authentication and persistent storage layer is deployed.

### Render static site
- Service type: Static Site
- Branch: `main`
- Build command: leave blank
- Publish directory: `.`

Never commit passwords, database URLs, JWT secrets, or payment credentials to this repository.
