const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

function getSslConfig() {
  const override = String(process.env.PGSSL || '').trim().toLowerCase();
  if (override === 'false' || override === '0' || override === 'off') return false;
  if (override === 'true' || override === '1' || override === 'on') return { rejectUnauthorized: false };

  if (process.env.NODE_ENV === 'production') return { rejectUnauthorized: false };

  const s = String(connectionString || '').toLowerCase();
  if (!s) return false;
  if (s.includes('localhost') || s.includes('127.0.0.1')) return false;
  return { rejectUnauthorized: false };
}

let pool = null;

function ensurePool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL mancante: configura la variabile su Render.');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  });
  return pool;
}

module.exports = {
  query: (text, params) => ensurePool().query(text, params),
  connect: () => ensurePool().connect(),
};
