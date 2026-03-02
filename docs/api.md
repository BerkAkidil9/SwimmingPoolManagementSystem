# API Reference

Complete endpoint documentation for the Swim Center backend API.

**Base URL:** `http://localhost:3001` (development) or your Render backend URL (production).

All authenticated endpoints require a valid session cookie (`withCredentials: true`).

---

## Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Email/password login (rate limited: 10/15min) |
| POST | `/auth/register` | No | Multi-step registration with file uploads (rate limited: 5/hour) |
| POST | `/auth/check-email` | No | Check email uniqueness (rate limited: 5/15min) |
| POST | `/auth/check-phone` | No | Check phone uniqueness (rate limited: 5/15min) |
| GET | `/auth/google` | No | Start Google OAuth flow |
| GET | `/auth/google/callback` | No | Google OAuth callback (redirects to frontend) |
| GET | `/auth/verify-email` | No | Verify email token (query param) |
| POST | `/auth/verify-email` | No | Verify email token (body) |
| POST | `/auth/verify-email/:token` | No | Verify email token (path param) |
| GET | `/auth/check-auth` | No | Check session status and user info |
| GET | `/auth/check-verification` | No | Check email verification status |
| POST | `/auth/resend-verification` | No | Resend verification email |
| POST | `/auth/clear-session` | No | Logout (clear session) |
| POST | `/auth/clear-all-session` | Yes | Logout and clear all cookies |
| POST | `/auth/upload-id-card` | Yes | Upload ID card image |
| POST | `/auth/upload-profile-photo` | Yes | Upload profile photo |
| POST | `/auth/reset-password-request` | No | Request password reset email (rate limited: 5/15min) |
| GET | `/auth/reset-password/:token` | No | Validate password reset token (rate limited: 10/15min) |
| POST | `/auth/validate-reset-token` | No | Validate reset token (rate limited: 10/15min) |
| POST | `/auth/reset-password` | No | Submit new password (rate limited: 10/15min) |
| POST | `/auth/verify-social-email` | No | Verify social registration email |
| GET | `/auth/social-registration-data` | No | Get social registration session data |

---

## Admin (`/api/admin`)

All endpoints require `admin` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/pools` | List all pools |
| POST | `/api/admin/pools` | Create a new pool |
| PUT | `/api/admin/pools/:poolId` | Update pool details |
| DELETE | `/api/admin/pools/:poolId` | Delete a pool |
| GET | `/api/admin/verifications` | List pending user verifications |
| PUT | `/api/admin/verifications/:userId` | Approve or reject user verification |
| POST | `/api/admin/sessions` | Create a new session |
| GET | `/api/admin/sessions` | List all sessions |
| PUT | `/api/admin/sessions/:sessionId` | Update session details |
| DELETE | `/api/admin/sessions/:sessionId` | Delete a session |
| GET | `/api/admin/feedback` | List all feedback |
| PUT | `/api/admin/feedback/:id` | Update feedback status (new/read/archived) |

---

## Member (`/api/member`)

All endpoints require authentication unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/member/pools` | Yes | List pools with session counts |
| GET | `/api/member/user/me` | Yes | Get current user info |
| GET | `/api/member/package` | Yes | Get active package |
| POST | `/api/member/packages` | Yes | Purchase a package |
| GET | `/api/member/reservations` | Yes | List reservations |
| GET | `/api/member/pools/:poolId/sessions` | Yes | List sessions for a pool |
| GET | `/api/member/sessions` | Yes | List all available sessions |
| GET | `/api/member/pools/:poolId/sessions/count` | Yes | Session count by pool and type |
| POST | `/api/member/reservations` | Yes | Create a reservation |
| DELETE | `/api/member/reservations/:id` | Yes | Cancel a reservation |
| POST | `/api/member/feedback` | Yes | Submit feedback |
| GET | `/api/member/feedback` | Yes | List own feedback |
| GET | `/api/member/history` | Yes | Transaction history (packages + reservations) |
| GET | `/api/member/package-prices` | No | Get package prices |
| POST | `/api/member/resubmit-verification` | Yes | Resubmit verification (ID card + photo) |
| GET | `/api/member/verification-status` | Yes | Get verification status and reason |
| GET | `/api/member/profile` | Yes | Get full profile |
| POST | `/api/member/check-in` | Yes | Check in for reservation (generates QR) |
| POST | `/api/member/update-profile` | Yes | Update profile info |
| POST | `/api/member/update-health-info` | Yes | Update health info |
| GET | `/api/member/health-info` | Yes | Get health info |
| POST | `/api/member/upload-health-report` | Yes | Upload health report |
| POST | `/api/member/upload-id-card` | Yes | Upload ID card |
| POST | `/api/member/upload-profile-photo` | Yes | Upload profile photo |

---

## Payment (`/api/payment`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payment/create-payment-intent` | Yes | Create Stripe payment intent |
| POST | `/api/payment/payment-success` | Yes | Handle successful payment |
| GET | `/api/payment/payment-methods` | Yes | List saved payment methods |
| PUT | `/api/payment/payment-methods/:id/default` | Yes | Set default payment method |
| DELETE | `/api/payment/payment-methods/:id` | Yes | Delete a payment method |
| GET | `/api/payment/config` | No | Get Stripe publishable key |

---

## Doctor (`/api/doctor`)

All endpoints require `doctor` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctor/health-reviews` | List users awaiting health review |
| PUT | `/api/doctor/health-status/:userId` | Approve, reject, or request health report |
| POST | `/api/doctor/upload-health-report-doctor/:userId` | Upload health report for a user |
| GET | `/api/doctor/health-reports/:userId` | List health reports for a user |
| GET | `/api/doctor/health-reports/:reportId/download` | Download a health report file |
| PUT | `/api/doctor/health-reports/:reportId` | Update report status (approve/reject/invalid) |
| GET | `/api/doctor/users-with-reports` | List users with pending reports |
| GET | `/api/doctor/pending-health-report-reminders` | List pending reminders and history |

---

## Reminders (`/api/reminders`)

All endpoints require `doctor` or `admin` role.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reminders/send-health-report-reminders` | Send bulk health report reminders |
| POST | `/api/reminders/send-specific-reminders` | Send reminders to specific users |
| POST | `/api/reminders/send-invalid-document-notification` | Notify user of invalid document |

---

## Staff (`/api/staff`)

All endpoints require `staff` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/staff/dashboard` | Staff dashboard info |
| POST | `/api/staff/verify-qr-code` | Verify member QR code for check-in |

---

## Coach (`/api/coach`)

All endpoints require `coach` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/coach/members` | List approved members |
| PUT | `/api/coach/members/:userId/swimming-status` | Update member swimming ability |

---

## Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pools` | List all pools (public) |
| GET | `/api/pools` | List all pools (landing page) |

---

## File Serving

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/uploads/*` | Yes | Serve uploaded files (role-based access control) |
