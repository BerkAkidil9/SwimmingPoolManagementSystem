# Swim Center R2 Upload Worker

Proxy Worker for uploading files from Render/Heroku to Cloudflare R2. Bypasses TLS handshake issues on some platforms. Also supports GET (file read) as proxy when r2.dev is blocked in certain regions.

## Setup

### 1. Create R2 bucket in Cloudflare (if needed)
```bash
npx wrangler r2 bucket create swimcenter-uploads
```

### 2. Check bucket name in wrangler.toml
`bucket_name` must match your R2 bucket (default: `swimcenter-uploads`).

### 3. Add secret to Worker
Generate a strong random string (e.g. `openssl rand -hex 32`):
```bash
npx wrangler secret put R2_WORKER_SECRET
```
Add the same value to backend `.env` and Render as `R2_WORKER_SECRET`.

### 4. Deploy
```bash
cd cloudflare-worker
npx wrangler deploy
```
You will get the Worker URL (e.g. `https://swimcenter-r2-upload.xxx.workers.dev`).

### 5. Backend environment variables
Add to Render / backend `.env`:
```
R2_WORKER_URL=https://swimcenter-r2-upload.xxx.workers.dev
R2_WORKER_SECRET=<secret from step 3>
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # Your R2 public bucket URL
USE_R2=true
```

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` are **not required for Render** when using the Worker (keep for local dev if using direct R2).
