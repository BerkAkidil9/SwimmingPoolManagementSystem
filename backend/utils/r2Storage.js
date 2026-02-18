const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'swimcenter-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client = null;

function getS3Client() {
  if (!s3Client && R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

async function uploadToR2(buffer, key, contentType) {
  const client = getS3Client();
  if (!client || !R2_PUBLIC_URL) {
    throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.');
  }
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadToR2 };
