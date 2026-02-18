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
- [Security Notes](#security-notes)
- [License](#license)

---

## Features

### Public
- **Landing page** – About us, package overview, pool locations (Leaflet map)
- **Multi-step registration** – Personal info, health info, emergency contact, terms acceptance
- **Social login** – Google, GitHub, Facebook OAuth
- **Email verification** – Token-based verification flow
- **Password reset** – Forgot password via email link
- **Two package types** – Education (12 sessions, 7 AM–6 PM) and Free Swimming (18 sessions, 7 AM–12 AM)

### Shared Navbar (logged-in users)
- Role-based dashboard link (Admin Panel, Doctor Dashboard, Coach Dashboard, Staff Verification, Member Dashboard)
- Admin/Doctor/Coach: extra Member Dashboard link
- Billing
- Edit Profile (profile and health info management)
- Logout

*Landing Page and Staff Verification use their own layouts.*

### Member Dashboard
- View and purchase packages
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
- Health review queue
- Approve, reject, or request health reports
- Upload health reports on behalf of users
- Health report upload (via doctor email link – members receive link and upload at `/upload-health-report/:userId`)
- Send health report reminders
- View pending reminders

### Staff Portal
- QR code verification for check-in
- One-time use verification codes

### Coach Dashboard
- View members
- Update swimming ability status

---

## Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **React** 18 (frontend – Create React App ile gelir)
- **npm** or **yarn**
- (Optional) Stripe account, Google/GitHub/Facebook OAuth apps for full functionality

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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Facebook OAuth (optional) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials for verification/reset emails |
| `FRONTEND_URL` | Frontend URL (default: http://localhost:3000) |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |

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

### Backend unit tests

```bash
cd backend
npm test
```

### Backend integration tests

Requires a test database (e.g. `swimcenter_test`):

```bash
cd backend
# Set DATABASE_URL to point to test DB, then:
npm run db:test:setup   # First time: creates schema
npm run test:integration
```

### Frontend tests

```bash
cd frontend
npm test
```

### E2E tests (Playwright)

Backend and frontend must be running:

```bash
cd tests/e2e
npm install
npm test
```

See [tests/README.md](tests/README.md) for detailed test structure and coverage.

---

## Deployment (Render Blueprint + PostgreSQL + Cloudflare R2)

This project uses a `render.yaml` Blueprint for one-click deploy on Render with PostgreSQL and Cloudflare R2.

### 1. Deploy via Blueprint

1. Render Dashboard → **New** → **Blueprint**
2. Connect this GitHub repo
3. Render creates: backend Web Service, frontend Static Site, PostgreSQL database
4. After first deploy, run schema once: `npm run db:init` (Dashboard → Shell, or use Render PostgreSQL psql)
5. Fill in `sync: false` env vars in the Dashboard (R2, OAuth, Email, Stripe)

### 2. Cloudflare R2 (File Storage)

1. Cloudflare Dashboard → R2 → Create bucket `swimcenter-uploads`
2. R2 → Manage R2 API Tokens → Create token (Object Read & Write)
3. Bucket → Settings → Public access → Enable (R2.dev subdomain)
4. Note public URL (e.g. `https://pub-xxx.r2.dev`)
5. Use: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 3. Manual Render setup (if not using Blueprint)

- **Backend:** Web Service, Root: `backend`, Build: `npm install`, Start: `node index.js`
- **Frontend:** Static Site, Root: `frontend`, Build: `npm install && npm run build`, Publish: `frontend/build`
- Add env vars from `backend/.env.example`; use `DATABASE_URL` from Render PostgreSQL

### 4. Render – Frontend (Static Site)

1. New → Static Site
2. Connect same repo, Root Directory: `frontend`
3. Build: `npm install && npm run build`, Publish: `build`
4. Add `REACT_APP_API_URL` = your backend URL

### 5. OAuth Provider Callbacks

Add these redirect URIs in Google/GitHub/Facebook developer consoles:
- `https://YOUR-BACKEND.onrender.com/auth/google/callback`
- `https://YOUR-BACKEND.onrender.com/auth/github/callback`
- `https://YOUR-BACKEND.onrender.com/auth/facebook/callback`

---

## Security Notes

- **Never commit** `.env` files or real credentials. Use `.env.example` as a template.
- **Email:** Configure `EMAIL_USER` and `EMAIL_PASSWORD` for verification and password reset emails.
- User uploads (`backend/uploads/`) are excluded from version control.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
