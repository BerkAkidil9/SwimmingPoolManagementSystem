# Swim Center R2 Upload Worker

Render/Heroku gibi platformlardan Cloudflare R2'ye dosya yükleme için proxy Worker.
TLS handshake sorununu bypass eder.

## Kurulum

### 1. Cloudflare hesabında R2 bucket oluşturun (yoksa)
```bash
npx wrangler r2 bucket create swimcenter-uploads
```

### 2. wrangler.toml'da bucket adını kontrol edin
`bucket_name` sizin R2 bucket adınızla aynı olmalı.

### 3. Worker'a secret ekleyin
Güçlü bir rastgele string oluşturun (ör: `openssl rand -hex 32`):
```bash
npx wrangler secret put R2_WORKER_SECRET
```
Bu değeri aynen backend `.env` ve Render'a `R2_WORKER_SECRET` olarak ekleyeceksiniz.

### 4. Deploy
```bash
npx wrangler deploy
```
Worker URL'i alacaksınız (ör: `https://swimcenter-r2-upload.xxx.workers.dev`).

### 5. Backend ortam değişkenleri
Render / .env içine ekleyin:
```
R2_WORKER_URL=https://swimcenter-r2-upload.xxx.workers.dev
R2_WORKER_SECRET=<yukarıda oluşturduğunuz secret>
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # R2 public bucket URL'iniz
USE_R2=true
```

R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY artık **Render için gerekli değil** (lokal geliştirme için kalabilir).
