# Swim Center R2 Worker

Reviewed **16 October 2026**. The Worker provides upload and read access to the
R2 bucket through Cloudflare's `BUCKET` binding. It is an alternative to direct
S3-compatible uploads, including when direct connectivity is problematic.
See [storage selection and access limitations](r2-setup.md).

## Deploy

Prerequisites: Node.js 24/npm and a Cloudflare account with access to Workers
and the R2 bucket. `npx` may download Wrangler on first use.

Run Wrangler commands from the Worker directory, after authenticating to the
Cloudflare account containing the bucket:

```bash
cd cloudflare-worker
npx wrangler login
# Only if the bucket does not already exist:
npx wrangler r2 bucket create swimcenter-uploads
```

Check [`wrangler.toml`](../cloudflare-worker/wrangler.toml): its R2 binding must
be named `BUCKET`, and `bucket_name` must match the bucket you created.

Generate a random shared secret (for example, `openssl rand -hex 32`), then enter
it at Wrangler's prompt rather than putting it in a tracked file:

```bash
npx wrangler secret put R2_WORKER_SECRET
npx wrangler deploy
```

The secret command updates the deployed Worker immediately. See Cloudflare's
[secret configuration reference](https://developers.cloudflare.com/workers/configuration/secrets/)
for its deployment behavior. Keep the remaining commands in the Worker directory.

Copy the same secret to the backend Environment. Configure non-secret origin
settings in the deployed Worker's variables or an appropriate Wrangler `[vars]`
section, then redeploy as needed:

| Worker setting | Current code behavior |
|----------------|-----------------------|
| `R2_WORKER_SECRET` | Shared backend/Worker secret for writes and server-side reads. |
| `ALLOWED_ORIGINS` | Comma-separated origin prefixes for GET checks. Defaults include the project's Render URLs and localhost ports 3000/3001. |
| `ALLOWED_ORIGIN` | Singular setting used for OPTIONS preflight's allowed origin; defaults to `*`. This is separate from `ALLOWED_ORIGINS`. |

Set origins for the actual frontend/backend deployment. The current GET handler
uses prefix matching, not strict origin equality; it does not identify the
logged-in user.

## Backend settings

For development use `backend/.env`; for Render use the backend service Environment:

```dotenv
USE_R2=true
R2_WORKER_URL=https://YOUR-WORKER.workers.dev
R2_WORKER_SECRET=your-shared-secret
R2_PUBLIC_URL=https://YOUR-WORKER.workers.dev
```

`R2_PUBLIC_URL` is the base used for URLs saved by the backend; it is not derived
automatically from `R2_WORKER_URL`. A public bucket URL can also be configured,
but that exposes a separate access path. Backend `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are unnecessary for Worker uploads.

## Worker protocol

| Request | Requirements / response |
|---------|-------------------------|
| `OPTIONS` | Preflight response, HTTP 204. |
| `POST /` | Raw bytes, `X-Auth-Secret`, `X-R2-Key`; optional `X-Content-Type`. Returns `{ "ok": true, "key": "..." }` on success. |
| `GET /<object-key>` | Allowed Origin/Referer prefix or matching `X-Auth-Secret`; returns the object or 404. |

Writes accept `id_cards/`, `profile_photos/` and `health_reports/` key prefixes,
restricted characters, no `..`, and at most 500 characters. Invalid/missing keys
return 400; missing/incorrect authorization returns 403. Other methods, including
GET on `/`, return 405. See [the handler](../cloudflare-worker/src/index.js).

For a 403 on upload, check that the backend and deployed Worker have the same
non-empty secret. A 403 on GET means neither an accepted origin/referrer nor
the shared secret was supplied. A bare address-bar request may therefore fail
even after a successful upload. Server-side reads can use `X-Auth-Secret`;
browser code must not receive it. A 404 means the requested object key was not
found in the bound bucket.

## Access boundary

Keep `R2_WORKER_SECRET` on the backend and Worker. Do not send it to browser code.
The current GET checks do not enforce application sessions, roles or file
ownership. Origin/Referer headers can be supplied by non-browser clients;
CORS restrictions do not turn this into private document storage. The backend's
protected `/uploads/*` middleware does not protect Worker or public R2 URLs.
Native CI does not exercise live Worker/R2 requests.
