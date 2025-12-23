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

const pool = new Pool({
  connectionString,
  ssl: getSslConfig(),
});

pool.query = pool.query.bind(pool);

module.exports = pool;
