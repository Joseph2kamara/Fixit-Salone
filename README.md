# FixIt Salone 🇸🇱

FixIt Salone is a Sierra Leone-focused marketplace for finding local service providers.

## Public beta

The repository currently contains the lightweight public marketplace website. It is designed to be deployed as a Render Static Site from the `main` branch.

### Render settings
- Service type: Static Site
- Branch: `main`
- Build command: leave blank
- Publish directory: `.`

Render will provide an `onrender.com` URL after deployment and can automatically redeploy when changes are pushed to GitHub.

## Roadmap

Customer accounts, provider dashboards, service requests, reviews, notifications, PostgreSQL and mobile-money payment integration are being rolled into the full marketplace backend in subsequent deployment stages.

Never commit passwords, database URLs, JWT secrets, or payment credentials to this repository.