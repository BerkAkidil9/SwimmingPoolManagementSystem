# Test Dokümantasyonu

Projenin modül bazlı test yapısı - tam kapsam.

## Klasör Yapısı

- **backend/tests/** - Backend unit + integration
  - unit/auth, unit/admin (pools, verifications, sessions, feedback), unit/member, unit/doctor, unit/staff, unit/coach
  - unit/middleware (auth: isAdmin, isDoctor), unit/payment, unit/reminders, unit/landingPage, unit/utils
  - integration/auth (login, register), integration/member, integration/admin, integration/doctor, integration/staff
  - integration/payment, integration/reminders, integration/landingPage (BitirmeProjesi_test DB)
- **backend/middleware/auth.js** - isAdmin, isDoctor
- **frontend/src/__tests__/** - Frontend unit
  - auth/ (Login, ForgotPassword, ResetPassword, SocialLogin)
  - register/ (MultiStepForm, PersonalInfoStep, HealthInfoStep, EmergencyContactStep, HealthQuestionsStep, TermsStep, ProgressBar)
  - verify/ (EmailVerification, VerifyResult)
  - dashboard/ (AdminDashboard, MemberDashboard, DoctorDashboard, CoachDashboard)
  - admin/ (SessionManagement, PoolManagement, VerificationQueue, FeedbackManagement, MapPicker)
  - doctor/ (HealthReviewQueue, HealthReportReviews, HealthReportReminders)
  - components/ (LoadingSpinner, ProtectedRoute, StaffVerification, VerifyResult, HealthReportUpload, Navbar, CheckInPage, StripeCheckout, PaymentMethods, TransactionHistory, PackagePurchase, ReservationDetails)
  - pages/ (LandingPage, EducationPackage, FreeSwimmingPackage, HomePage, Dashboard, Billing, EditProfile, Pools)
  - utils/ (validations, formatters, dateUtils)
  - static/ (Terms, PrivacyPolicy)
  - App.test.js
- **tests/e2e/** - E2E (Playwright)
  - auth/ (login, register, forgotPassword, socialLogin)
  - member/ (checkIn, reservation, billing)
  - admin/ (poolManagement, verificationQueue, sessionManagement)
  - doctor/ (healthReviewFlow)
  - staff/ (qrVerification)

## Test Çalıştırma

```bash
# Backend unit testleri (gerçek DB'yi etkilemez)
cd backend && npm test

# Backend integration testleri (BitirmeProjesi_test - gerçek DB'yi etkilemez)
cd backend
npm run db:test:setup   # İlk kez: BitirmeProjesi_test oluşturur
npm run test:integration  # 29 test

# Frontend
cd frontend && npm test

# E2E
cd tests/e2e && npm install && npm test
# Backend + frontend çalışıyor olmalı
```
