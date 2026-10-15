# Test Documentation

This guide covers the existing test suites, manual execution and the isolated
CI runner. Use Node.js 24. Commands below run from the repository root unless
stated otherwise.

## Test Summary

| Suite | Files | Tests | Location / requirements |
|-------|------:|------:|-------------------------|
| Backend unit | 15 | 52 | `backend/tests/unit/`; predominantly mocked dependencies |
| Frontend unit/component | 50 | 71 | `frontend/src/__tests__/`; jsdom |
| PostgreSQL integration | 9 | 29 | `backend/tests/integration/`; disposable database |
| Browser smoke | 12 | 13 | `tests/e2e/`; running frontend and Chromium |
| **Total** | **86** | **165** | Source declarations, not a coverage percentage |

Backend tests use Jest 30 and Supertest; frontend tests use Jest 30 and React
Testing Library. Frontend setup and mocks live in `frontend/test/`; the Jest
configuration loads `test/setupTests.js`. Playwright browser tests mainly check page loading, form
visibility and navigation. Some URL assertions accept both the protected route
and a login redirect. These tests do not establish completed registration,
payment, reservation or QR workflows. Google, Stripe, email and R2 live-service
behavior is outside the automated smoke coverage.

## Running Tests

### Native macOS CI

The managed runner is verified on macOS ARM64 with Node.js 24. It installs its
own dependencies and Chromium, builds the frontend, starts application servers
and provisions disposable PostgreSQL databases. It needs network access for npm
audits and initial downloads; no existing application server, external database
or production credentials are required.

```bash
npm run ci:local             # Audits, production build and all test suites
npm run ci:quality           # Five lockfile audits and production build
npm run ci:test -- 1/2       # First test shard
npm run ci:test -- 2/2       # Second test shard
```

[`tooling/ci/run.mjs`](../tooling/ci/run.mjs) copies source into a temporary
workspace, excludes `.env` files and uploads, and uses synthetic settings. Each
`tests` or `all` invocation starts one loopback PostgreSQL cluster, containing an
application database and separate integration databases selected by `JEST_WORKER_ID`. API, preview
and database ports are allocated dynamically. Test Node connections and browser
DNS are restricted to loopback; dependency downloads and audits still use the
network. Temporary application processes and the cluster are cleaned up afterward.

Jest and Playwright use a limit of two workers per shard. The wrapper disables
browser retries, unlike the standalone Playwright config. Audits cover the root,
`backend`, `frontend`, `tests/e2e` and `tests/measurements` lockfiles, including
development dependencies. These commands do not run a standalone lint check,
coverage threshold, Lighthouse, axe or load benchmark.

### Individual test commands

These commands use the current checkout and its environment rather than an
isolated copy. Install application dependencies if not already present:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

Run unit suites:

```bash
npm --prefix backend test -- --runInBand
npm --prefix frontend test -- --watchAll=false --forceExit
```

#### Manual integration database

Create a separate, disposable database, replacing `postgres` with your database
user where necessary. Copy the template only if `.env.test` does not already exist:

```bash
createdb -h localhost -U postgres swimcenter_test
cp backend/.env.test.example backend/.env.test
```

Add an explicit connection URL to `backend/.env.test`, using your own credentials:

```dotenv
TEST_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/swimcenter_test
```

