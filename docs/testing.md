# Test Documentation

Module-based test structure. Coverage is measured separately; passing tests do not imply full coverage.

## Test Summary

| Type | Test Count | Requirement |
|------|------------|-------------|
| Backend unit | 52 | - |
| Frontend unit | 71 | - |
| Integration | 29 | PostgreSQL (port 5432) |
| E2E | 13 | Frontend localhost:3000 |
| **Total** | **165** | |

## Folder Structure

- **backend/tests/** - Backend unit + integration
  - unit/auth, unit/admin (pools, verifications, sessions, feedback), unit/member, unit/doctor, unit/staff, unit/coach
  - unit/middleware (auth.js: isAdmin, isDoctor), unit/payment, unit/reminders, unit/landingPage, unit/utils
  - integration/auth (login, register), integration/member, integration/admin, integration/doctor, integration/staff
  - integration/payment, integration/reminders, integration/landingPage (swimcenter_test PostgreSQL DB)
- **frontend/src/__tests__/** - Frontend unit
  - auth/ (Login, ForgotPassword, ResetPassword, SocialLogin)
  - register/ (MultiStepForm, PersonalInfoStep, HealthInfoStep, EmergencyContactStep, HealthQuestionsStep, TermsStep, ProgressBar)
  - verify/ (EmailVerification)
  - dashboard/ (AdminDashboard, MemberDashboard, DoctorDashboard, CoachDashboard)
  - admin/ (SessionManagement, PoolManagement, VerificationQueue, FeedbackManagement, MapPicker)
  - doctor/ (HealthReviewQueue, HealthReportReviews, HealthReportReminders)
  - components/ (LoadingSpinner, ProtectedRoute, StaffVerification, VerifyResult, HealthReportUpload, Navbar, CheckInPage, StripeCheckout, PaymentMethods, TransactionHistory, PackagePurchase, ReservationDetails)
  - pages/ (LandingPage, EducationPackage, FreeSwimmingPackage, HomePage, Dashboard, Billing, EditProfile)
  - Pools test: frontend/src/pages/Pools/Pools.test.jsx (mocks poolsApi)
  - utils/ (validations, formatters, dateUtils)
  - static/ (Terms, PrivacyPolicy)
  - App.test.js
- **tests/e2e/** - E2E (Playwright)
  - auth/ (login, register, forgotPassword, socialLogin)
  - member/ (checkIn, reservation, billing)
  - admin/ (poolManagement, verificationQueue, sessionManagement)
  - doctor/ (healthReviewFlow)
  - staff/ (qrVerification)

## Running Tests

### Native macOS CI

GitHub Actions schedules CI on this MacBook's two repository-specific services,
`swimcenter-ci-1` and `swimcenter-ci-2`, with the `swimcenter-ci` label. Jobs use
Node.js 24 directly on macOS ARM64. Docker is not required.

The audit/build job checks all five npm lockfiles, including development packages.
Then two test shards run in parallel. Each shard runs Jest and Playwright with
exactly two workers, for at most four test workers across this repository's two
runners. Other repositories have their own runner pools.

npm and Chromium downloads are cached in each runner's
`$RUNNER_TOOL_CACHE/swimcenter-ci-cache/`, outside the temporary directory that
GitHub clears between jobs. Local commands keep the same cache under the system
temporary directory.

CodeQL default setup is routed to the same `swimcenter-ci` runner label. The
runner service environment sets `CODEQL_THREADS=2` for its analysis threads.

Each job copies the source to a disposable directory, omits `.env` files, and uses
synthetic credentials. Each test shard starts its own loopback PostgreSQL cluster;
the two Jest integration workers have separate databases. API and preview ports
are allocated locally, so simultaneous jobs do not share ports or databases.
Application sockets and browser DNS are restricted to loopback during tests;
live payment, email, OAuth and R2 flows are outside these smoke tests.

Run the same checks locally:

```bash
npm run ci:quality          # All npm audits and the production build
npm run ci:test -- 1/2      # First shard, two workers
npm run ci:test -- 2/2      # Second shard, two workers
npm run ci:local            # Audit, build and the full test suite, two workers
```

GitHub runners keep logs and JSON/browser reports under
`$RUNNER_WORKSPACE/swimcenter-ci-reports/<run>/<attempt>/<job-shard>/`.
Local commands use the system temporary directory; `CI_REPORT_DIR` overrides the
report location. Reports record the source commit, runner, shard and result.
The final `CI` job fails if any audit/build or test shard fails.

Jobs require the repository owner as actor; pull requests must also originate
in the same repository. Fork PR code is excluded. To install or check the two native
runner services, run `python3 tooling/ci/install-runners.py` as the logged-in Mac
user with an administrator-authorized `gh` session. The installer verifies the
official runner archive checksum and preserves other repositories' runners.

### Individual test commands

**Local PostgreSQL** – For integration tests:
1. PostgreSQL must be installed: `winget install PostgreSQL.PostgreSQL.16` or `PostgreSQL.PostgreSQL.17`
2. Create `backend/.env.test` with your postgres password (copy from `.env.test.example`)
3. Start the service: Windows Services → postgresql-x64-16 or postgresql-x64-17

**From project root:**
```bash
npm test                  # All tests (unit + integration + e2e)
npm run test:unit         # Unit only (backend + frontend)
npm run test:integration  # Integration only (DB schema auto-created)
npm run test:e2e          # E2E only
npm run db:check          # PostgreSQL connection check
```

**Individually:**
```bash
cd backend && npm test                                    # Backend unit
cd frontend && npm test -- --watchAll=false --forceExit   # Frontend unit
cd backend && npm run db:test:setup && npm run test:integration   # Integration
cd tests/e2e && npm test   # Frontend must be running on localhost:3000
```

**E2E note:** Current E2E tests check page loading and auth redirects; backend is optional. For full-flow tests, backend (localhost:3001) should also be running.


## Recorded local measurements

On 30 September 2026, all 165 existing tests passed in an isolated local run: 52 backend unit, 71 frontend, 29 PostgreSQL integration, and 13 browser smoke tests. No application code or existing assertions were changed. The browser tests remain page/auth smoke checks, not completed business workflows.

Combined backend unit/integration line coverage was **21.83%** with entrypoint, middleware, database and utility files included; frontend source line coverage was **31.43%**. Backend unit coverage under the narrower existing config was **19.71%**. These scopes have different denominators and must not be compared as coverage improvements.

See [the measurement report](local-measurements.md) for environment, exact coverage scopes, build and browser findings, local load results, raw artifacts and rerun instructions. The tools live in [tests/measurements](../tests/measurements/). These results are a dated local baseline, not a production guarantee.
