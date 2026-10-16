# API Reference

Backend route reference, reviewed **16 October 2026** against main `75b1ca2`.
The mounted routers and public app route define **82 method/path pairs**,
including aliases and one retired endpoint returning 410. The local file-serving
middleware and standalone Cloudflare Worker are described separately below.

**Base URL:** `http://localhost:3001` (development) or your Render backend URL (production).

Authenticated endpoints use a session cookie, not a bearer-token API. Send
`credentials: 'include'` with fetch or `withCredentials: true` with Axios.
Use the configured frontend origin for browser requests. Role names are `user`
(member), `admin`, `doctor`, `staff` and `coach`; a role-specific endpoint requires
its named role, not automatically every privileged role.

JSON endpoints expect `Content-Type: application/json`. Uploads use
`multipart/form-data`; let the browser set its boundary when sending `FormData`.
The tables below cover the mounted endpoints and key request fields. They are
not a complete OpenAPI schema; the linked handlers define full response objects
and route-specific validation.

## Common Requests

These JSON field names are read by the main workflow handlers:

| Request | Body fields / behavior |
|---------|------------------------|
| `POST /auth/login` | `email`, `password`; returns `isAuthenticated` and `user` and sets the session cookie. |
| `POST /auth/check-email`, `POST /auth/check-phone` | `email` or `phone`, respectively. |
| `POST /auth/verify-email` | `token`; the path-token alias is also supported. |
| `POST /auth/reset-password-request` | `email`; a successful response does not establish that the address has an account. |
| `POST /auth/validate-reset-token` | `token`. |
| `POST /auth/reset-password` | `token`, `password`; password strength and token expiry are checked. |
| `POST /api/payment/create-payment-intent` | `type`; the application's package types are `education` and `free_swimming`. Returns `clientSecret` and `customerId`. |
| `POST /api/payment/payment-success` | `paymentIntentId`, `packageType`; optional `saveCard`, `paymentMethodId`. Retrieves the payment from Stripe before creating records. |
| `POST /api/member/reservations` | `sessionId`; requires health approval, an eligible active package and an available session. |
| `POST /api/member/check-in` | `reservationId`; the reservation must belong to the session user. |
| `PUT /api/doctor/health-status/:userId` | `status` (`approved`, `needs_report`, `rejected`) and non-empty `reason`, including for approval. |
| `POST /api/staff/verify-qr-code` | `qrData`: a JSON-encoded **string** containing reservation `id` and `checkInCode`, not a nested object. |
| `PUT /api/coach/members/:userId/swimming-status` | `swimming_ability`: `yes` or `no`, case-insensitive. |

