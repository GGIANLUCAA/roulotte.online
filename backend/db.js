const { Pool } = require('pg');
require('dotenv').config();
const dns = require('node:dns').promises;

async function normalizeDatabaseUrl(raw) {
  const input = String(raw || '').trim();
  if (!input) return '';
  try {
    const u = new URL(input);
    const host = String(u.hostname || '').trim();
    const hasDot = host.includes('.');
    const looksLikeRenderInternal = !hasDot && /^dpg-[a-z0-9-]+$/i.test(host);
    if (looksLikeRenderInternal) {
      const preferred = String(process.env.RENDER_POSTGRES_REGION || process.env.PG_RENDER_REGION || '').trim();
      const candidates = [
        preferred,
        'oregon',
        'ohio',
        'frankfurt',
        'singapore',
        'virginia',
      ].filter(Boolean);

      for (const region of Array.from(new Set(candidates))) {
        const candidateHost = `${host}.${region}-postgres.render.com`;
        try {
          await dns.lookup(candidateHost);
          u.hostname = candidateHost;
          return u.toString();
        } catch {}
      }

      const fallbackRegion = preferred || 'oregon';
      u.hostname = `${host}.${fallbackRegion}-postgres.render.com`;
      return u.toString();
    }
    return u.toString();
  } catch {
    return input;
  }
}

function getSslConfig(connectionString) {
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
let poolInitPromise = null;

async function ensurePool() {
  if (pool) return pool;
  if (poolInitPromise) return poolInitPromise;

  poolInitPromise = (async () => {
    if (!process.env.DATABASE_URL) {
      const err = new Error('DATABASE_URL mancante: configura la variabile su Render.');
      err.code = 'DB_NOT_CONFIGURED';
      throw err;
    }
    const connectionString = await normalizeDatabaseUrl(process.env.DATABASE_URL);
    pool = new Pool({
      connectionString,
      ssl: getSslConfig(connectionString),
    });
    return pool;
  })();

  try {
    return await poolInitPromise;
  } catch (err) {
    poolInitPromise = null;
    throw err;
  }
}

module.exports = {
  query: async (text, params) => (await ensurePool()).query(text, params),
  connect: async () => (await ensurePool()).connect(),
};
