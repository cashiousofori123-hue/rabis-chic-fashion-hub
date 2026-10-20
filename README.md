# Rabi's Chic Fashion Hub

## Local development

Install frontend dependencies with `npm install`. Create a Python virtual environment, activate it, and install `server/requirements.txt`. Copy `.env.example` to `.env`, set `RABI_ADMIN_EMAIL` to Rabi's real email, and replace `RABI_SECRET_KEY` with a long random secret. Start the API with `python run_server.py` and the storefront with `npm run dev`.

The first signup matching `RABI_ADMIN_EMAIL` becomes the store admin. Other new accounts remain pending until approved. Promote courier accounts from Admin > Security, then assign each order from Admin > Approvals before the rider shares device GPS. While an admin account stays signed in, privileged dashboard access locks on page reload and after 15 minutes; the admin can unlock with a registered device passkey (Face ID, fingerprint, Windows Hello, or device PIN) or password. Register a passkey once under Admin > Security while signed in. Passkeys require HTTPS and the canonical production site origin. “Lock Dashboard” keeps the account signed in; “Logout” ends the account session.

## Vercel deployment

The root `vercel.json` builds the Vite app from the repository root and maps `/api/*` to the Vercel Python function in `api/index.py`. The function imports the shared implementation from `server/main.py`; local development uses `python run_server.py`. No `client/` directory is required. Production API calls use the same site's `/api` path; leave `VITE_API_URL` unset unless using a separate API origin.

Set `RABI_ADMIN_EMAIL`, a long, persistent random `RABI_SECRET_KEY`, and a pooled PostgreSQL `DATABASE_URL` in Vercel Project Settings before signup. On the first API request the backend creates indexed Postgres tables for users, products, orders, and rider locations, seeding the catalog if empty. `server/storage.py` uses short-lived PostgreSQL connections; configure the provider's pooled connection string for serverless use. For local PostgreSQL persistence, set `DATABASE_URL` in `.env`; without it, local development keeps using the JSON files. The browser must use HTTPS and the rider must grant location permission. Cross-origin API access is enabled without cookies (`allow_credentials=False`); auth uses bearer tokens.

The local `.env` is git-ignored and contains the provisioned database connection. This workspace is not linked/authenticated to a Vercel project, so add the same database URL plus `RABI_SECRET_KEY` and Rabi's `RABI_ADMIN_EMAIL` to Vercel Project Settings manually before production deployment.

**Deployment setup is still required:** Vercel Functions have an ephemeral `/tmp` filesystem, so configure a persistent PostgreSQL provider and `DATABASE_URL` before deploying. Tracking polls the API in production and persists location updates to PostgreSQL when configured. MTN MoMo is a checkout selection, not a payment integration.