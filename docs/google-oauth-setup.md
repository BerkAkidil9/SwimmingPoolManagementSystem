# Google OAuth Setup

Reviewed **16 October 2026**. The backend uses Passport's Google OAuth strategy
for login and registration. The same client ID and secret are used by the
optional [Gmail sender](gmail-api-setup.md), which needs a separate mail scope
and local token-generation callback.

## 1. Create a project and consent configuration

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or
   create a project.
2. Open **Google Auth platform**. Configure **Branding** (app name, support email
   and developer contact), **Audience** and **Data Access**.
3. Choose an audience appropriate to the account: External for accounts outside
   a Workspace organization, or Internal for an eligible organization. If using
   Testing status, add the accounts that will authorize the app as test users.
4. Login requests the `profile` and `email` scopes. Sending email also requires
   enabling Gmail API and authorizing `gmail.send`; see the Gmail guide.

These console sections are described in Google's [consent configuration guide](https://developers.google.com/workspace/guides/configure-oauth-consent).

## 2. Create a web client

In **Google Auth platform → Clients**, create an OAuth client of type
**Web application**. Register the exact redirect URIs used by this project:

| Purpose | Authorized redirect URI |
|---------|-------------------------|
| Local login/registration | `http://localhost:3001/auth/google/callback` |
| Render login/registration | `https://YOUR-BACKEND.onrender.com/auth/google/callback` |
| Local Gmail token helper, if used | `http://localhost:3333/oauth2callback` |

Use the actual backend URL for production. The login callback belongs to the
backend, not the frontend. See Google's [client creation guide](https://developers.google.com/workspace/guides/create-credentials).

## 3. Configure backend variables

In `backend/.env` for development, or the backend service's **Environment** on
Render:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

Use the deployed API and frontend URLs on Render. The callback is
`{BACKEND_URL}/auth/google/callback`; omit a trailing slash from `BACKEND_URL`.
Restart the backend after changing its configuration.

The current backend initializes the Google strategy at startup: `GOOGLE_CLIENT_ID`
must be present even when testing password login manually. The matching secret
is needed to complete real OAuth authorization and for Gmail API use. Keep it
in the backend; frontend `REACT_APP_` variables are public build output.

## 4. Check the login flow

Start both application services and visit `/auth/google` on the backend, or
use the frontend's Google login button. A `redirect_uri_mismatch` error means
the registered URI and the backend's computed callback differ; compare scheme,
host, port and path exactly. The browser smoke suite checks navigation, not a
completed Google login with a real account.
