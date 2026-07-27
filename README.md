# MultiTips

**SMS-first betting tips and subscription platform for the Kenyan market.**  
Customers purchase tiered match‑prediction packages via M‑Pesa, receive tips over SMS, and staff manage customers, payments, and content through a web admin panel.

> **Note:** This project was previously known as *JengaTips* (`jengatips.com`) and has been migrated to **multitips.net**.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, Tailwind CSS, `@auth0/nextjs-auth0` v4 |
| Backend | Node.js / Express 5, `pg`, `ioredis`/`redis`, `node-cron`, `zod`, `pino` |
| Auth | Auth0 (EU region tenant) |
| Payments | Safaricom Daraja API (M‑Pesa C2B) |
| SMS | Emalify SMS API v2 |
| Infra | Docker Compose, Docker secrets, Portainer, Contabo VPS, Cloudflare |

---

## Prerequisites

- Docker & Docker Compose (v2)
- Node.js 22.x (for local dev outside Docker)
- Access to: Auth0 tenant, Safaricom Daraja developer account, Emalify account, Cloudflare DNS for the domain

---

## Project Structure
```
├── backend/ # Express API
│ ├── src/
│ │ ├── config/ # db.js, redis.js
│ │ ├── controllers/
│ │ ├── cron/ # node-cron scheduler
│ │ ├── db/
│ │ │ ├── migrate.js # migration runner
│ │ │ └── migrations/ # timestamped .sql files
│ │ ├── middleware/ # auth, syncUser, rateLimiter, upload, errorHandler, logger
│ │ ├── routes/
│ │ └── services/ # darajaService, paymentRecovery, cleanupService, auth0ManagementService
│ ├── docker-entrypoint.sh # runs migrations, then starts the server
│ └── Dockerfile
├── frontend/ # Next.js 15 admin panel
│ ├── src/
│ │ ├── app/
│ │ │ ├── api/auth/[...] # Auth0 SDK routes
│ │ │ ├── api/proxy/[...] # authenticated pass‑through to backend
│ │ │ └── ... # pages
│ │ ├── components/ # Providers.js ("use client" Auth0Provider wrapper)
│ │ └── lib/ # api.js, auth0.js, logger.js, theme.js
│ └── Dockerfile
├── nginx/
│ └── multitips.conf # in‑stack reverse proxy config
├── secrets/ # gitignored — populated by seed‑secrets.sh
├── seed-secrets.sh # interactive prompt to create secrets/*.txt
└── docker-compose.yml
```

---

## Environment Variables & Secrets

Environment files (`backend/.env`, `frontend/.env`) are **not committed**. Secrets are provided via Docker secrets (see `secrets/*.txt`) and read as `*_FILE` env vars.

### `backend/.env`

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` in Docker Compose |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | Postgres connection (password via secret) |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection (password via secret) |
| `FRONTEND_URL` | Allowed CORS origin – must match your public domain |
| `APP_BASE_URL` | Base URL for Daraja confirmation/validation URLs |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | JWT validation |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` (spelled exactly) |
| `MPESA_CALLBACK_OWNER` | `self` to allow re‑registering C2B URLs |

### `frontend/.env`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Public API base URL for client‑side code |
| `BACKEND_INTERNAL_URL` | Internal Docker URL (`http://backend:5000`) for server‑side proxy routes |
| `AUTH0_*` (v4) | Domain, client ID, base URL, audience – base URL must match public domain |

### Docker Secrets

See `seed-secrets.sh` for the full list: `auth0_mgmt_client_secret`, `db_password`, `emalify_api_key`, `frontend_auth0_client_secret`, `frontend_auth0_secret`, `malipo_callback_secret_path`, `malipo_webhook_secret`, `mpesa_callback_secret_path`, `mpesa_consumer_key`, `mpesa_consumer_secret`, `mpesa_passkey`, `redis_password`.

---

## Local Development

1. **Clone the repository**
```bash
   git clone https://github.com/your-org/multitips.git
   cd multitips
```
   
2. **Populate secrets (interactive)**
```bash
   ./seed-secrets.sh
```
3. Create environment files – copy from examples or create manually.
4. Start the stack
``` bash
   docker compose up -d --build
```
5. Access – ```http://localhost:8085 ``` (or whatever port you expose).