The database must already exist when using this URL. Keep the backend client
settings needed by the tested routes configured as described in the
[application setup](../README.md#configuration).

```bash
(cd backend && npm run db:test:setup && npm run test:integration -- --runInBand)
```

**Setup drops and recreates application tables, and suites modify fixture data.**
Never use the application or production database. Run serially when suites share
one database; the managed runner can run in parallel because it provides separate
worker databases.

Use `TEST_DATABASE_URL` explicitly rather than relying on `TEST_DB_*` alone.
The initializer also loads backend `.env` and can fall back to `DB_*`; integration
setup uses different defaults. More significantly, when `TEST_DATABASE_URL` is
absent, the database module can reload `DATABASE_URL` from `.env` after integration
setup removed it, selecting the application database instead. The explicit test
URL sets `DATABASE_URL` before that module loads and avoids this fallback.

Sources: [schema initializer](../backend/scripts/init-test-db.js),
[integration setup](../backend/tests/integration/setup.js) and
[database configuration](../backend/config/database.js).

| Setting | Current behavior |
|---------|------------------|
| `TEST_DATABASE_URL` | Recommended for manual runs; takes precedence in setup and integration tests. |
| `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_NAME` | Legacy discrete settings; integration defaults are `localhost`, `5432`, `postgres`, `postgres`, `swimcenter_test`. Do not rely on these alone with a populated backend `.env`. |
| `TEST_DATABASE_URL_1`, `TEST_DATABASE_URL_2` | Worker-specific URLs supplied by the managed runner; selected using `JEST_WORKER_ID`. |

Diagnose the configured test database with `npm --prefix backend run db:check`.
This diagnostic uses test settings, not the application's `DATABASE_URL`.

#### Browser smoke tests

Start the frontend on port 3000, or set `FRONTEND_URL` to its running URL, then:

```bash
npm --prefix tests/e2e ci
(cd tests/e2e && npx playwright install chromium)
npm --prefix tests/e2e test
```

The standalone config does not start servers. It uses Chromium, two workers,
HTML reporting and two retries when `CI=true` (zero otherwise). The managed
runner starts both backend and production frontend preview and sets retries to
zero. The current checks remain browser smoke tests in either execution mode.

Root shortcuts `npm test` / `npm run test:full` chain unit, integration and browser
tests; `test:unit`, `test:integration` and `test:e2e` select groups. They require
manual prerequisites and do not allocate worker databases or start servers.
Use the explicit serial integration command above when sharing one test database,
or `ci:local` for the managed full run.

## Coverage and Recorded Measurements

For a new unit coverage report:

```bash
npm --prefix backend run test:coverage -- --runInBand
npm --prefix frontend run test:coverage -- --watchAll=false --forceExit
```

Backend unit coverage collects `routes/**/*.js` and `utils/validations.js`;
it does not include all backend source. A passing test suite is not evidence of
full coverage. The frontend and integration commands use `--forceExit`; successful
completion does not prove there are no open handles.

On **30 September 2026**, an isolated local run passed all 165 tests. Its combined
backend unit/integration line coverage was **21.83%**, using an expanded scope
including entrypoint, middleware, database and utilities. Frontend source line
coverage was **31.43%**; backend unit coverage under the narrower config was
**19.71%**. These percentages have different denominators and are historical,
not current measurements after the Vite/Jest migration.

See [the measurement report](local-measurements.md) for exact scopes, raw results
and rerun instructions. Performance and coverage measurements are separate from
daily CI checks.

## CI Workflow and Runner Operations

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pushes to `main`,
PRs targeting `main` and manual dispatches. The repository owner must be the actor;
PRs must originate in the same repository. Native jobs from fork PRs and Dependabot
are skipped by this policy.

The workflow targets two repository-specific services, `swimcenter-ci-1` and
`swimcenter-ci-2`, labeled `swimcenter-ci`. Jobs run directly on macOS ARM64 with
Node 24; Docker is not used. Audit/build runs first, followed by two parallel test
shards, for at most four test workers across the two runners. The final `CI` job
requires both audit/build and all shards to succeed. Jobs queue while services
are offline; the runner host must be awake and its user services available.

As recorded on **16 October 2026**, main `75b1ca2` passed the
[native workflow](https://github.com/BerkAkidil9/SwimmingPoolManagementSystem/actions/runs/38784680714)
and [CodeQL](https://github.com/BerkAkidil9/SwimmingPoolManagementSystem/actions/runs/38784702601).
All five lockfile audits reported zero vulnerabilities in that native run; this
is a dated result, not a guarantee about future advisories.

### Reports and cache

Logs, stage summaries and test JSON/browser reports stay on the runner under
`$RUNNER_WORKSPACE/swimcenter-ci-reports/<run>/<attempt>/<job-shard>/`; they are
not uploaded as GitHub artifacts. Local runs use the system temporary directory.
`CI_REPORT_DIR` overrides the report base. Each `summary.json` records job, shard,
Node version, runner and stage results; GitHub runs also set the source commit.

Downloads are cached in `$RUNNER_TOOL_CACHE/swimcenter-ci-cache/`, outside the
job temporary directory. Local runs use the system temporary directory for the
same cache. An empty cache requires downloading npm packages and Chromium again.

### Runner installation and operations

The installer requires macOS ARM64, Python 3.12+, `gh`, `curl`, and a GitHub
session with repository administration permission. Run as the logged-in user,
without `sudo`:

```bash
python3 tooling/ci/install-runners.py
```

It verifies the official archive checksum, installs the two runners under
`~/.github-runners/swimcenter-ci-{1,2}` and starts their LaunchAgent services.
It checks existing matching registrations and preserves other runner installations.
A new registration adds `CODEQL_THREADS=2` to the service environment.

Check services and GitHub settings:

```bash
(cd "$HOME/.github-runners/swimcenter-ci-1" && ./svc.sh status)
(cd "$HOME/.github-runners/swimcenter-ci-2" && ./svc.sh status)
gh api repos/BerkAkidil9/SwimmingPoolManagementSystem/actions/runners \
  --jq '.runners[] | {name, status, busy, labels: [.labels[].name]}'
gh api repos/BerkAkidil9/SwimmingPoolManagementSystem/code-scanning/default-setup \
  --jq '{state, runner_type, runner_label}'
```

CodeQL default setup is configured separately in GitHub with `runner_type=labeled`
and `runner_label=swimcenter-ci`. Its analysis uses `CODEQL_THREADS=2` from the
service environment. The installer does not select the CodeQL runner label, and
CodeQL is separate from the native workflow's final `CI` status.
