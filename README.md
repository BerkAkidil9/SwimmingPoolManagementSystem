# Swim Center (Swimming Pool Management System)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
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
- **MySQL** 8 or higher
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

Create the database and tables using the schema file:

```bash
mysql -u root -p < backend/sql/schema_only.sql
```

Or in MySQL Workbench: select the database `SwimmingPoolManagementSystem`, then run `backend/sql/schema_only.sql`.

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
| `DB_HOST` | MySQL host (default: localhost) |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (default: SwimmingPoolManagementSystem) |
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

Requires a separate test database `SwimmingPoolManagementSystem_test`:

```bash
cd backend
npm run db:test:setup   # First time: creates test DB
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

## Security Notes

- **Never commit** `.env` files or real credentials. Use `.env.example` as a template.
- **Email:** Configure `EMAIL_USER` and `EMAIL_PASSWORD` for verification and password reset emails.
- User uploads (`backend/uploads/`) are excluded from version control.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
