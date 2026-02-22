# Test Documentation

Module-based test structure with full coverage.

## Test Summary

| Type | Test Count | Requirement |
|------|------------|-------------|
| Backend unit | 51 | - |
| Frontend unit | 71 | - |
| Integration | 29 | PostgreSQL (port 5432) |
| E2E | 13 | Frontend localhost:3000 |
| **Total** | **164** | |

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
