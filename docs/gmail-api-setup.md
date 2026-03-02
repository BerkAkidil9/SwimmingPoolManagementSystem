# Gmail API Setup

Guide for setting up Gmail API email sending with OAuth 2.0 refresh token.

## Prerequisites

- A Google account (Gmail)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured in `backend/.env` – see [google-oauth-setup.md](google-oauth-setup.md) if you need to create these (same credentials are used for Google OAuth login)

## Steps

### 1. Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the same one used for Google OAuth login)
3. Navigate to **APIs & Services** → **Library**
4. Search for **Gmail API** and click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Under **Scopes**, add: `https://www.googleapis.com/auth/gmail.send`
3. Save changes

### 3. Add Redirect URI

1. Go to **APIs & Services** → **Credentials**
2. Click your **OAuth 2.0 Client ID**
3. Under **Authorized redirect URIs**, add: `http://localhost:3333/oauth2callback`
4. Save

### 4. Generate Refresh Token

Run the token generator script:

```bash
cd backend
npm run gmail:token
```

This will:
1. Open your browser automatically
2. Ask you to sign in with your Gmail account
3. Request permission to send emails
4. Display the refresh token in the terminal

### 5. Update Environment Variables

Add the output to your `backend/.env`:

```
GMAIL_USER=your@gmail.com
GMAIL_REFRESH_TOKEN=<token from step 4>
```

For Render deployment, add both variables in the backend service Environment settings.

## Email Priority

The backend tries email providers in this order:
1. **Gmail API** (`GMAIL_USER` + `GMAIL_REFRESH_TOKEN`) – recommended for Render
2. **Resend** (`RESEND_API_KEY` + `EMAIL_FROM`) – requires domain verification
3. **SMTP** (`EMAIL_USER` + `EMAIL_PASSWORD`) – local development fallback only (blocked on Render)
