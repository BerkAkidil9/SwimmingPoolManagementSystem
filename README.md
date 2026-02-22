# Swim Center (Swimming Pool Management System)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack swimming pool management system with multi-role support and comprehensive features including health verification, reservations, QR check-in, Stripe payments, OAuth authentication, feedback, email verification, and more.

---

## Table of Contents 

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [License](#license)

---

## Features

### Landing Page
- About us, package overview, pool locations (Leaflet map)
- Two package types – Education (12 sessions, 7 AM–6 PM) and Free Swimming (18 sessions, 7 AM–12 AM)

### Register
- Multi-step registration – Personal info, health info, emergency contact, terms acceptance, privacy policy (`/privacy-policy`)
- Social registration – Google OAuth (`/register/social`)

### Login
- Social login – Google OAuth
- Regular login
- Forgot password (`/forgot-password`)

### Others
*(Features that don't have a dedicated section)*
- **Email verification** – Token-based verification flow; verify result (`/verify-result`)

### Home Page (`/home`)
- Role-based landing for logged-in users (Admin Panel, Doctor Dashboard, Coach Dashboard, Staff Verification, Member Dashboard cards)

### Shared Navbar (logged-in users)
- Role-based dashboard link (Admin Panel, Doctor Dashboard, Coach Dashboard, Staff Verification, Member Dashboard)
- Admin/Doctor/Coach/Staff: extra Member Dashboard link
- Billing
- Edit Profile (profile and health info management)
- Logout

*Landing Page uses its own layout.*

### Member Dashboard
- View and purchase packages
- Resubmit verification (if rejected)
- Create and cancel session reservations
- QR code for check-in
- Transaction history
- Feedback submission

### Admin Dashboard
- Pool CRUD with map picker
- User verification queue (approve/reject)
- Session management (create, edit, delete)
- Feedback management
- Email notifications to users

### Doctor Dashboard
- **Health review queue** – Users awaiting health assessment; approve, reject, or request additional health report
- **Approve / reject / request health report** – Approve or reject user health status; or request additional documentation (member receives email link to upload)
- **Review uploaded reports** – View, download, approve or reject health reports uploaded by members
- **Invalid document notification** – Mark reports as invalid; member receives notification to resubmit
- **Health report upload (by members)** – When doctor requests a report, members upload at `/health-report-upload?userId=` or `/upload-health-report/:userId`
- **Send health report reminders** – Send reminder emails to members who haven't uploaded requested reports
- **View pending reminders** – See users needing reminders and reminder history

### Staff Portal
- QR code verification for check-in
- One-time use verification codes

### Coach Dashboard
- View members
- Update swimming ability status


---

## Prerequisites

- **Node.js** 18 or higher (20 recommended for Render deployment)
- **PostgreSQL** 14 or higher
- **React** 18 (frontend – Create React App ile gelir)
- **npm** or **yarn**
- (Optional) Stripe account, Google OAuth app for full functionality

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/BerkAkidil9/SwimmingPoolManagementSystem.git
cd SwimmingPoolManagementSystem
```

### 2. Database setup

Create a PostgreSQL database (e.g. `swimcenter`) and run the schema:

```bash
cd backend
createdb swimcenter   # or create via pgAdmin / psql
psql -d swimcenter -f sql/schema_postgres.sql
# Or: npm run db:init   (uses DATABASE_URL or DB_* from .env)
```

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

`cp .env.example .env` creates `.env` from the template; edit `.env` with your database credentials and API keys.

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with REACT_APP_STRIPE_PUBLISHABLE_KEY if using Stripe
```

---

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (preferred) |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Alternative to DATABASE_URL |
| `BACKEND_URL` | Backend base URL (OAuth callback; e.g. http://localhost:3001) |
| `CALLBACK_URL` | OAuth redirect URL (optional) |
| `SESSION_SECRET` | Required for production; use a strong random string |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `FRONTEND_URL` | Frontend URL (default: http://localhost:3000) |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| **R2 (Render)** | `R2_WORKER_URL`, `R2_WORKER_SECRET` – Cloudflare Worker proxy (see [cloudflare-worker/README.md](cloudflare-worker/README.md)) |
| **R2 (Local)** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| `USE_R2` | Set to `true` for R2 storage |
| **Email (Gmail API)** | `GMAIL_USER`, `GMAIL_REFRESH_TOKEN` – preferred on Render |
| **Email (Resend)** | `RESEND_API_KEY`, `EMAIL_FROM` – alternative |
| **Email (SMTP)** | `EMAIL_USER`, `EMAIL_PASSWORD` – local fallback only |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL (default: http://localhost:3001) |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## Running the Application

### Start the backend (Terminal 1)

```bash
cd backend
node index.js
```

Server runs at `http://localhost:3001`.

### Start the frontend (Terminal 2)

```bash
cd frontend
npm start
```

App runs at `http://localhost:3000`.

---

## Testing

From project root:

```bash
npm test                  # All tests (unit + integration + e2e)
npm run test:unit         # Backend + frontend unit only
npm run test:integration   # Integration (requires swimcenter_test PostgreSQL)
npm run test:e2e           # E2E (frontend must run on localhost:3000)
```

### Per-component

```bash
cd backend && npm test                                    # Backend unit
cd frontend && npm test -- --watchAll=false --forceExit   # Frontend unit
cd backend && npm run db:test:setup && npm run test:integration
cd tests/e2e && npm test   # E2E (Playwright); run frontend first
```

Integration tests require a PostgreSQL database `swimcenter_test`. E2E tests use Playwright; frontend should be running at `localhost:3000`.

See [tests/README.md](tests/README.md) for detailed structure, coverage (Backend unit 51, Frontend unit 71, Integration 29, E2E 13), and setup.

---

## Deployment

This project uses a `render.yaml` Blueprint for one-click deploy on Render. **Render does not create a PostgreSQL database** – use an external provider (Neon, Supabase, ElephantSQL) and set `DATABASE_URL` manually.

### 1. External PostgreSQL (Required)

Create a PostgreSQL database at [Neon](https://neon.tech), [Supabase](https://supabase.com), or [ElephantSQL](https://www.elephantsql.com/), then copy the connection string.

### 2. Deploy via Blueprint

1. Render Dashboard → **New** → **Blueprint**
2. Connect this GitHub repo
3. Render creates: backend Web Service (`swimcenter-api`), frontend Static Site (`swimcenter`)
4. Set `DATABASE_URL` in the backend service env vars (from step 1)
5. After first deploy, run schema once: `cd backend && npm run db:init` (Dashboard → Shell)
6. Fill in `sync: false` env vars (R2, OAuth, Email, Stripe)

### 3. Cloudflare R2 (File Storage)

Render has TLS issues with direct R2. Use the **Cloudflare Worker proxy** – see [cloudflare-worker/README.md](cloudflare-worker/README.md) for setup.

- Deploy the Worker, then set `R2_WORKER_URL` and `R2_WORKER_SECRET` in Render
- Alternatively, for local dev with direct R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 4. Manual Render setup (if not using Blueprint)

- **Backend:** Web Service, Root: `backend`, Build: `npm install`, Start: `node index.js`
- **Frontend:** Static Site, Root: `frontend`, Build: `npm install && npm run build`, Publish: `frontend/build`
- Add env vars from `backend/.env.example`; set `DATABASE_URL` from your external PostgreSQL

### 5. OAuth Provider Callbacks

Add this redirect URI in Google Cloud Console:
- `https://YOUR-BACKEND.onrender.com/auth/google/callback`

---

## Security Notes

- **Never commit** `.env` files or real credentials. Use `.env.example` as a template.
- **Session:** Set `SESSION_SECRET` to a strong random string in production.
- **Email:** Configure Gmail API (`GMAIL_USER`, `GMAIL_REFRESH_TOKEN`), Resend (`RESEND_API_KEY`), or SMTP (`EMAIL_USER`, `EMAIL_PASSWORD`) for verification and password reset.
- **R2 Worker:** Keep `R2_WORKER_SECRET` private when using the Cloudflare Worker proxy.
- User uploads (`backend/uploads/`) are excluded from version control.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
