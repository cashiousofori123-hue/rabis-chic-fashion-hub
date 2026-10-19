# Rabi's Chic Fashion Hub

## Local development

Install frontend dependencies with `npm install`. Create a Python virtual environment, activate it, and install `server/requirements.txt`. Copy `.env.example` to `.env`, set `RABI_ADMIN_EMAIL` to Rabi's real email, and replace `RABI_SECRET_KEY` with a long random secret. Start the API with `python server.py` and the storefront with `npm run dev`.

The first signup matching `RABI_ADMIN_EMAIL` becomes the store admin. Other new accounts remain pending until approved. Promote courier accounts from Admin > Security, then assign each order from Admin > Approvals before the rider shares device GPS.

## Deployment

The Vite storefront can be hosted on Vercel. The Python API needs a host that supports persistent storage and long-lived WebSocket connections. Configure `VITE_API_URL` to that API's HTTPS origin, `RABI_ALLOWED_ORIGINS` to the exact Vercel site origin, `RABI_ADMIN_EMAIL` to Rabi's account, and `RABI_SECRET_KEY` to a persistent random secret. Browser GPS requires HTTPS and the courier's permission.

The JSON files in `server/` are suitable only for a single-process local/demo deployment. They are excluded from git; serverless filesystems are ephemeral, so production must move users, products, and orders to a persistent database before accepting real customer data or payments. MTN MoMo is recorded as the selected payment method; payment collection is not integrated.