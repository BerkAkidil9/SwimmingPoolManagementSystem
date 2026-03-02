# Google OAuth Setup

Guide for setting up Google OAuth 2.0 credentials used for **Google login/registration** in Swim Center. The same credentials can also be used for [Gmail API](gmail-api-setup.md) email sending.

## Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a name (e.g. "Swim Center") and click **Create**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing with any Google account) or **Internal** (for Google Workspace only)
3. Fill in **App name**, **User support email**, and **Developer contact**
4. Click **Save and Continue**
5. Under **Scopes**, you can leave default or add scopes later (Gmail API needs `gmail.send` – see [gmail-api-setup.md](gmail-api-setup.md))
6. Add **Test users** if in Testing mode (your Gmail address)
7. Click **Save and Continue**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: e.g. "Swim Center Web Client"
5. Under **Authorized redirect URIs**, add:
   - **Local:** `http://localhost:3001/auth/google/callback`
   - **Production:** `https://YOUR-BACKEND.onrender.com/auth/google/callback` (replace with your Render backend URL)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 4. Add to Environment Variables

Add to `backend/.env`:

```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
BACKEND_URL=http://localhost:3001
```

For production (Render), set `BACKEND_URL` to your backend URL (e.g. `https://swimcenter-api.onrender.com`).

### 5. Production: Add Redirect URI

When deploying to Render, add your production callback URL in Google Cloud Console:

- **APIs & Services** → **Credentials** → your OAuth client
- Add: `https://YOUR-BACKEND.onrender.com/auth/google/callback`
- Save

## Summary

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | From OAuth client credentials |
| `GOOGLE_CLIENT_SECRET` | From OAuth client credentials |
| `BACKEND_URL` | Base URL of your backend (used to build callback URL) |

The callback URL is always: `{BACKEND_URL}/auth/google/callback`
