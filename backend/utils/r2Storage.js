/**
 * R2 upload - aws4fetch kullanır (fetch tabanlı).
 * Render + Cloudflare R2 TLS handshake hatası: Node'un native fetch'i (undici) farklı
 * TLS stack kullanır, NodeHttpHandler'dan daha uyumlu olabilir.
 */
const { AwsClient } = require("aws4fetch");

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

async function uploadToR2(buffer, key, contentType) {
  const client = getAwsClient();
  if (!client || !R2_PUBLIC_URL) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL."
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
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return `${R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadToR2 };