Registration uses multipart fields and the rules in
[`backend/utils/validations.js`](../backend/utils/validations.js), including personal/health
details, emergency contact, health-question answers and consent. File field names
and per-file limits are listed under [uploads](#upload-fields-and-limits).

Password login rejects unverified email, pending registration review, three
verification rejections and rejected health assessments. Member authentication
does not grant a staff, doctor, coach or admin role. Reservation cancellation is
blocked less than three hours before the session; successful cancellation restores
the package session allowance.

---

## Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Email/password login (rate limited: 10/15min) |
| POST | `/auth/register` | No | Multi-step registration with file uploads (rate limited: 5/hour) |
| POST | `/auth/check-email` | No | Check email uniqueness (shared email/phone limit: 5/15min) |
| POST | `/auth/check-phone` | No | Check phone uniqueness (shared email/phone limit: 5/15min) |
| GET | `/auth/google` | No | Start Google OAuth flow; optional `returnTo` for a report-upload page |
| GET | `/auth/google/callback` | No | Google OAuth callback (redirects to frontend) |
| GET | `/auth/verify-email` | No | Verify email token (query param) |
| POST | `/auth/verify-email` | No | Verify email token (body) |
| POST | `/auth/verify-email/:token` | No | Verify email token (path param) |
| GET | `/auth/check-auth` | No | Check session status and user info |
| GET | `/auth/check-verification` | Yes | Check email verification status |
| POST | `/auth/resend-verification` | Yes | Resend verification email |
| POST | `/auth/clear-session` | No | Logout (clear session) |
| POST | `/auth/clear-all-session` | Yes | Logout and clear all cookies |
| POST | `/auth/upload-id-card` | Yes | Upload ID card PDF (`idCard`) |
| POST | `/auth/upload-profile-photo` | Yes | Upload profile photo |
| POST | `/auth/reset-password-request` | No | Request password reset email (rate limited: 5/15min) |
| GET | `/auth/reset-password/:token` | No | Validate password reset token (rate limited: 10/15min) |
| POST | `/auth/validate-reset-token` | No | Validate reset token (rate limited: 10/15min) |
| POST | `/auth/reset-password` | No | Submit new password (rate limited: 10/15min) |
| POST | `/auth/verify-social-email` | Temporary Google session | Verify social registration email |
| GET | `/auth/social-registration-data` | No | Get social registration session data |

When login starts from a report link, the frontend preserves its upload path
in the login page's `returnTo` query parameter. Password login returns there
after success. Google login passes the validated path to `/auth/google`, stores
it in the session and consumes it on callback; only the report-upload routes
and their numeric recipient IDs are accepted. Normal login destinations apply
when no valid report path is supplied. Returning to a report never bypasses
account restrictions or upload authorization.

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
| POST | `/api/member/packages` | Yes | Create a package directly from `type`; this handler does not verify a Stripe payment |
| GET | `/api/member/reservations` | Yes | List reservations |
| GET | `/api/member/pools/:poolId/sessions` | Yes | List sessions for a pool |
| GET | `/api/member/sessions` | Yes | List session records with calculated capacity; not filtered to available future sessions |
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

Health-report uploads require the signed-in user's current `health_status` to
be `needs_report`; otherwise the endpoint returns 403. `health_status_reason`
is explanatory text and does not grant upload permission. A successful upload
saves the report for that user and changes the status to `pending` for review.
The optional multipart field `expectedUserId` checks that the browser is still
signed in to the account shown on the upload form; a mismatch returns 409.
It never selects or authorizes another user's account. Email links include the
recipient ID, which the upload page compares with `/api/member/user/me` before
showing the form.

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

The browser payment flow uses Payment Intent creation and `payment-success`.
The separate member `packages` route inserts package records without calling
Stripe and must not be documented as payment-verified.

---

## Doctor (`/api/doctor`)

Active endpoints require the `doctor` role. The retired upload endpoint is
unauthenticated but always returns HTTP 410 without accepting a document.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctor/health-reviews` | List users awaiting health review |
| PUT | `/api/doctor/health-status/:userId` | Approve, reject, or request health report |
| POST | `/api/doctor/upload-health-report-doctor/:userId` | Upload health report for a user |
| POST | `/api/doctor/upload-health-report/:userId` | Retired: HTTP 410; members must log in and use `/api/member/upload-health-report` |
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

For local disk: admins can access files; doctors can access health reports;
other access requires file ownership. `?download=true` requests attachment
download. This middleware does not authorize direct R2 or Worker URLs.

## Upload Fields and Limits

| Routes | Multipart field(s) | Per-file limit / accepted types |
|--------|--------------------|---------------------------------|
| `/auth/register`, `/api/member/resubmit-verification` | `idCard`, `profilePhoto` | 5 MiB; ID card PDF, profile JPEG/PNG/GIF/WebP |
| `/auth/upload-id-card`, `/api/member/upload-id-card` | `idCard` | 5 MiB; PDF |
| `/auth/upload-profile-photo`, `/api/member/upload-profile-photo` | `profilePhoto` | 5 MiB; JPEG/PNG/GIF/WebP |
| `/api/member/upload-health-report`, `/api/doctor/upload-health-report-doctor/:userId` | `report` | 10 MiB; PDF/JPEG/PNG |

The source applies MIME/extension checks; these are not malware scanning or
content authenticity guarantees. General JSON/urlencoded request bodies are
limited to 10 MiB.

## Error Handling

Handlers do not use one uniform error schema. Read the HTTP status and available
`error`, `message` or registration `errors` fields. Common cases include:

| Status | Examples in the current implementation |
|--------|----------------------------------------|
| 400 | Missing fields, invalid token, business-rule rejection or Multer upload-limit error. |
| 401 | Missing session on authenticated routes or invalid login credentials. |
| 403 | Role/file-access denial or account eligibility blocking login. Central role guards also return this when no user is present. |
| 404 | Requested user, reservation, report or file not found, where the handler distinguishes this case. |
| 410 | Retired unauthenticated doctor upload route. |
| 429 | An authentication/reset rate limit was exceeded; response body may be plain text. |
| 500 | Unhandled server, database or external-service error. Some upload type errors also reach the generic handler. |

Error codes and objects vary by endpoint; callers must not assume every rejection
has the same body or that every upload failure returns 400.

## Storage Worker and Source References

The standalone Worker is deployed separately from this API. Its POST endpoint
accepts raw bytes and shared-secret headers; GET uses Origin/Referer prefixes or
the shared secret. It does not validate application sessions or file ownership.
See [Worker protocol](cloudflare-worker.md#worker-protocol) and [R2 access limitations](r2-setup.md#file-access-limitations).

- [Router mounting and local file serving](../backend/index.js)
- [Login](../backend/routes/login.js) and [registration/auth flows](../backend/routes/register.js)
- [Admin](../backend/routes/admin.js), [member](../backend/routes/member.js), [payment](../backend/routes/payment.js)
- [Doctor](../backend/routes/doctor.js), [reminders](../backend/routes/reminders.js), [staff](../backend/routes/staff.js), [coach](../backend/routes/coach.js)
- [Role and session helpers](../backend/middleware/auth.js)
