# Cloudflare R2 Setup

Guide for setting up Cloudflare R2 object storage for file uploads (ID cards, profile photos, health reports).

## Overview

The project supports two storage modes:
- **Local disk** (`backend/uploads/`) – default for development, no setup needed
- **Cloudflare R2** – recommended for production (Render, etc.)

R2 can be accessed in two ways:
- **Worker proxy** (recommended for Render) – bypasses TLS issues. See [cloudflare-worker.md](cloudflare-worker.md)
- **Direct S3 API** – works for local development

Set `USE_R2=true` in your `.env` to enable R2 storage.

## Option A: Worker Proxy (Render / Production)

This is the recommended approach for Render deployment because Render has TLS handshake issues with direct R2 connections.

1. Set up the Cloudflare Worker – see [cloudflare-worker.md](cloudflare-worker.md)
2. Add to backend `.env`:
   ```
   USE_R2=true
   R2_WORKER_URL=https://swimcenter-r2-upload.xxx.workers.dev
   R2_WORKER_SECRET=<your-worker-secret>
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   ```

## Option B: Direct S3 API (Local Development)

For local development without the Worker proxy:

### 1. Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **R2 Object Storage** → **Create bucket**
3. Name: `swimcenter-uploads`
4. Choose a location (Auto is fine)

### 2. Create API Token

1. Go to **R2 Object Storage** → **Manage R2 API Tokens**
2. Create a token with **Object Read & Write** permissions for `swimcenter-uploads`
3. Copy the **Access Key ID** and **Secret Access Key**

### 3. Enable Public Access

1. Go to your bucket → **Settings** → **Public access**
2. Enable **r2.dev subdomain** (gives you a public URL like `https://pub-xxx.r2.dev`)

### 4. Update Environment Variables

Add to `backend/.env`:
```
USE_R2=true
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<from step 2>
R2_SECRET_ACCESS_KEY=<from step 2>
R2_BUCKET_NAME=swimcenter-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

## Verifying

After setup, file uploads (registration ID card, profile photo, health reports) will be stored in R2 instead of `backend/uploads/`. Uploaded file URLs will use the `R2_PUBLIC_URL` prefix.
