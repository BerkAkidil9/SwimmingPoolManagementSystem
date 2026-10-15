# Cloudflare R2 Setup

Reviewed **16 October 2026**. The application stores three file categories:
identity documents, profile photos and health reports. Configuration is read by
the backend; storage secrets are never frontend build variables.

## Storage selection

| Mode | Configuration | Stored paths / requirements |
|------|---------------|-----------------------------|
| Local disk | `USE_R2` absent or not exactly `true` | Files under `backend/uploads/`; authenticated backend `/uploads/*` middleware serves them. |
| R2 through Worker | `USE_R2=true` and both `R2_WORKER_URL` + `R2_WORKER_SECRET` | Backend sends bytes to the Worker; Worker uses its `BUCKET` binding. |
| Direct R2 | `USE_R2=true` without the complete Worker pair | Backend signs S3-compatible requests using R2 API credentials. |

[`r2Storage.js`](../backend/utils/r2Storage.js) returns uploaded URLs using
`R2_PUBLIC_URL` plus the object key. Changing this base URL does not rewrite
URLs already stored in the database.

Local disk is suitable for development. The Render blueprint enables R2 and
requires its settings to be completed. Free Render web-service disk contents
are not retained across restarts or deployments; see [Render's limitations](https://render.com/docs/free).

## 1. Create a bucket

In [Cloudflare Dashboard](https://dash.cloudflare.com/), open **R2 Object Storage**
and create `swimcenter-uploads` (or use your own name). Keep the bucket name
consistent with either the Worker binding or direct backend configuration.

## 2A. Upload through the Worker

Follow the [Worker deployment guide](cloudflare-worker.md). Set in `backend/.env`
or the Render backend Environment:

```dotenv
USE_R2=true
R2_WORKER_URL=https://YOUR-WORKER.workers.dev
R2_WORKER_SECRET=your-shared-secret
R2_PUBLIC_URL=https://YOUR-WORKER.workers.dev
```

The Worker and backend must share the same secret. This path does not require
backend S3 access keys; the Worker accesses R2 through its bucket binding. It
also provides an alternative when a deployment has direct R2 connectivity issues.
Configure both Worker variables: a partial pair falls back to direct uploads
and therefore requires direct R2 credentials.
The file-serving URL may instead point to a deliberately public bucket domain;
review the access limitations below before doing so.

## 2B. Upload directly through the S3-compatible API

Create an R2 API token scoped to the bucket with object read/write permissions.
Copy the account ID, access key ID and secret access key into the backend:

```dotenv
USE_R2=true
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=swimcenter-uploads
R2_PUBLIC_URL=https://YOUR-FILE-SERVING-HOST
```

Remove the Worker URL/secret pair if intentionally selecting direct uploads.
Direct uploads can be used wherever the deployment can reach the R2 API;
they are not restricted to local development. A separate serving path is still
needed for the URLs returned to the application.

Restart the backend after storage environment changes; the helper reads these
settings when its module loads. On Render, apply the changes through the backend
service's Environment settings and redeploy/restart that service.

## File access limitations

Backend local-disk serving checks the application session, role and ownership.
A direct public R2 URL bypasses that middleware. Enabling a bucket's public URL
makes its objects publicly accessible; a custom domain also serves public
objects unless another authorization layer is implemented. Cloudflare's
`r2.dev` endpoint is intended for development, not production. See [public bucket behavior](https://developers.cloudflare.com/r2/buckets/public-buckets/).

The current Worker GET handler checks Origin/Referer prefixes or a shared secret.
It does not validate application sessions or document ownership; these headers
are not a user authentication mechanism. Pointing `R2_PUBLIC_URL` at the Worker
does not provide per-user authorization. Private identity and health documents
need a serving layer that enforces the application's access rules; the current
Worker must not be described as providing that guarantee.

## Verification

Use synthetic development documents. Check that the uploaded object appears
under `id_cards/`, `profile_photos/` or `health_reports/`, and that the returned
URL uses the expected serving base. With the Worker, a plain GET without an
accepted header returns 403; that alone does not verify user authorization.
Native CI disables R2 and does not perform live storage uploads or reads.
