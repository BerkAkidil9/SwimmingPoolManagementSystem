# Swim Center (Swimming Pool Management System)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack swimming pool management system with multi-role support and comprehensive features including health verification, reservations, QR check-in, Stripe payments, OAuth authentication, feedback, email verification, and more.

---

## Live Demo

**[Live Demo](https://swimcenter.onrender.com)** – Try the app deployed on Render.

---

## Table of Contents 

- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Overview](#api-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Documentation](#documentation)
- [License](#license)

---

## Tech Stack

- **Backend:** Node.js, Express 4, PostgreSQL 14+
- **Frontend:** React 18 (CRA), React Router 6, Bootstrap 5
- **Auth:** Passport.js (Google OAuth 2.0), express-session + connect-pg-simple
- **Payments:** Stripe
- **File Storage:** Local disk (dev) / Cloudflare R2 via Worker proxy (prod)
- **Email:** Gmail API / Resend / SMTP (priority fallback)
- **Maps:** Leaflet + react-leaflet
- **Testing:** Jest, Supertest, Playwright
- **Deployment:** Render (Blueprint)
- **Scheduled Tasks:** node-cron (health report reminders)

---

## Project Structure

```
SwimmingPoolManagementSystem/
├── backend/             # Express API
│   ├── config/          # Database config
│   ├── middleware/       # Auth guards
│   ├── routes/          # API routes (admin, member, doctor, coach, staff, payment)
│   ├── scripts/         # DB init, Gmail token helper
│   ├── sql/             # PostgreSQL schema
│   ├── utils/           # Email, R2 storage, security helpers
│   ├── tests/           # Unit & integration tests
│   └── uploads/         # User file uploads (gitignored)
├── frontend/            # React SPA
│   └── src/
│       ├── components/  # UI components by feature
│       ├── pages/       # Page-level components
│       ├── api/         # API client utilities
│       ├── utils/       # Validations, date helpers, formatters
│       └── __tests__/   # Frontend unit tests
├── cloudflare-worker/   # R2 upload proxy (Cloudflare Workers)
├── tests/e2e/           # Playwright E2E tests
├── docs/                # Additional documentation
└── render.yaml          # Render deployment blueprint
```

---

## Features

### Landing Page
- **Overview** – About the swim center, packages, and pool locations (Leaflet map)
- **Packages** – Education (12 sessions, 7 AM–6 PM) and Free Swimming (18 sessions, 7 AM–12 AM)

### Register
- **Multi-step registration** – Personal info, health info, emergency contact, terms acceptance, privacy policy
- **Social registration** – Register with Google OAuth

### Login
- **Social login** – Sign in with Google OAuth
- **Regular login** – Sign in with email + password
- **Forgot password** – Password reset flow via email

### Others
*(Features that don't have a dedicated section)*
- **Email verification** – Token-based verification flow; verify result

### Home Page (`/home`)
- **Role-based home** – Cards that route users to their dashboards (Admin, Doctor, Coach, Staff, Member)

### Shared Navbar (logged-in users)
- **Role-based dashboard link** – Quick navigation to the user’s main dashboard
- **Cross-role access** – Admin/Doctor/Coach/Staff can also open Member Dashboard
- **Billing** – View billing and payment methods
- **Edit Profile** – Update profile and health information
- **Logout** – End session

*Landing Page uses its own layout.*

### Member Dashboard
- **Packages** – View and purchase packages
- **Resubmit verification** – Re-upload documents if verification is rejected
- **Reservations** – Create and cancel session reservations
- **QR check-in** – Generate QR code for staff verification
- **History** – View transaction history
- **Feedback** – Submit feedback

### Admin Dashboard
- **Pools** – CRUD pools with map picker
- **User verification** – Review queue and approve/reject users
- **Sessions** – Create, edit, and delete sessions
- **Feedback management** – Review and archive feedback
- **Email notifications** – Send emails to users (verification, reminders, etc.)

### Doctor Dashboard
- **Health review queue** – Users awaiting health assessment; approve, reject, or request additional health report
- **Approve / reject / request health report** – Approve or reject user health status; or request additional documentation (member receives email link to upload)
- **Review uploaded reports** – View, download, approve or reject health reports uploaded by members
- **Invalid document notification** – Mark reports as invalid; member receives notification to resubmit
- **Health report upload (by members)** – When doctor requests a report, members upload via the email link
- **Send health report reminders** – Send reminder emails to members who haven't uploaded requested reports
- **View pending reminders** – See users needing reminders and reminder history

### Staff Portal
- **QR verification** – Verify member check-ins via QR code
- **One-time codes** – Single-use verification codes for check-in

### Coach Dashboard
- **Members** – View approved members
- **Swimming ability** – Update member swimming ability status


---

## API Overview

| Route Group | Endpoints | Description |
|-------------|-----------|-------------|
| `/auth/*` | 21 | Login, register, Google OAuth, email verification, password reset |
| `/api/admin/*` | 12 | Pool CRUD, user verifications, session management, feedback |
| `/api/member/*` | 24 | Packages, reservations, QR check-in, profile, health info |
| `/api/payment/*` | 6 | Stripe payment intents, payment methods |
| `/api/doctor/*` | 9 | Health reviews, report management, reminders |
| `/api/staff/*` | 2 | Dashboard, QR code verification |
| `/api/coach/*` | 2 | Member list, swimming ability updates |
| `/api/reminders/*` | 3 | Health report reminder notifications |

For detailed endpoint documentation (method, path, auth, description), see [docs/api.md](docs/api.md).

---

## Prerequisites

- **Node.js** 18 or higher (20 recommended for Render deployment)
- **PostgreSQL** 14 or higher
- **React** 18 (frontend – comes with Create React App)
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
createdb swimcenter   # On Windows: use pgAdmin or psql if createdb is not in PATH
psql -d swimcenter -f sql/schema_postgres.sql
# Or: npm run db:init   (uses DATABASE_URL or DB_* from .env)
```

### Creating admin / staff / doctor / coach accounts

Normal registration only creates accounts with the `user` role. To create admin, doctor, staff, or coach accounts:

1. Register normally.
2. Update the role in the database: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`
3. Valid roles: `admin`, `doctor`, `staff`, `coach`

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

`cp .env.example .env` creates `.env` from the template; edit `.env` with your credentials. Minimum for local run: `DATABASE_URL` (or `DB_*`), `SESSION_SECRET`, `FRONTEND_URL`.

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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes ✓ | PostgreSQL connection string (e.g., Neon pooled URL with `?sslmode=require`). |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Yes ✓ | Alternative to DATABASE_URL. |
| `SESSION_SECRET` | Yes ✓ | Random string (Render can auto-generate). |
| `FRONTEND_URL` | Yes ✓ | Frontend URL (default: http://localhost:3000). |
| `BACKEND_URL` | Yes ✓ | Backend base URL for OAuth callback (e.g., http://localhost:3001). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth login/registration. See [docs/google-oauth-setup.md](docs/google-oauth-setup.md). |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for payments. |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key. |
| `USE_R2` | Optional | Set to `true` for Cloudflare R2 file storage. |
| `R2_WORKER_URL` / `R2_WORKER_SECRET` | Optional | Cloudflare Worker proxy for R2. See [docs/cloudflare-worker.md](docs/cloudflare-worker.md). |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Optional | Direct R2 access (local dev only). |
| `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Optional | R2 bucket config. See [docs/r2-setup.md](docs/r2-setup.md). |
| `GMAIL_USER` / `GMAIL_REFRESH_TOKEN` | Optional | Gmail API email – preferred on Render. See [docs/gmail-api-setup.md](docs/gmail-api-setup.md). |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Resend email – alternative (requires domain verification). |
| `EMAIL_USER` / `EMAIL_PASSWORD` | Optional | SMTP email – local fallback only. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | Optional | Backend API URL (default: http://localhost:3001). |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key (required if using payments). |

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

Integration tests require a local PostgreSQL database `swimcenter_test`. To set up:

1. Copy `backend/.env.test.example` to `backend/.env.test`
2. Fill in your PostgreSQL password
3. The test database schema is created automatically by `npm run db:test:setup`

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_DATABASE_URL` | Optional | Test DB connection string (alternative). |
| `TEST_DB_HOST` | Optional | Default: localhost. |
| `TEST_DB_PORT` | Optional | Default: 5432. |
| `TEST_DB_USER` | Optional | Default: postgres. |
| `TEST_DB_PASSWORD` | Yes ✓ | Your PostgreSQL password. |
| `TEST_DB_NAME` | Optional | Default: swimcenter_test. |

E2E tests use Playwright; frontend should be running at `localhost:3000`.

See [docs/testing.md](docs/testing.md) for detailed structure, coverage (Backend unit 51, Frontend unit 71, Integration 29, E2E 13), and setup.

---

## Deployment

This project uses a `render.yaml` Blueprint for one-click deploy on Render. **Render does not create a PostgreSQL database** – use an external provider (Neon, Supabase, ElephantSQL) and set `DATABASE_URL` manually.

### 1. External PostgreSQL (Required)

Create a PostgreSQL database at [Neon](https://neon.tech), [Supabase](https://supabase.com), or [ElephantSQL](https://www.elephantsql.com/), then copy the connection string.

### 2. Deploy via Blueprint

1. Render Dashboard → **New** → **Blueprint**
2. Connect this GitHub repo
3. Render creates: backend Web Service and frontend Static Site
4. In the backend service → Environment, add `DATABASE_URL` (from step 1)
5. After first deploy, run schema once: `npm run db:init` (backend service → Shell)
6. Fill in `sync: false` env vars (R2, OAuth, Email, Stripe)
7. Check each service's real URL in Render Dashboard. If your service names differ from the blueprint defaults, update `FRONTEND_URL` and `BACKEND_URL` in the backend service Environment to match.

### 3. Cloudflare R2 (File Storage)

Render has TLS issues with direct R2. Use the **Cloudflare Worker proxy** – see [docs/cloudflare-worker.md](docs/cloudflare-worker.md) for setup. For full R2 bucket configuration, see [docs/r2-setup.md](docs/r2-setup.md).

- Deploy the Worker, then set `R2_WORKER_URL` and `R2_WORKER_SECRET` in Render
- Alternatively, for local dev with direct R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 4. Manual Render setup (if not using Blueprint)

- **Backend:** Web Service, Root: `backend`, Build: `npm install`, Start: `node index.js`. Add env vars from `backend/.env.example`; set `DATABASE_URL` from your external PostgreSQL.
- **Frontend:** Static Site, Root: `frontend`, Build: `npm install && npm run build`, Publish: `build`. Add `REACT_APP_API_URL` (backend URL) and `REACT_APP_STRIPE_PUBLISHABLE_KEY` in Environment.

### 5. OAuth Provider Callbacks

Add this redirect URI in Google Cloud Console:
- `https://YOUR-BACKEND.onrender.com/auth/google/callback`

---

## Security Notes

- **Never commit** `.env` files or real credentials. Use `.env.example` as a template.
- **Session:** Set `SESSION_SECRET` to a strong random string in production.
- **Email:** Configure Gmail API (`GMAIL_USER`, `GMAIL_REFRESH_TOKEN`), Resend (`RESEND_API_KEY`), or SMTP (`EMAIL_USER`, `EMAIL_PASSWORD`) for verification and password reset. See [docs/gmail-api-setup.md](docs/gmail-api-setup.md) for Gmail setup.
- **R2 Worker:** Keep `R2_WORKER_SECRET` private when using the Cloudflare Worker proxy.
- User uploads (`backend/uploads/`) are excluded from version control.

---

## Documentation

Additional guides are available in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [docs/api.md](docs/api.md) | Full API endpoint reference (method, path, auth, description) |
| [docs/google-oauth-setup.md](docs/google-oauth-setup.md) | Google OAuth credentials (login/registration) |
| [docs/gmail-api-setup.md](docs/gmail-api-setup.md) | Gmail API setup and refresh token generation |
| [docs/r2-setup.md](docs/r2-setup.md) | Cloudflare R2 bucket setup and configuration |
| [docs/cloudflare-worker.md](docs/cloudflare-worker.md) | Cloudflare Worker proxy for R2 uploads |
| [docs/testing.md](docs/testing.md) | Detailed test structure, coverage, and setup |

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
