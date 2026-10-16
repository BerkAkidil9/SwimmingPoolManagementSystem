# Swim Center

Swim Center is a swimming pool management application for memberships, session
reservations, payments and QR entry checks. Members, administrators, doctors,
staff and coaches use role-specific dashboards to manage pool access and the
registration and health reviews it requires.

[Live demo](https://swimcenter.onrender.com)

![Swim Center landing page with the pool preview and registration and login links](docs/images/swimcenter-home.png)

## Features

- **Pool discovery:** Browse pool locations on a map and view swimming packages.
- **Registration and account access:** Complete a five-step registration with
  identity documents, a profile photo, health information and emergency contacts.
  Sign in with email/password or Google, verify email and reset a forgotten password.
- **Packages and billing:** Purchase education or free-swimming packages with
  12 or 18 sessions respectively, pay through Stripe, manage saved payment methods
  and view transaction history.
- **Reservations:** Book available sessions using an active package after health
  approval. Cancel at least three hours before the session to restore the used
  package allowance.
- **Administration:** Manage pools and sessions, approve or reject registration
  documents, and review member feedback. Members can resubmit rejected documents
  within the verification attempt limit.
- **Health reviews:** Doctors approve or reject assessments, request additional
  reports, review uploaded documents and notify members about invalid reports.
  Members upload requested reports after signing in; manual and scheduled email
  reminders support outstanding requests.
- **Entry verification:** Members generate a reservation QR code for staff to
  verify; the backend checks the reservation and rejects previously used codes.
- **Coaching:** Coaches view approved members and update their swimming ability.
- **Member self-service:** Update profile and health information and submit feedback.

## Tech Stack

| Area | Technologies |
|------|--------------|
| Backend | Node.js, Express 4, PostgreSQL |
| Frontend | React 18, Vite 8, React Router 7, Bootstrap 5 |
| Authentication | Passport.js with Google OAuth, PostgreSQL-backed sessions |
| Payments | Stripe |
| Email | Gmail API, Resend or Gmail SMTP |
| File storage | Local disk or Cloudflare R2, directly or through a Cloudflare Worker |
| Maps | Leaflet, React Leaflet and OpenStreetMap tiles |

## Getting Started

### Prerequisites

- **Node.js 24 (recommended) and npm** for the backend and frontend.
- A running **PostgreSQL** server and permission to create a development database.
- A **Google OAuth web client** and **Stripe test keys**. The current backend
  initializes these clients at startup: Google requires a client ID, and Stripe
  requires a secret key. A matching Google client secret is needed for OAuth login.
- An email provider configured for registration verification, password resets
  and report notifications. See [email configuration](#email).

### 1. Clone and install

```bash
git clone https://github.com/BerkAkidil9/SwimmingPoolManagementSystem.git
cd SwimmingPoolManagementSystem
npm --prefix backend ci
npm --prefix frontend ci
```

The following commands assume you are in the repository root.

### 2. Configure local environments

For a new checkout, copy the templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

If these files already exist, edit them instead of overwriting them. Replace
placeholder values using the [configuration reference](#configuration). Keep
`USE_R2=false` for local disk uploads unless you have configured R2.

### 3. Create and initialize the database

Create an empty database using your PostgreSQL account. Replace `postgres` below
if your local database user has a different name:

```bash
createdb -h localhost -U postgres swimcenter
```

Set `DATABASE_URL` in `backend/.env` to that database, using your own credentials:

```dotenv
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/swimcenter
```

Initialize its schema:

```bash
(cd backend && npm run db:init)
```

**The initializer drops and recreates the application tables.** Run it only
against a new or disposable database, never an existing database whose data you
need to retain.

### 4. Start the application

In one terminal, from the repository root, start the backend:

```bash
npm start
```

In a second terminal, from the repository root, start the frontend:

```bash
npm --prefix frontend start
```

Open **http://localhost:3000**. The API runs at **http://localhost:3001**.

### 5. Set up development roles

New registrations have the `user` (member) role and require email verification
and administrator approval. The schema does not create an initial administrator.
Register a development account, verify its email, then bootstrap an administrator
by running this SQL against your development database:

```sql
UPDATE users
SET role = 'admin', verification_status = 'approved'
WHERE email = 'your-admin@example.com';
```

Sign in with that account to review registrations. Other development accounts
can be assigned `doctor`, `staff` or `coach` roles through the database. Members
need doctor approval before making swimming reservations.

## Configuration

The backend reads `backend/.env`; Vite reads `frontend/.env`. Keep secrets in
backend configuration and keep local `.env` files out of version control.

### Backend

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string. Alternatively, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`. |
| `SESSION_SECRET` | Required, non-empty session signing secret. Use a long random value. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login credentials; also used when sending through Gmail API. See [Google OAuth setup](docs/google-oauth-setup.md). |
| `STRIPE_SECRET_KEY` | Server-side Stripe key. Use a test key for development. |
| `STRIPE_PUBLISHABLE_KEY` | Matching public key returned by the payment configuration endpoint. |
| `FRONTEND_URL` | Frontend origin for redirects, CORS and email links; defaults to `http://localhost:3000`. |
| `BACKEND_URL` | Base URL for the Google callback; defaults to `http://localhost:3001`. |
| `USE_R2` | Set to `true` to use R2; otherwise uploads are stored in `backend/uploads/`. |

The Google login callback is `{BACKEND_URL}/auth/google/callback`. Register the
exact local or deployed callback URL in your Google OAuth client.

### Email

Configure one provider for email-dependent features:

| Provider | Backend settings |
|----------|------------------|
| Gmail API | `GMAIL_USER`, `GMAIL_REFRESH_TOKEN` and both Google client variables; see [Gmail setup](docs/gmail-api-setup.md). |
| Resend | `RESEND_API_KEY` and an authorized `EMAIL_FROM` sender. |
| Gmail SMTP | `EMAIL_USER`, `EMAIL_PASSWORD` and an appropriate `EMAIL_FROM` sender. |

When multiple providers are configured, the backend selects Gmail API, then
Resend, then SMTP. Delivery failures do not automatically switch providers.

### File storage

For R2, set `USE_R2=true` and `R2_PUBLIC_URL` with either the Worker URL/secret
pair or direct R2 API credentials. Follow [R2 setup](docs/r2-setup.md) and the
[Worker guide](docs/cloudflare-worker.md) for the required settings.

Local file serving checks application sessions and file access. Public R2 URLs
and the current Worker's Origin/Referer checks do not enforce per-user document
ownership; review the [storage access limitations](docs/r2-setup.md#file-access-limitations)
before using them for identity or health documents.

### Frontend

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | Backend base URL; defaults to `http://localhost:3001`. |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe public key matching the backend account and test/live mode. |

The Vite configuration preserves these `REACT_APP_` names. Their values are
embedded in the browser bundle at build time, so changing them requires a rebuild.
Never put secret keys or database credentials in frontend variables.

## Production Build

```bash
npm --prefix frontend run build
npm --prefix frontend run preview
```

The build is written to `frontend/build`. Preview serves it locally on port
3000 and still needs the backend for API requests. Stop the frontend development
server before using the same port for preview.

## Testing

Tests use Jest, React Testing Library, Supertest and Playwright. The current
inventory contains 67 backend unit, 88 frontend unit/component, 32 PostgreSQL
integration and 15 browser tests. Browser checks primarily cover page
loading and navigation; they do not establish complete payment, registration
or reservation workflows.

Run unit suites after installing the application dependencies:

```bash
npm --prefix backend test -- --runInBand
npm --prefix frontend test -- --watchAll=false --forceExit
```

For integration tests, create a separate disposable database. Copy the test
template only if `backend/.env.test` does not already exist:

```bash
createdb -h localhost -U postgres swimcenter_test
cp backend/.env.test.example backend/.env.test
```

Use your own database user. Add an explicit `TEST_DATABASE_URL` to that file so
both setup and tests use the same database:

```dotenv
TEST_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/swimcenter_test
```

Then run:

```bash
(cd backend && npm run db:test:setup && npm run test:integration -- --runInBand)
```

Setup recreates the test schema, and suites modify test data. Keep this database
separate from application and production data.

For browser smoke tests, start the frontend first, then install and run Playwright:

```bash
npm --prefix tests/e2e ci
(cd tests/e2e && npx playwright install chromium)
npm --prefix tests/e2e test
```

The browser tests target `http://localhost:3000` by default. See the
[test guide](docs/testing.md) for additional test commands and coverage scopes.
[Recorded measurements](docs/local-measurements.md) contain the dated coverage
and performance results from 30 September 2026.

## Deployment

[`render.yaml`](render.yaml) defines a Node.js 24 backend web service and a
frontend static site:

| Service | Root directory | Build command | Start / publish |
|---------|----------------|---------------|-----------------|
| Backend | `backend` | `npm install` | `node index.js` |
| Frontend | `frontend` | `npm install && npm run build` | Publish `build`; rewrite `/*` to `/index.html` |

1. Create a PostgreSQL database; the blueprint does not provision one. Initialize
   an empty database with the schema before using the application. The initializer
   deletes existing application tables, so it is not a production migration tool.
2. In Render, create a Blueprint from this repository and configure the required
   backend variables under **Environment**, including `DATABASE_URL`, Google,
   Stripe and your chosen email/storage provider. Render generates the session
   secret from the blueprint.
3. Set backend `FRONTEND_URL` and `BACKEND_URL`, and frontend `REACT_APP_API_URL`,
   to the actual deployed URLs. Configure the frontend Stripe public key and
   register the deployed Google callback.
4. Complete R2 configuration: the blueprint sets `USE_R2=true`. Local uploads on
   the free backend's filesystem do not persist across restarts or redeployments.

Render supplies environment variables directly; a deployed `.env` file is not
required. Frontend environment changes require a rebuild. On the blueprint's
free backend plan, initialize the database from a configured local checkout
rather than relying on Render Shell, and use Gmail API or Resend because SMTP
ports are blocked. See [Render's free-service limitations](https://render.com/docs/free).

## Project Structure

```text
backend/             Express API, SQL schema, uploads and backend tests
frontend/            React application and Vite/Jest configuration
frontend/src/assets/ Imported images and icons
frontend/src/__tests__/ Frontend unit and component tests
frontend/test/       Jest setup, polyfills and file/style mocks
cloudflare-worker/   R2 upload/read proxy
tests/               Browser tests and measurement tools
docs/                API, integration, testing and measurement guides
render.yaml          Render service definitions
```

See the [API reference](docs/api.md) for routes, authentication and upload fields.
Application screens live in `frontend/src/pages/` and `frontend/src/components/`;
backend routes, including registration, live in `backend/routes/`. Shared backend
helpers are grouped in `backend/utils/`.

## License

[MIT](LICENSE).
