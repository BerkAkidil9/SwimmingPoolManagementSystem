/**
 * R2 upload - Render/Cloudflare TLS uyumsuzluğu için Worker proxy kullanır.
 * R2_WORKER_URL set ise → Worker üzerinden (Render'da çalışır)
 * Değilse → Doğrudan aws4fetch (lokal geliştirme)
 */
const { AwsClient } = require("aws4fetch");

const R2_WORKER_URL = process.env.R2_WORKER_URL?.replace(/\/$/, "");
const R2_WORKER_SECRET = process.env.R2_WORKER_SECRET;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "swimcenter-uploads";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let awsClient = null;

function getAwsClient() {
  if (
    !awsClient &&
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY
  ) {
    awsClient = new AwsClient({
      service: "s3",
      region: "auto",
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    });
  }
  return awsClient;
}

/**
 * Worker üzerinden R2'ye upload (Render, Railway vb. platformlar için)
 */
async function uploadViaWorker(buffer, key, contentType) {
  if (!R2_WORKER_URL || !R2_WORKER_SECRET || !R2_PUBLIC_URL) {
    throw new Error(
      "R2 Worker not configured. Set R2_WORKER_URL, R2_WORKER_SECRET, and R2_PUBLIC_URL."
    );
  }
  const response = await fetch(R2_WORKER_URL, {
    method: "POST",
    body: buffer,
    headers: {
      "X-Auth-Secret": R2_WORKER_SECRET,
      "X-R2-Key": key,
      "X-Content-Type": contentType || "application/octet-stream",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Worker: ${response.status}`);
  }
  if (!data.ok) {
    throw new Error(data.error || "Worker upload failed");
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Doğrudan R2'ye upload (lokal geliştirme - aws4fetch)
 */
async function uploadDirect(buffer, key, contentType) {
  const client = getAwsClient();
  if (!client || !R2_PUBLIC_URL) {
    throw new Error(
      "R2 direct not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL."
    );
  }
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
  const response = await client.fetch(url, {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed: ${response.status} - ${text}`);
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

async function uploadToR2(buffer, key, contentType) {
  if (R2_WORKER_URL && R2_WORKER_SECRET) {
    return uploadViaWorker(buffer, key, contentType);
  }
  return uploadDirect(buffer, key, contentType);
}

module.exports = { uploadToR2 };
