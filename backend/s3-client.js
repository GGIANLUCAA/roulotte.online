const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

let s3Client = null;

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error("Errore: mancano le credenziali per Cloudflare R2. Assicurati che R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, e R2_SECRET_ACCESS_KEY siano definite nel file .env o nelle variabili d'ambiente del server.");
} else {
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log("Client S3 per Cloudflare R2 configurato.");
}

module.exports = s3Client;
