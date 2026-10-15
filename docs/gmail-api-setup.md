# Gmail API Setup

Reviewed **16 October 2026**. The backend can send verification, password-reset
and health-report messages through Gmail's HTTPS API using an OAuth refresh
token. This is separate from signing end users in with Google.

## Prerequisites

- A Gmail/Google account that will send the messages.
- Backend dependencies installed with `npm --prefix backend ci`, including the
  development dependency used by the token helper.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured in `backend/.env`.
  See [Google OAuth setup](google-oauth-setup.md).

## 1. Configure Google

1. In the same Google Cloud project, enable **Gmail API** under
   **APIs & Services → Library**.
2. Under **Google Auth platform → Data Access**, add
   `https://www.googleapis.com/auth/gmail.send`.
3. Under **Audience**, add the sending account as a test user if the app is in
   Testing status.
4. Under **Clients**, open the web application's OAuth client and add
   `http://localhost:3333/oauth2callback` as an authorized redirect URI.

This local callback is for token generation. The application login callback
remains `/auth/google/callback` on the backend. See Google's [consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent).

## 2. Generate a refresh token locally

From the repository root:

```bash
(cd backend && npm run gmail:token)
```

The helper opens a browser, requests offline access with the Gmail send scope,
listens on local port 3333 and prints the refresh token after consent. Sign in
as the sending account. This interactive operation is not part of CI.

If the port is in use, stop the conflicting local process before rerunning the
helper. Its printed `GMAIL_USER=your@gmail.com` line is a placeholder; replace it
with the account that granted consent. The refresh token and Google client
credentials must belong to the same OAuth client.

Store the token privately in `backend/.env`:

```dotenv
GMAIL_USER=your-sending-account@gmail.com
GMAIL_REFRESH_TOKEN=your-refresh-token
```

For Render, set both variables and the matching Google client ID/secret in the
**backend service Environment**, then redeploy/restart. Do not put the token
in Git, screenshots, frontend variables or CI logs. `EMAIL_FROM` can override
the sender header; it must be an address the sending account is authorized to use.

For External apps in **Testing** status, a Gmail-scoped refresh token expires
after seven days. For continuing use, review publishing/verification requirements
and issue a new token after the appropriate configuration changes. See Google's
[refresh-token expiration rules](https://developers.google.com/identity/protocols/oauth2/).

## Provider selection and troubleshooting

[`sendEmail.js`](../backend/utils/sendEmail.js) selects by configuration:

| Priority | Provider | Configuration |
|----------|----------|---------------|
| 1 | Gmail API | `GMAIL_USER`, `GMAIL_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 2 | Resend | `RESEND_API_KEY`; set an authorized `EMAIL_FROM` for your sender domain |
| 3 | Gmail SMTP through Nodemailer | `EMAIL_USER`, `EMAIL_PASSWORD`; set `EMAIL_FROM` as appropriate |

A Gmail or Resend delivery error is thrown; it does not automatically switch to
another provider. Remove/adjust higher-priority settings when deliberately
switching providers. An expired/revoked refresh token requires reauthorization
with the same client and sending account.

The blueprint uses Render's free web-service plan, which blocks SMTP ports
25, 465 and 587. Use Gmail API or Resend there. This restriction is specific to
the free plan; see [Render free-service limitations](https://render.com/docs/free).
Native CI uses synthetic settings and does not verify real email delivery.
