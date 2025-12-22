const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Controlliamo che tutte le variabili d'ambiente necessarie siano presenti
if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  // In un ambiente di produzione, potremmo voler lanciare un errore più severo
  // o avere un sistema di alerting. Per ora, un console.log è sufficiente.
  console.error("Errore: mancano le credenziali per Cloudflare R2. Assicurati che R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, e R2_SECRET_ACCESS_KEY siano definite nel file .env o nelle variabili d'ambiente del server.");
}

// Creiamo l'endpoint specifico per Cloudflare R2
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Configuriamo il client S3 per puntare a Cloudflare R2
const s3Client = new S3Client({
  region: 'auto', // La regione è gestita automaticamente da Cloudflare
  endpoint: endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

console.log("Client S3 per Cloudflare R2 configurato.");

module.exports = s3Client;
