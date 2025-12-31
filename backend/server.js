const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { MeiliSearch } = require('meilisearch');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({
  origin: String(process.env.ALLOWED_ORIGIN || '*'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-if-updated-at', 'x-admin-reset'],
}));
app.use(compression());
app.use(express.json({ limit: '50mb' })); // Permette al server di ricevere dati JSON (es. info roulotte)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Permette di ricevere dati da form HTML
app.use((req, res, next) => {
  if (String(process.env.FORCE_HTTPS || '') === '1') {
    const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    if (proto && proto !== 'https') {
      const host = req.headers.host;
      return res.redirect(`https://${host}${req.originalUrl}`);
    }
  }
  next();
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  next();
});

// Static files (serve admin UI e asset dal root del progetto)
const repoStaticRoot = path.join(__dirname, '..');
const publicStaticRoot = path.join(__dirname, 'public');

function trySyncStaticAssets() {
  try {
    fs.mkdirSync(publicStaticRoot, { recursive: true });
  } catch {}

  const files = [
    'admin.html',
    'admin.css',
    'index.html',
    'robots.txt',
    'sitemap.xml',
    'roulotte-store.js',
    'live-reload.js',
    'Untitled-1.html',
  ];

  for (const f of files) {
    const src = path.join(repoStaticRoot, f);
    const dst = path.join(publicStaticRoot, f);
    try {
      if (!fs.existsSync(src)) continue;
      fs.copyFileSync(src, dst);
    } catch {}
  }
}

trySyncStaticAssets();

const staticRoots = [publicStaticRoot, repoStaticRoot];
const staticOptions = {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const p = String(filePath || '').toLowerCase();
    if (p.endsWith('.html') || p.endsWith('.xml') || p.endsWith('.txt')) {
      res.setHeader('Cache-Control', 'no-store');
      if (p.endsWith('admin.html')) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return;
    }
    if (p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.webp') || p.endsWith('.svg') || p.endsWith('.ico')) {
      const maxAge = Math.max(0, Math.floor(getSettingNumberFirst(['regole_tecniche.cache.asset_max_age_seconds', 'cache.asset_max_age_seconds'], 0)));
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      return;
    }
    const maxAge = Math.max(0, Math.floor(getSettingNumberFirst(['regole_tecniche.cache.other_max_age_seconds', 'cache.other_max_age_seconds'], 0)));
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  }
};

for (const root of staticRoots) {
  app.use(express.static(root, staticOptions));
}

function resolveStaticFile(filename) {
  const f = String(filename || '').replace(/^[\\/]+/, '');
  for (const root of staticRoots) {
    try {
      const fullPath = path.join(root, f);
      if (fs.existsSync(fullPath)) return fullPath;
    } catch {}
  }
  return path.join(repoStaticRoot, f);
}

app.get('/admin.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(resolveStaticFile('admin.html'));
});

// Config pubblica (solo parametri non sensibili)
app.get('/api/config', (req, res) => {
  res.json({
    google_client_id: getGoogleClientId(),
    ors_enabled: orsEnabled(),
    posthog_host: getPosthogHost(),
    posthog_key: getPosthogKey(),
  });
});

const pool = require('./db'); // Importiamo la configurazione del database
const s3Client = require('./s3-client'); // Importiamo il client S3 per R2
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const { createTables } = require('./init-db');

const ENV_ADMIN_USER = String(process.env.ADMIN_USER || '').trim();
const ENV_ADMIN_PASS = String(process.env.ADMIN_PASS || '');

const settingsCache = new Map();

function normalizeSettingKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.length > 160) return '';
  if (!/^[a-z0-9_.-]+$/i.test(k)) return '';
  return k.toLowerCase();
}

async function loadSettingsCache() {
  try {
    const { rows } = await pool.query('SELECT setting_key, value, is_secret, updated_at FROM app_settings ORDER BY setting_key ASC;');
    settingsCache.clear();
    for (const r of (rows || [])) {
      const k = normalizeSettingKey(r.setting_key);
      if (!k) continue;
      settingsCache.set(k, {
        value: r.value !== undefined && r.value !== null ? String(r.value) : '',
        is_secret: r.is_secret === true,
        updated_at: r.updated_at || null,
      });
    }
    return true;
  } catch {
    return false;
  }
}

async function upsertSetting(key, value, isSecret) {
  const k = normalizeSettingKey(key);
  if (!k) return false;
  const v = value !== undefined && value !== null ? String(value) : '';
  const s = isSecret === true;
  try {
    const q = `
      INSERT INTO app_settings (setting_key, value, is_secret, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key)
      DO UPDATE SET value = EXCLUDED.value, is_secret = EXCLUDED.is_secret, updated_at = CURRENT_TIMESTAMP
      RETURNING setting_key, value, is_secret, updated_at;
    `;
    const { rows } = await pool.query(q, [k, v, s]);
    const row = rows && rows[0] ? rows[0] : null;
    if (row) {
      settingsCache.set(k, { value: String(row.value || ''), is_secret: row.is_secret === true, updated_at: row.updated_at || null });
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureSetting(key, value, isSecret) {
  const k = normalizeSettingKey(key);
  if (!k) return false;
  try {
    const ex = await pool.query('SELECT setting_key FROM app_settings WHERE setting_key = $1 LIMIT 1;', [k]);
    if (ex.rows && ex.rows.length) return true;
    return await upsertSetting(k, value, isSecret);
  } catch {
    return false;
  }
}

function getSettingString(key, fallback) {
  const k = normalizeSettingKey(key);
  if (!k) return String(fallback || '');
  const rec = settingsCache.get(k);
  if (!rec) return String(fallback || '');
  return String(rec.value || '');
}

function getSettingNumber(key, fallback) {
  const raw = getSettingString(key, '');
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function getSettingStringList(key, fallback) {
  const raw = getSettingString(key, '');
  if (!raw) return Array.isArray(fallback) ? fallback : [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getSettingStringFirst(keys, fallback) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    const v = getSettingString(k, '');
    if (String(v || '').trim()) return String(v);
  }
  return String(fallback || '');
}

function getSettingNumberFirst(keys, fallback) {
  const raw = String(getSettingStringFirst(keys, '') || '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function getSettingStringListFirst(keys, fallback) {
  const raw = String(getSettingStringFirst(keys, '') || '').trim();
  if (!raw) return Array.isArray(fallback) ? fallback : [];
  return raw.split(',').map(s => String(s || '').trim()).filter(Boolean);
}

function setDeepValue(obj, path, value) {
  if (!obj || typeof obj !== 'object') return obj;
  const parts = Array.isArray(path) ? path : String(path || '').split('.').filter(Boolean);
  if (!parts.length) return obj;
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i];
    if (i === parts.length - 1) {
      cur[k] = value;
      return obj;
    }
    const next = cur[k];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cur[k] = {};
    }
    cur = cur[k];
  }
  return obj;
}

function getDeepValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = Array.isArray(path) ? path : String(path || '').split('.').filter(Boolean);
  if (!parts.length) return undefined;
  let cur = obj;
  for (const k of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

function parseBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || '').trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'n' || s === 'off') return false;
  return null;
}

function parseTypedFromString(type, raw) {
  const s = raw !== undefined && raw !== null ? String(raw) : '';
  if (type === 'string') return s;
  if (type === 'number') {
    if (!String(s).trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'boolean') return parseBool(s);
  if (type === 'string[]') {
    if (!s) return [];
    return s.split(',').map(x => String(x || '').trim()).filter(Boolean);
  }
  return s;
}

function serializeTypedToString(type, v) {
  if (v === undefined || v === null) return '';
  if (type === 'string') return String(v);
  if (type === 'number') {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? String(n) : '';
  }
  if (type === 'boolean') {
    const b = parseBool(v);
    if (b === null) return '';
    return b ? 'true' : 'false';
  }
  if (type === 'string[]') {
    if (Array.isArray(v)) return v.map(x => String(x || '').trim()).filter(Boolean).join(',');
    return String(v).split(',').map(x => String(x || '').trim()).filter(Boolean).join(',');
  }
  return String(v);
}

const SETTINGS_DEFS = [
  { key: 'trasporto.routing.provider', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.base_url', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.api_key', type: 'string', is_secret: true, aliases: ['integrations.ors_api_key'] },
  { key: 'trasporto.routing.ors.profile', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.language', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.units', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.timeout_ms', type: 'number', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.max_alternative_routes', type: 'number', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.ors.avoid_features', type: 'string[]', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.cache.enabled', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'trasporto.routing.cache.ttl_seconds', type: 'number', is_secret: false, aliases: [] },
  { key: 'trasporto.pricing.enabled', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'trasporto.pricing.currency', type: 'string', is_secret: false, aliases: [] },
  { key: 'trasporto.pricing.vat_percent', type: 'number', is_secret: false, aliases: [] },

  { key: 'annunci.pubblicazione.enabled', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'annunci.pubblicazione.default_visibility', type: 'string', is_secret: false, aliases: [] },
  { key: 'annunci.pubblicazione.require_photos_for_publish', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'annunci.pubblicazione.require_price_for_publish', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'annunci.homepage.featured_enabled', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'annunci.homepage.featured_ids', type: 'string[]', is_secret: false, aliases: [] },
  { key: 'annunci.homepage.max_items', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.default_sort', type: 'string', is_secret: false, aliases: [] },
  { key: 'annunci.listing.page_size', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.max_page_size', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.year_min', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.year_max', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.price_min', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.price_max', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.weight_min', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.listing.filters.weight_max', type: 'number', is_secret: false, aliases: [] },
  { key: 'annunci.labels.badge_text', type: 'string', is_secret: false, aliases: [] },
  { key: 'annunci.labels.contact_phone', type: 'string', is_secret: false, aliases: [] },
  { key: 'annunci.labels.contact_email', type: 'string', is_secret: false, aliases: [] },

  { key: 'regole_tecniche.upload.photo_max_bytes', type: 'number', is_secret: false, aliases: ['upload.photo_max_bytes'] },
  { key: 'regole_tecniche.upload.photo_allowed_mimetypes', type: 'string[]', is_secret: false, aliases: ['upload.photo_allowed_mimetypes'] },
  { key: 'regole_tecniche.upload.photo_max_width_px', type: 'number', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.upload.photo_max_height_px', type: 'number', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.upload.photo_max_count_per_annuncio', type: 'number', is_secret: false, aliases: ['upload.photo_max_files'] },

  { key: 'regole_tecniche.sicurezza.admin_session_ttl_minutes', type: 'number', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.sicurezza.rate_limit.enabled', type: 'boolean', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.sicurezza.rate_limit.window_seconds', type: 'number', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.sicurezza.rate_limit.max_requests', type: 'number', is_secret: false, aliases: [] },
  { key: 'regole_tecniche.sicurezza.cors.allowed_origins', type: 'string[]', is_secret: false, aliases: [] },

  { key: 'regole_tecniche.cache.asset_max_age_seconds', type: 'number', is_secret: false, aliases: ['cache.asset_max_age_seconds'] },
  { key: 'regole_tecniche.cache.other_max_age_seconds', type: 'number', is_secret: false, aliases: ['cache.other_max_age_seconds'] },

  { key: 'regole_tecniche.integrazioni.directus.base_url', type: 'string', is_secret: false, aliases: ['integrations.directus_url'] },
  { key: 'regole_tecniche.integrazioni.directus.token', type: 'string', is_secret: true, aliases: ['integrations.directus_token'] },
  { key: 'regole_tecniche.integrazioni.directus.collection', type: 'string', is_secret: false, aliases: ['integrations.directus_collection'] },
  { key: 'regole_tecniche.integrazioni.directus.asset_base_url', type: 'string', is_secret: false, aliases: ['integrations.directus_asset_base_url'] },
  { key: 'regole_tecniche.integrazioni.directus.images_field', type: 'string', is_secret: false, aliases: ['integrations.directus_images_field'] },
  { key: 'regole_tecniche.integrazioni.directus.desc_field', type: 'string', is_secret: false, aliases: ['integrations.directus_desc_field'] },
  { key: 'regole_tecniche.integrazioni.directus.data_field', type: 'string', is_secret: false, aliases: ['integrations.directus_data_field'] },
  { key: 'regole_tecniche.integrazioni.directus.images_write_mode', type: 'string', is_secret: false, aliases: ['integrations.directus_images_write_mode'] },

  { key: 'regole_tecniche.integrazioni.meilisearch.host', type: 'string', is_secret: false, aliases: ['search.meili_url'] },
  { key: 'regole_tecniche.integrazioni.meilisearch.api_key', type: 'string', is_secret: true, aliases: ['search.meili_api_key'] },
  { key: 'regole_tecniche.integrazioni.meilisearch.index_name', type: 'string', is_secret: false, aliases: ['search.meili_index'] },

  { key: 'regole_tecniche.integrazioni.render.api_key', type: 'string', is_secret: true, aliases: ['deploy.render_api_key'] },
  { key: 'regole_tecniche.integrazioni.render.service_id', type: 'string', is_secret: false, aliases: ['deploy.render_service_id'] },
  { key: 'regole_tecniche.integrazioni.render.deploy_hook_url', type: 'string', is_secret: true, aliases: ['deploy.render_deploy_hook_url'] },

  { key: 'regole_tecniche.public.google_client_id', type: 'string', is_secret: false, aliases: ['public.google_client_id'] },
  { key: 'regole_tecniche.public.posthog_host', type: 'string', is_secret: false, aliases: ['public.posthog_host'] },
  { key: 'regole_tecniche.public.posthog_key', type: 'string', is_secret: false, aliases: ['public.posthog_key'] },
];

const SETTINGS_DEF_BY_KEY = new Map(SETTINGS_DEFS.map(d => [d.key, d]));

function findSettingRecordByKeyOrAliases(def) {
  const keys = [def.key, ...(Array.isArray(def.aliases) ? def.aliases : [])].map(k => normalizeSettingKey(k)).filter(Boolean);
  for (const k of keys) {
    const rec = settingsCache.get(k);
    if (rec) return { key: k, rec };
  }
  return null;
}

function buildSettingsForApi(opts = {}) {
  const includeSecrets = opts && opts.includeSecrets === true;
  const settings = {};
  const secrets_set = [];
  let updated_at = null;
  for (const def of SETTINGS_DEFS) {
    const found = findSettingRecordByKeyOrAliases(def);
    const rec = found ? found.rec : null;
    const raw = rec ? String(rec.value || '') : '';
    const isSet = !!raw;
    if (def.is_secret && isSet) secrets_set.push(def.key);
    const valueOut = def.is_secret && !includeSecrets ? '' : parseTypedFromString(def.type, raw);
    setDeepValue(settings, def.key, valueOut);
    const ts = rec && rec.updated_at ? rec.updated_at : null;
    if (ts && (!updated_at || String(ts) > String(updated_at))) updated_at = ts;
  }
  return { settings, secrets_set, updated_at };
}

function flattenSettingsInput(obj, prefix = '', out = {}) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const kk = String(k || '').trim();
    if (!kk) continue;
    const keyPath = prefix ? `${prefix}.${kk}` : kk;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenSettingsInput(v, keyPath, out);
    } else {
      out[keyPath] = v;
    }
  }
  return out;
}

function validateAndSerializeForDef(def, rawValue) {
  if (rawValue === undefined) return { ok: true, skip: true };
  if (rawValue === null || rawValue === '') return { ok: true, value: '' };

  if (def.type === 'number') {
    const n = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(n)) return { ok: false, error: 'INVALID_NUMBER' };
    return { ok: true, value: String(n) };
  }
  if (def.type === 'boolean') {
    const b = parseBool(rawValue);
    if (b === null) return { ok: false, error: 'INVALID_BOOLEAN' };
    return { ok: true, value: b ? 'true' : 'false' };
  }
  if (def.type === 'string[]') {
    const s = serializeTypedToString('string[]', rawValue);
    return { ok: true, value: s };
  }
  return { ok: true, value: serializeTypedToString('string', rawValue) };
}

function pickFirstNonEmpty(values) {
  const arr = Array.isArray(values) ? values : [values];
  for (const v of arr) {
    const s = String(v === undefined || v === null ? '' : v).trim();
    if (s) return s;
  }
  return '';
}

async function bootstrapCentralSettings() {
  const envOrsKey = String(process.env.ORS_API_KEY || process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_KEY || '').trim();
  const envPosthogKey = String(process.env.POSTHOG_KEY || process.env.POSTHOG_PUBLIC_KEY || '').trim();
  const envRenderDeployHookUrl = String(process.env.RENDER_DEPLOY_HOOK_URL || process.env.RENDER_DEPLOY_HOOK || '').trim();
  const envJwtSecret = String(process.env.JWT_SECRET || '').trim();
  const envJwtExpiresIn = String(process.env.JWT_EXPIRES_IN || '').trim();
  const envAdminResetToken = String(process.env.ADMIN_RESET_TOKEN || '').trim();

  const seeds = [
    { key: 'security.jwt_secret', value: pickFirstNonEmpty([getSettingString('security.jwt_secret', ''), envJwtSecret]), is_secret: true },
    { key: 'security.jwt_expires_in', value: pickFirstNonEmpty([getSettingString('security.jwt_expires_in', ''), envJwtExpiresIn]), is_secret: false },
    { key: 'security.admin_reset_token', value: pickFirstNonEmpty([getSettingString('security.admin_reset_token', ''), envAdminResetToken]), is_secret: true },

    { key: 'trasporto.routing.provider', value: pickFirstNonEmpty([getSettingString('trasporto.routing.provider', '')]), is_secret: false },
    { key: 'trasporto.routing.ors.base_url', value: pickFirstNonEmpty([getSettingString('trasporto.routing.ors.base_url', '')]), is_secret: false },
    { key: 'trasporto.routing.ors.profile', value: pickFirstNonEmpty([getSettingString('trasporto.routing.ors.profile', '')]), is_secret: false },
    { key: 'trasporto.routing.ors.api_key', value: pickFirstNonEmpty([getSettingString('trasporto.routing.ors.api_key', ''), getSettingString('integrations.ors_api_key', ''), envOrsKey]), is_secret: true },

    { key: 'regole_tecniche.cache.asset_max_age_seconds', value: pickFirstNonEmpty([getSettingString('regole_tecniche.cache.asset_max_age_seconds', ''), getSettingString('cache.asset_max_age_seconds', '')]), is_secret: false },
    { key: 'regole_tecniche.cache.other_max_age_seconds', value: pickFirstNonEmpty([getSettingString('regole_tecniche.cache.other_max_age_seconds', ''), getSettingString('cache.other_max_age_seconds', '')]), is_secret: false },

    { key: 'regole_tecniche.upload.photo_allowed_mimetypes', value: pickFirstNonEmpty([getSettingString('regole_tecniche.upload.photo_allowed_mimetypes', ''), getSettingString('upload.photo_allowed_mimetypes', '')]), is_secret: false },
    { key: 'regole_tecniche.upload.photo_max_bytes', value: pickFirstNonEmpty([getSettingString('regole_tecniche.upload.photo_max_bytes', ''), getSettingString('upload.photo_max_bytes', '')]), is_secret: false },
    { key: 'regole_tecniche.upload.photo_max_count_per_annuncio', value: pickFirstNonEmpty([getSettingString('regole_tecniche.upload.photo_max_count_per_annuncio', ''), getSettingString('upload.photo_max_files', '')]), is_secret: false },

    { key: 'regole_tecniche.integrazioni.directus.base_url', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.base_url', ''), getSettingString('integrations.directus_url', ''), String(process.env.DIRECTUS_URL || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.token', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.token', ''), getSettingString('integrations.directus_token', ''), String(process.env.DIRECTUS_TOKEN || '')]), is_secret: true },
    { key: 'regole_tecniche.integrazioni.directus.collection', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.collection', ''), getSettingString('integrations.directus_collection', ''), String(process.env.DIRECTUS_COLLECTION || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.asset_base_url', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.asset_base_url', ''), getSettingString('integrations.directus_asset_base_url', ''), String(process.env.DIRECTUS_ASSET_BASE_URL || process.env.DIRECTUS_URL || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.images_field', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.images_field', ''), getSettingString('integrations.directus_images_field', ''), String(process.env.DIRECTUS_IMAGES_FIELD || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.desc_field', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.desc_field', ''), getSettingString('integrations.directus_desc_field', ''), String(process.env.DIRECTUS_DESC_FIELD || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.data_field', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.data_field', ''), getSettingString('integrations.directus_data_field', ''), String(process.env.DIRECTUS_DATA_FIELD || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.directus.images_write_mode', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.directus.images_write_mode', ''), getSettingString('integrations.directus_images_write_mode', ''), String(process.env.DIRECTUS_IMAGES_WRITE_MODE || '')]), is_secret: false },

    { key: 'regole_tecniche.integrazioni.meilisearch.host', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.meilisearch.host', ''), getSettingString('search.meili_url', ''), String(process.env.MEILI_URL || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.meilisearch.api_key', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.meilisearch.api_key', ''), getSettingString('search.meili_api_key', ''), String(process.env.MEILI_API_KEY || '')]), is_secret: true },
    { key: 'regole_tecniche.integrazioni.meilisearch.index_name', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.meilisearch.index_name', ''), getSettingString('search.meili_index', ''), String(process.env.MEILI_INDEX || '')]), is_secret: false },

    { key: 'regole_tecniche.integrazioni.render.api_key', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.render.api_key', ''), getSettingString('deploy.render_api_key', ''), String(process.env.RENDER_API_KEY || '')]), is_secret: true },
    { key: 'regole_tecniche.integrazioni.render.service_id', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.render.service_id', ''), getSettingString('deploy.render_service_id', ''), String(process.env.RENDER_SERVICE_ID || '')]), is_secret: false },
    { key: 'regole_tecniche.integrazioni.render.deploy_hook_url', value: pickFirstNonEmpty([getSettingString('regole_tecniche.integrazioni.render.deploy_hook_url', ''), getSettingString('deploy.render_deploy_hook_url', ''), envRenderDeployHookUrl]), is_secret: true },

    { key: 'regole_tecniche.public.google_client_id', value: pickFirstNonEmpty([getSettingString('regole_tecniche.public.google_client_id', ''), getSettingString('public.google_client_id', ''), String(process.env.GOOGLE_CLIENT_ID || '')]), is_secret: false },
    { key: 'regole_tecniche.public.posthog_host', value: pickFirstNonEmpty([getSettingString('regole_tecniche.public.posthog_host', ''), getSettingString('public.posthog_host', ''), String(process.env.POSTHOG_HOST || '')]), is_secret: false },
    { key: 'regole_tecniche.public.posthog_key', value: pickFirstNonEmpty([getSettingString('regole_tecniche.public.posthog_key', ''), getSettingString('public.posthog_key', ''), envPosthogKey]), is_secret: false },
  ];

  for (const s of seeds) {
    const key = String(s && s.key || '').trim();
    if (!key) continue;
    const value = String(s.value || '').trim();
    if (!value) continue;
    await ensureSetting(key, value, s.is_secret === true);
  }
}

function getJwtSecret() {
  return getSettingString('security.jwt_secret', String(process.env.JWT_SECRET || ''));
}

function getJwtExpiresIn() {
  return getSettingString('security.jwt_expires_in', String(process.env.JWT_EXPIRES_IN || ''));
}

function getAdminResetToken() {
  return getSettingString('security.admin_reset_token', String(process.env.ADMIN_RESET_TOKEN || ''));
}

function getGoogleClientId() {
  return getSettingStringFirst(['regole_tecniche.public.google_client_id', 'public.google_client_id'], String(process.env.GOOGLE_CLIENT_ID || '')).trim();
}

function getPosthogHost() {
  return getSettingStringFirst(['regole_tecniche.public.posthog_host', 'public.posthog_host'], String(process.env.POSTHOG_HOST || '')).trim();
}

function getPosthogKey() {
  return getSettingStringFirst(['regole_tecniche.public.posthog_key', 'public.posthog_key'], String(process.env.POSTHOG_KEY || process.env.POSTHOG_PUBLIC_KEY || '')).trim();
}

function getRenderApiKey() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.render.api_key', 'deploy.render_api_key'], String(process.env.RENDER_API_KEY || '')).trim();
}

function getRenderServiceId() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.render.service_id', 'deploy.render_service_id'], String(process.env.RENDER_SERVICE_ID || '')).trim();
}

function getRenderDeployHookUrl() {
  return getSettingStringFirst(
    ['regole_tecniche.integrazioni.render.deploy_hook_url', 'deploy.render_deploy_hook_url'],
    String(process.env.RENDER_DEPLOY_HOOK_URL || process.env.RENDER_DEPLOY_HOOK || '')
  ).trim();
}

const serverWss = new WebSocketServer({ server, path: '/ws' });

let wsSeq = 0;
const wsLocks = new Map();

function safeJsonParse(v) {
  try { return JSON.parse(String(v || '')); } catch { return null; }
}

function wsBroadcast(payload, predicate) {
  if (!payload) return;
  const msg = JSON.stringify(payload);
  for (const client of serverWss.clients) {
    if (client.readyState !== 1) continue;
    if (predicate && !predicate(client)) continue;
    try { client.send(msg); } catch {}
  }
}

function wsEmitInvalidate(scope, detail) {
  wsSeq += 1;
  wsBroadcast({ type: 'invalidate', scope: String(scope || ''), detail: detail || null, ts: Date.now(), seq: wsSeq });
}

function wsNormalizeLocks() {
  const now = Date.now();
  const out = [];
  for (const [id, lock] of wsLocks.entries()) {
    if (!lock || now >= lock.expiresAt) continue;
    out.push({ id, user: lock.user, expiresAt: lock.expiresAt });
  }
  return out;
}

function wsCleanupExpiredLocks() {
  const now = Date.now();
  let changed = false;
  for (const [id, lock] of wsLocks.entries()) {
    if (!lock || now >= lock.expiresAt) {
      wsLocks.delete(id);
      changed = true;
    }
  }
  if (changed) wsBroadcast({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() }, (c) => c && c._meta && c._meta.role === 'admin');
}

function wsReleaseUserLocks(username) {
  if (!username) return;
  let changed = false;
  for (const [id, lock] of wsLocks.entries()) {
    if (lock && lock.user === username) {
      wsLocks.delete(id);
      changed = true;
    }
  }
  if (changed) wsBroadcast({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() }, (c) => c && c._meta && c._meta.role === 'admin');
}

function wsTrySetLock(publicId, username) {
  const id = String(publicId || '').trim();
  if (!id) return { ok: false, error: 'BAD_REQUEST' };
  const now = Date.now();
  const existing = wsLocks.get(id);
  if (existing && now < existing.expiresAt && existing.user && existing.user !== username) {
    return { ok: false, error: 'LOCKED', lock: { id, user: existing.user, expiresAt: existing.expiresAt } };
  }
  wsLocks.set(id, { user: username, expiresAt: now + 60000 });
  return { ok: true, lock: { id, user: username, expiresAt: now + 60000 } };
}

function wsRefreshLock(publicId, username) {
  const id = String(publicId || '').trim();
  if (!id) return { ok: false, error: 'BAD_REQUEST' };
  const now = Date.now();
  const existing = wsLocks.get(id);
  if (!existing || now >= existing.expiresAt) return wsTrySetLock(id, username);
  if (existing.user !== username) return { ok: false, error: 'LOCKED', lock: { id, user: existing.user, expiresAt: existing.expiresAt } };
  wsLocks.set(id, { user: username, expiresAt: now + 60000 });
  return { ok: true, lock: { id, user: username, expiresAt: now + 60000 } };
}

function wsReleaseLock(publicId, username) {
  const id = String(publicId || '').trim();
  if (!id) return { ok: false, error: 'BAD_REQUEST' };
  const existing = wsLocks.get(id);
  if (existing && existing.user && existing.user !== username) return { ok: false, error: 'LOCKED' };
  wsLocks.delete(id);
  return { ok: true };
}

serverWss.on('connection', (ws, req) => {
  const url = new URL(String(req.url || '/ws'), 'http://localhost');
  const token = String(url.searchParams.get('token') || '').trim();

  let role = 'public';
  let user = null;
  if (token) {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      ws._meta = { role: 'public', user: null };
    } else {
    try {
      const payload = jwt.verify(token, jwtSecret);
      role = 'admin';
      user = payload && payload.user ? String(payload.user) : 'admin';
    } catch {}
    }
  }

  ws._meta = { role, user };

  try { ws.send(JSON.stringify({ type: 'hello', role, user, ts: Date.now() })); } catch {}
  if (role === 'admin') {
    try { ws.send(JSON.stringify({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() })); } catch {}
  }

  ws.on('message', (data) => {
    if (!ws || !ws._meta || ws._meta.role !== 'admin') return;
    const msg = safeJsonParse(data);
    if (!msg || typeof msg !== 'object') return;

    const t = String(msg.type || '').trim();
    const publicId = String(msg.id || '').trim();
    const username = String(ws._meta.user || 'admin');

    if (t === 'lock_acquire') {
      const r = wsTrySetLock(publicId, username);
      try { ws.send(JSON.stringify({ type: 'lock_result', request: 'acquire', ...r, ts: Date.now() })); } catch {}
      if (r.ok) wsBroadcast({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() }, (c) => c && c._meta && c._meta.role === 'admin');
    } else if (t === 'lock_heartbeat') {
      const r = wsRefreshLock(publicId, username);
      try { ws.send(JSON.stringify({ type: 'lock_result', request: 'heartbeat', ...r, ts: Date.now() })); } catch {}
      if (r.ok) wsBroadcast({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() }, (c) => c && c._meta && c._meta.role === 'admin');
    } else if (t === 'lock_release') {
      const r = wsReleaseLock(publicId, username);
      try { ws.send(JSON.stringify({ type: 'lock_result', request: 'release', ...r, ts: Date.now() })); } catch {}
      wsBroadcast({ type: 'locks', locks: wsNormalizeLocks(), ts: Date.now() }, (c) => c && c._meta && c._meta.role === 'admin');
    }
  });

  ws.on('close', () => {
    const u = ws && ws._meta && ws._meta.user ? String(ws._meta.user) : '';
    wsReleaseUserLocks(u);
  });
});

setInterval(wsCleanupExpiredLocks, 10000).unref();

// Configurazione di Multer per gestire l'upload di file in memoria
const storage = multer.memoryStorage();

function getUploadAllowedMimes() {
  const fromSettings = getSettingStringListFirst(['regole_tecniche.upload.photo_allowed_mimetypes', 'upload.photo_allowed_mimetypes'], []);
  return fromSettings.map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
}

function getUploadMaxBytes() {
  return Math.max(0, Math.floor(getSettingNumberFirst(['regole_tecniche.upload.photo_max_bytes', 'upload.photo_max_bytes'], 0)));
}

function getUploadMaxFiles() {
  return Math.max(0, Math.floor(getSettingNumberFirst(['regole_tecniche.upload.photo_max_count_per_annuncio', 'upload.photo_max_files'], 0)));
}

function getUploadConfig() {
  const allowed = getUploadAllowedMimes();
  const maxBytes = getUploadMaxBytes();
  const maxFiles = getUploadMaxFiles();
  return { allowed, maxBytes, maxFiles };
}

function makeUpload() {
  const allowed = new Set(getUploadAllowedMimes());
  return multer({
    storage: storage,
    limits: { fileSize: getUploadMaxBytes(), files: getUploadMaxFiles() },
    fileFilter: (req, file, cb) => {
      const mt = String(file && file.mimetype || '').toLowerCase();
      if (allowed.has(mt)) return cb(null, true);
      const err = new Error('UNSUPPORTED_FORMAT');
      err.status = 415;
      return cb(err);
    }
  });
}

function uploadArray(field, maxCount) {
  return (req, res, next) => {
    const cfg = getUploadConfig();
    if (!cfg.allowed.length || cfg.maxBytes <= 0 || cfg.maxFiles <= 0) {
      return res.status(500).json({ error: 'UPLOAD_NOT_CONFIGURED' });
    }
    const u = makeUpload();
    const count = Math.max(0, Math.min(Number(maxCount || 0) || 0, cfg.maxFiles));
    return u.array(field, count)(req, res, (err) => {
      if (!err) return next();
      const msg = String(err && err.message ? err.message : err);
      const code = String(err && err.code ? err.code : '');
      if (msg === 'UNSUPPORTED_FORMAT') return res.status(415).json({ error: 'UNSUPPORTED_FORMAT' });
      if (code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
      if (code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'TOO_MANY_FILES' });
      if (code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'UNEXPECTED_FILE' });
      const st = Number(err && err.status !== undefined ? err.status : 400);
      return res.status(Number.isFinite(st) ? st : 400).json({ error: 'UPLOAD_ERROR', detail: msg });
    });
  };
}

// Funzione per generare un nome file univoco
const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

function joinUrl(base, path) {
  // Pulizia aggressiva dell'URL base per rimuovere backticks e spazi accidentali
  let b = String(base || '').trim().replace(/^['"`]+|['"`]+$/g, '');
  // Aggiungi https:// se manca
  if (b && !b.startsWith('http://') && !b.startsWith('https://')) {
    b = 'https://' + b;
  }
  b = b.replace(/\/+$/, '');
  
  const p = String(path || '').trim().replace(/^\/+/, '');
  if (!b) return p;
  if (!p) return b;
  return `${b}/${p}`;
}

function normalizePhotoUrlToCurrentPublicBase(url) {
  const publicBase = String(process.env.R2_PUBLIC_URL || '').trim();
  if (!publicBase) return url;
  if (typeof url !== 'string') return url;
  const s = url.trim();
  if (!s) return s;

  try {
    const u = new URL(s);
    const parts = (u.pathname || '').split('/').filter(Boolean);
    const key = parts.length ? parts[parts.length - 1] : '';
    if (!key) return url;
    return joinUrl(publicBase, key);
  } catch {
    const parts = s.split('/').filter(Boolean);
    const key = parts.length ? parts[parts.length - 1] : '';
    if (!key) return url;
    return joinUrl(publicBase, key);
  }
}

function parseJsonOrNull(v) {
  try { return JSON.parse(String(v || '')); } catch { return null; }
}

function getDirectusUrl() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.base_url', 'integrations.directus_url'], '').trim();
}
function getDirectusToken() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.token', 'integrations.directus_token'], String(process.env.DIRECTUS_TOKEN || '')).trim();
}
function getDirectusCollection() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.collection', 'integrations.directus_collection'], String(process.env.DIRECTUS_COLLECTION || '')).trim();
}
function getDirectusAssetBaseUrl() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.asset_base_url', 'integrations.directus_asset_base_url'], String(process.env.DIRECTUS_ASSET_BASE_URL || process.env.DIRECTUS_URL || '')).trim();
}
function getDirectusImagesField() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.images_field', 'integrations.directus_images_field'], String(process.env.DIRECTUS_IMAGES_FIELD || '')).trim();
}
function getDirectusDescField() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.desc_field', 'integrations.directus_desc_field'], String(process.env.DIRECTUS_DESC_FIELD || '')).trim();
}
function getDirectusDataField() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.data_field', 'integrations.directus_data_field'], String(process.env.DIRECTUS_DATA_FIELD || '')).trim();
}
function getDirectusImagesWriteMode(fallback) {
  return getSettingStringFirst(['regole_tecniche.integrazioni.directus.images_write_mode', 'integrations.directus_images_write_mode'], String(fallback || process.env.DIRECTUS_IMAGES_WRITE_MODE || '')).trim();
}

function getMeiliUrl() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.meilisearch.host', 'search.meili_url'], String(process.env.MEILI_URL || '')).trim();
}
function getMeiliApiKey() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.meilisearch.api_key', 'search.meili_api_key'], String(process.env.MEILI_API_KEY || '')).trim();
}
function getMeiliIndex() {
  return getSettingStringFirst(['regole_tecniche.integrazioni.meilisearch.index_name', 'search.meili_index'], String(process.env.MEILI_INDEX || '')).trim();
}

function getOrsApiKey() {
  return getSettingStringFirst(['trasporto.routing.ors.api_key', 'integrations.ors_api_key'], '').trim();
}

function getOrsBaseUrl() {
  return getSettingStringFirst(['trasporto.routing.ors.base_url'], '').trim();
}

function getOrsProfile() {
  return getSettingStringFirst(['trasporto.routing.ors.profile'], '').trim();
}

function directusEnabled() {
  return !!getDirectusUrl() && !!getDirectusCollection() && !!getDirectusDataField();
}

function directusWriteEnabled() {
  return directusEnabled() && !!getDirectusToken() && !!getDirectusImagesField() && !!getDirectusImagesWriteMode();
}

function meiliEnabled() {
  return !!getMeiliUrl() && !!getMeiliIndex();
}

function orsEnabled() {
  return !!getOrsApiKey();
}

let meiliClient = null;
function getMeiliClient() {
  if (!meiliEnabled()) return null;
  if (meiliClient) return meiliClient;
  meiliClient = new MeiliSearch({ host: getMeiliUrl(), apiKey: getMeiliApiKey() || undefined });
  return meiliClient;
}

async function orsFetchJson(url, init) {
  const apiKey = getOrsApiKey();
  let finalUrl = String(url || '');
  try {
    const u = new URL(finalUrl);
    if (apiKey && !u.searchParams.get('api_key')) {
      u.searchParams.set('api_key', apiKey);
      finalUrl = u.toString();
    }
  } catch {}

  const headers = { 'Accept': 'application/json, application/geo+json' };
  if (init && init.headers && typeof init.headers === 'object') Object.assign(headers, init.headers);
  if (apiKey) headers['Authorization'] = apiKey;

  const res = await fetch(finalUrl, { ...(init || {}), headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body ? body.slice(0, 500) : '';
    const err = new Error(`ors_http_${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return await res.json();
}

async function nominatimGeocodeOne(text) {
  const q = String(text || '').trim();
  if (!q) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'User-Agent': 'roulotte.online backend' }
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  if (!first || typeof first !== 'object') return null;

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const label = String(first.display_name || q);
  return { lat, lon, label };
}

async function orsGeocodeOne(text) {
  const q = String(text || '').trim();
  if (!q) return null;
  try {
    const baseUrl = getOrsBaseUrl();
    if (!baseUrl) return await nominatimGeocodeOne(q);
    const url = new URL(joinUrl(baseUrl, 'geocode/search'));
    url.searchParams.set('text', q);
    url.searchParams.set('size', '1');
    const json = await orsFetchJson(url.toString(), { method: 'GET' });
    const f = Array.isArray(json && json.features) ? json.features[0] : null;
    const coords = f && f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
    if (!coords || coords.length < 2) return await nominatimGeocodeOne(q);
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return await nominatimGeocodeOne(q);
    const label = String((f && f.properties && (f.properties.label || f.properties.name)) || q);
    return { lat, lon, label };
  } catch (err) {
    const status = Number(err && err.status !== undefined ? err.status : NaN);
    const msg = String(err && err.message ? err.message : err);
    const shouldFallback =
      msg.startsWith('ors_http_') &&
      [401, 403, 429, 500, 502, 503, 504].includes(status);
    if (!shouldFallback) return null;
    return await nominatimGeocodeOne(q);
  }
}

function buildDirectusUrl(pathname, params) {
  const baseUrl = getDirectusUrl();
  if (!baseUrl) {
    const err = new Error('DIRECTUS_NOT_CONFIGURED');
    err.status = 400;
    throw err;
  }
  const base = joinUrl(baseUrl, pathname);
  const url = new URL(base);
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function buildDirectusAssetUrl(fileId, opts) {
  const id = String(fileId || '').trim();
  if (!id) return '';
  const assetBase = getDirectusAssetBaseUrl() || getDirectusUrl();
  if (!assetBase) return '';
  const base = joinUrl(assetBase, `assets/${encodeURIComponent(id)}`);
  const url = new URL(base);
  const o = (opts && typeof opts === 'object') ? opts : {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function directusFetchJson(pathname, params) {
  const url = buildDirectusUrl(pathname, params);
  const headers = { 'Accept': 'application/json' };
  const token = getDirectusToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body ? body.slice(0, 300) : '';
    const err = new Error(`directus_http_${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return await res.json();
}

async function directusRequestJson(method, pathname, opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};
  const url = buildDirectusUrl(pathname, o.params);
  const headers = { 'Accept': 'application/json' };
  const token = getDirectusToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (o.headers && typeof o.headers === 'object') Object.assign(headers, o.headers);
  const init = { method: String(method || 'GET').toUpperCase(), headers };
  if (o.body !== undefined) {
    if (typeof FormData !== 'undefined' && o.body instanceof FormData) {
      init.body = o.body;
    } else if (typeof o.body === 'string') {
      init.body = o.body;
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    } else {
      init.body = JSON.stringify(o.body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body ? body.slice(0, 1200) : '';
    const err = new Error(`directus_http_${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return null;
  return await res.json().catch(() => null);
}

function parseDirectusAssetIdFromUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const parts = String(u.pathname || '').split('/').filter(Boolean);
    const idx = parts.findIndex(p => p === 'assets');
    if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  } catch {}
  const m = s.match(/assets\/([^/?#]+)/i);
  return m && m[1] ? decodeURIComponent(m[1]) : '';
}

function normalizeDirectusImageIdsFromField(imagesFieldValue) {
  const raw = imagesFieldValue;
  const out = [];
  const pushId = (v) => {
    const id = String(v || '').trim();
    if (!id) return;
    out.push(id);
  };
  const fromItem = (it) => {
    if (!it) return;
    if (typeof it === 'string' || typeof it === 'number') return pushId(it);
    if (typeof it !== 'object') return;
    if (it.directus_files_id) {
      const df = it.directus_files_id;
      if (typeof df === 'string' || typeof df === 'number') return pushId(df);
      if (df && typeof df === 'object') return pushId(df.id);
    }
    if (it.id) return pushId(it.id);
    if (it.file) return pushId(it.file);
  };
  if (Array.isArray(raw)) {
    raw.forEach(fromItem);
  } else if (raw) {
    fromItem(raw);
  }
  return out.filter(Boolean);
}

function buildDirectusImagesWriteValue(fileIds, mode) {
  const ids = Array.isArray(fileIds) ? fileIds.map(x => String(x || '').trim()).filter(Boolean) : [];
  const m = String(mode || getDirectusImagesWriteMode() || '').trim().toLowerCase();
  if (!m) {
    const err = new Error('DIRECTUS_NOT_CONFIGURED');
    err.status = 500;
    throw err;
  }
  if (m === 'ids' || m === 'array' || m === 'json') return ids;
  return ids.map((id) => ({ directus_files_id: id }));
}

async function directusUploadMulterFiles(files) {
  const arr = Array.isArray(files) ? files : [];
  const out = [];
  const cfg = getUploadConfig();
  const allowed = new Set(cfg.allowed);
  if (!allowed.size || cfg.maxBytes <= 0) {
    const err = new Error('UPLOAD_NOT_CONFIGURED');
    err.status = 500;
    throw err;
  }
  for (const f of arr) {
    if (!f || !f.buffer) continue;
    const mt = String(f.mimetype || '').toLowerCase();
    if (!allowed.has(mt)) {
      const err = new Error('UNSUPPORTED_FORMAT');
      err.status = 415;
      throw err;
    }
    const sz = Number(f.size || 0);
    if (sz > cfg.maxBytes) {
      const err = new Error('FILE_TOO_LARGE');
      err.status = 413;
      throw err;
    }
    const fd = new FormData();
    const blob = new Blob([f.buffer], { type: mt || 'application/octet-stream' });
    const name = String(f.originalname || '').trim() || ('upload_' + Date.now() + '.bin');
    fd.append('file', blob, name);
    const res = await directusRequestJson('POST', 'files', { body: fd });
    const id = res && typeof res === 'object' && res.data && typeof res.data === 'object' ? String(res.data.id || '').trim() : '';
    if (!id) {
      const err = new Error('DIRECTUS_UPLOAD_FAILED');
      err.status = 502;
      throw err;
    }
    out.push(id);
  }
  return out;
}

function buildDirectusWriteDataFromIncoming(raw) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  const out = {};
  const descField = getDirectusDescField();
  const dataField = getDirectusDataField();
  const copyIfPresent = (k) => {
    if (src[k] === undefined) return;
    out[k] = src[k];
  };
  copyIfPresent('marca');
  copyIfPresent('modello');
  copyIfPresent('stato');
  copyIfPresent('anno');
  copyIfPresent('categoryId');
  copyIfPresent('prezzo');
  copyIfPresent('lunghezza');
  copyIfPresent('larghezza');
  copyIfPresent('doppio_asse');
  copyIfPresent('trainabile');
  copyIfPresent('revisionata');
  copyIfPresent('stato_annuncio');
  copyIfPresent('dipendente_creatore');
  copyIfPresent('data_creazione');
  copyIfPresent('data_pubblicazione');
  copyIfPresent('visibile');

  const note = src.note ?? src.descrizione ?? src.description;
  if (note !== undefined) out[descField] = String(note || '');

  const extra = { ...src };
  delete extra.payload;
  delete extra.existing_photos;
  delete extra.new_photos;
  delete extra.photos;
  delete extra.id;
  delete extra.updatedAt;
  [
    'marca',
    'modello',
    'stato',
    'anno',
    'categoryId',
    'prezzo',
    'lunghezza',
    'larghezza',
    'doppio_asse',
    'trainabile',
    'revisionata',
    'stato_annuncio',
    'dipendente_creatore',
    'data_creazione',
    'data_pubblicazione',
    'visibile',
  ].forEach((k) => { try { delete extra[k]; } catch {} });

  if (dataField) {
    const keys = Object.keys(extra || {});
    if (keys.length > 0) out[dataField] = extra;
  }
  return out;
}

function mapDirectusItemToRoulotte(item) {
  const src = (item && typeof item === 'object') ? item : {};
  const dataField = getDirectusDataField();
  const descField = getDirectusDescField();
  const imagesField = getDirectusImagesField();
  const blob = src[dataField];
  const dataBlob = (blob && typeof blob === 'object' && !Array.isArray(blob)) ? blob : {};
  const marca = String(src.marca || dataBlob.marca || '').trim();
  const modello = String(src.modello || dataBlob.modello || '').trim();
  const stato = String(src.stato || src.condizione || dataBlob.stato || dataBlob.condizione || '').trim();
  const stato_annuncio = String(src.stato_annuncio || src.statoAnnuncio || dataBlob.stato_annuncio || dataBlob.statoAnnuncio || '').trim();
  const prezzo =
    src.prezzo !== undefined ? Number(src.prezzo) :
    (dataBlob.prezzo !== undefined ? Number(dataBlob.prezzo) : null);
  const anno =
    src.anno !== undefined ? Number(src.anno) :
    (src.year !== undefined ? Number(src.year) :
      (dataBlob.anno !== undefined ? Number(dataBlob.anno) :
        (dataBlob.year !== undefined ? Number(dataBlob.year) : null)));
  const lunghezza =
    src.lunghezza !== undefined ? Number(src.lunghezza) :
    (dataBlob.lunghezza !== undefined ? Number(dataBlob.lunghezza) : null);
  const larghezza =
    src.larghezza !== undefined ? Number(src.larghezza) :
    (dataBlob.larghezza !== undefined ? Number(dataBlob.larghezza) : null);
  const note = String(src[descField] || dataBlob.note || dataBlob.descrizione || dataBlob.description || '').trim();
  const categoryId = String(src.categoryId || src.category_id || src.categoria || dataBlob.categoryId || dataBlob.category_id || dataBlob.categoria || '').trim() || null;
  const doppio_asse =
    (src.doppio_asse !== undefined && src.doppio_asse !== null) ? !!src.doppio_asse :
    ((dataBlob.doppio_asse === undefined || dataBlob.doppio_asse === null) ? null : !!dataBlob.doppio_asse);
  const trainabile =
    (src.trainabile !== undefined && src.trainabile !== null) ? !!src.trainabile :
    ((dataBlob.trainabile === undefined || dataBlob.trainabile === null) ? null : !!dataBlob.trainabile);
  const revisionata =
    (src.revisionata !== undefined && src.revisionata !== null) ? !!src.revisionata :
    ((dataBlob.revisionata === undefined || dataBlob.revisionata === null) ? null : !!dataBlob.revisionata);

  const dipendente_creatore_raw = src.dipendente_creatore || src.user_created || null;
  const dipendente_creatore =
    (dipendente_creatore_raw && typeof dipendente_creatore_raw === 'object')
      ? String(dipendente_creatore_raw.id || dipendente_creatore_raw.email || dipendente_creatore_raw.first_name || dipendente_creatore_raw.last_name || '').trim() || null
      : (dipendente_creatore_raw ? String(dipendente_creatore_raw).trim() : null);

  const data_creazione = src.data_creazione || src.date_created || src.created_at || src.createdAt || null;
  const data_pubblicazione = src.data_pubblicazione || src.date_published || src.published_at || null;

  const createdAt = src.date_created || src.created_at || src.createdAt || null;
  const updatedAt = src.date_updated || src.updated_at || src.updatedAt || createdAt || null;
  const statoAnnLower = stato_annuncio ? String(stato_annuncio).trim().toLowerCase() : '';
  const statoFinal = (stato || '').trim() ? stato : (statoAnnLower === 'venduto' ? 'Venduto' : null);
  const dataCreazioneFinal = data_creazione || createdAt || null;
  const dataPubblicazioneFinal = data_pubblicazione || ((statoAnnLower === 'pubblicato' || statoAnnLower === 'venduto') ? (dataCreazioneFinal || null) : null);

  const id =
    String(src.public_id || src.publicId || src.id || '').trim() ||
    ('D-' + crypto.randomBytes(6).toString('hex'));

  const imagesRaw = src[imagesField];
  const photos = [];

  const pushFile = (file) => {
    if (!file) return;
    const fileId =
      (typeof file === 'string' || typeof file === 'number') ? file :
      (file.directus_files_id && (file.directus_files_id.id || file.directus_files_id)) ||
      file.id ||
      file.file ||
      null;
    if (!fileId) return;
    const alt = (typeof file === 'object' && file.title) ? String(file.title) : '';
    const srcUrl = buildDirectusAssetUrl(fileId, { quality: 82, format: 'webp' });
    const thumbUrl = buildDirectusAssetUrl(fileId, { width: 480, quality: 70, format: 'webp' });
    photos.push({ src: srcUrl, thumb: thumbUrl, alt, placeholder: '' });
  };

  if (Array.isArray(imagesRaw)) {
    for (const it of imagesRaw) pushFile(it);
  } else if (imagesRaw) {
    pushFile(imagesRaw);
  }

  return {
    ...dataBlob,
    id,
    marca,
    modello,
    prezzo: Number.isFinite(prezzo) ? prezzo : null,
    anno: Number.isFinite(anno) ? anno : null,
    stato: statoFinal,
    lunghezza: Number.isFinite(lunghezza) ? lunghezza : null,
    larghezza: Number.isFinite(larghezza) ? larghezza : null,
    note,
    categoryId,
    doppio_asse,
    trainabile,
    revisionata,
    stato_annuncio: stato_annuncio || null,
    dipendente_creatore,
    data_creazione: dataCreazioneFinal,
    data_pubblicazione: dataPubblicazioneFinal,
    photos,
    visibile: src.visibile === undefined || src.visibile === null ? true : !!src.visibile,
    createdAt,
    updatedAt
  };
}

async function fetchDirectusRoulottes() {
  const collection = getDirectusCollection();
  const payload = await directusFetchJson(`items/${encodeURIComponent(collection)}`, {
    limit: '-1',
    fields: '*.*.*'
  });
  const items = payload && typeof payload === 'object' ? payload.data : [];
  const list = Array.isArray(items) ? items.map(mapDirectusItemToRoulotte) : [];
  const allowedStatus = new Set(['pubblicato', 'venduto']);
  const now = Date.now();
  return list.filter(r => {
    if (!r || typeof r !== 'object') return false;
    const s = String(r.stato_annuncio || '').trim().toLowerCase();
    if (!allowedStatus.has(s)) return false;
    if (s === 'pubblicato' && r.data_pubblicazione) {
      const t = Date.parse(String(r.data_pubblicazione));
      if (Number.isFinite(t) && t > now) return false;
    }
    return true;
  });
}

async function fetchDirectusRoulottesForAdmin() {
  const collection = getDirectusCollection();
  const payload = await directusFetchJson(`items/${encodeURIComponent(collection)}`, {
    limit: '-1',
    fields: '*.*.*'
  });
  const items = payload && typeof payload === 'object' ? payload.data : [];
  const list = Array.isArray(items) ? items.map(mapDirectusItemToRoulotte) : [];
  return list;
}

function adminLog(client, action, username, details) {
  const q = `
    INSERT INTO admin_logs (action, username, details)
    VALUES ($1, $2, $3::jsonb)
  `;
  const d = details ? JSON.stringify(details) : JSON.stringify({});
  return client.query(q, [String(action || ''), String(username || ''), d]);
}

async function captureRoulotteSnapshot(client, publicId) {
  const id = String(publicId || '').trim();
  if (!id) return null;
  const r = await client.query(
    'SELECT id, public_id, title, description, price, year, weight, length, beds, data, visibile, created_at, updated_at FROM roulottes WHERE public_id = $1;',
    [id]
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  const pr = await client.query(
    'SELECT url_full, url_thumb, is_cover, sort_order FROM photos WHERE roulotte_id = $1 ORDER BY sort_order ASC, id ASC;',
    [row.id]
  );
  const photos = (pr.rows || []).map((p) => ({
    url_full: p.url_full,
    url_thumb: p.url_thumb,
    is_cover: p.is_cover === true,
    sort_order: Number(p.sort_order || 0),
  }));
  const snapshot = {
    public_id: row.public_id,
    title: row.title,
    description: row.description,
    price: row.price,
    year: row.year,
    weight: row.weight,
    length: row.length,
    beds: row.beds,
    data: row.data || {},
    visibile: row.visibile === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return { snapshot, photos };
}

async function insertRoulotteRevision(client, publicId, action, username) {
  const cap = await captureRoulotteSnapshot(client, publicId);
  if (!cap) return false;
  await client.query(
    'INSERT INTO roulotte_revisions (public_id, action, snapshot, photos, username) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5);',
    [String(publicId || '').trim(), String(action || ''), JSON.stringify(cap.snapshot), JSON.stringify(cap.photos || []), username ? String(username) : null]
  );
  return true;
}

app.post('/api/admin/log', requireAdmin, async (req, res) => {
  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.json({ ok: true, skipped: true });
    return res.status(500).json({ error: 'Errore interno del server' });
  }
  try {
    const action = String(req.body.action || '').trim() || 'LOG';
    const details = req.body.details || {};
    await adminLog(client, action, req.adminUser || 'admin', details);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    if (client) client.release();
  }
});

function requireAdmin(req, res, next) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return res.status(500).json({ error: 'JWT_NOT_CONFIGURED' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.adminUser = payload && payload.user ? String(payload.user) : 'admin';
    req.adminRole = payload && payload.role ? String(payload.role) : '';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

function tryGetAdminFromReq(req) {
  const auth = String(req && req.headers && req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    return {
      user: payload && payload.user ? String(payload.user) : 'admin',
      role: payload && payload.role ? String(payload.role) : '',
    };
  } catch {
    return null;
  }
}

function requireSuperuser(req, res, next) {
  if (req && req.adminRole === 'superuser') return next();
  return res.status(403).json({ error: 'FORBIDDEN' });
}

app.get('/api/settings', requireAdmin, (req, res) => {
  const includeSecrets = String(req.query && req.query.include_secrets || '') === '1' && req.adminRole === 'superuser';
  const base = buildSettingsForApi({ includeSecrets });
  res.json({
    ...base,
    defs: SETTINGS_DEFS.map(d => ({ key: d.key, type: d.type, is_secret: d.is_secret, aliases: Array.isArray(d.aliases) ? d.aliases : [] })),
  });
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  const body = req && req.body && typeof req.body === 'object' ? req.body : null;
  const input = body && body.settings && typeof body.settings === 'object' ? body.settings : body;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return res.status(400).json({ error: 'BAD_REQUEST' });

  const flat = flattenSettingsInput(input);
  const written = [];
  const errors = {};

  for (const [k, v] of Object.entries(flat)) {
    const key = String(k || '').trim();
    const def = SETTINGS_DEF_BY_KEY.get(key);
    if (!def) continue;
    const r = validateAndSerializeForDef(def, v);
    if (!r.ok) {
      errors[key] = r.error || 'INVALID_VALUE';
      continue;
    }
    if (r.skip) continue;
    const ok = await upsertSetting(def.key, r.value, def.is_secret);
    if (!ok) {
      errors[key] = 'WRITE_FAILED';
      continue;
    }
    written.push(def.key);
  }

  if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION_ERROR', errors, written });
  try { wsEmitInvalidate('settings', { action: 'updated', keys: written, user: req.adminUser || 'admin' }); } catch {}
  res.json({
    ok: true,
    written,
    ...buildSettingsForApi({ includeSecrets: false }),
    defs: SETTINGS_DEFS.map(d => ({ key: d.key, type: d.type, is_secret: d.is_secret, aliases: Array.isArray(d.aliases) ? d.aliases : [] })),
  });
});

function isDbUnavailable(err) {
  const code = String(err && err.code || '');
  if (code === 'DB_NOT_CONFIGURED') return true;
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return true;
  const msg = String(err && err.message || '').toLowerCase();
  if (msg.includes('getaddrinfo') || msg.includes('enotfound')) return true;
  return false;
}

// Rotta di prova per verificare che il server sia online
app.get('/', (req, res) => {
  res.send('Backend di Roulotte.online attivo e funzionante!');
});

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const expected = Buffer.from(parts[2], 'hex');
  const calc = Buffer.from(crypto.scryptSync(pw, salt, 64).toString('hex'), 'hex');
  if (expected.length !== calc.length) return false;
  return crypto.timingSafeEqual(expected, calc);
}

app.post('/api/auth/login', async (req, res) => {
  const u = String(req.body.username || '').trim();
  const p = String(req.body.password || '');
  const key = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') + '|' + u;
  const limit = Number(process.env.LOGIN_RATE_LIMIT || 20);
  const windowMs = Number(process.env.LOGIN_RATE_WINDOW_MS || 10 * 60 * 1000);
  global.__loginAttempts = global.__loginAttempts || new Map();
  const now = Date.now();
  const rec = global.__loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  if (rec.count >= limit) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });

  // 1. Super User / Fallback (Env Vars) - Check FIRST (Master Override)
  const okU = ENV_ADMIN_USER;
  const okP = ENV_ADMIN_PASS;
  if (okU && okP && u === okU && p === okP) {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_NOT_CONFIGURED' });
    const token = jwt.sign({ user: u, role: 'superuser' }, jwtSecret, { expiresIn: getJwtExpiresIn() });
    return res.json({ token });
  }

  // 2. DB Users
  try {
    const { rows } = await pool.query('SELECT username, password_hash FROM admin_users WHERE username = $1 LIMIT 1;', [u]);
    if (rows.length) {
      const row = rows[0];
      const ok = verifyPassword(p, String(row.password_hash));
      if (!ok) { rec.count++; global.__loginAttempts.set(key, rec); return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); }
      const jwtSecret = getJwtSecret();
      if (!jwtSecret) return res.status(500).json({ error: 'JWT_NOT_CONFIGURED' });
      const token = jwt.sign({ user: u }, jwtSecret, { expiresIn: getJwtExpiresIn() });
      return res.json({ token });
    }
  } catch {}

  rec.count++; 
  global.__loginAttempts.set(key, rec); 
  return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
});

app.post('/api/auth/setup', async (req, res) => {
  const u = String(req.body.username || '').trim();
  const p = String(req.body.password || '');
  if (!u || !p) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const { rows } = await pool.query('SELECT COUNT(1) AS c FROM admin_users;');
    if (Number(rows[0]?.c || 0) > 0) return res.status(403).json({ error: 'EXISTS' });
    const h = hashPassword(p);
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2);', [u, h]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/auth/reset', async (req, res) => {
  const code = String(req.headers['x-admin-reset'] || '');
  const jwtSecret = getJwtSecret();
  const resetToken = getAdminResetToken();
  const tokenOk = code && (code === resetToken || (jwtSecret && code === jwtSecret));
  if (!tokenOk) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const u = String(req.body.username || '').trim();
  const p = String(req.body.password || '');
  if (!u || !p) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const h = hashPassword(p);
    const up = `
      INSERT INTO admin_users (username, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.query(up, [u, h]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/admin/whoami', requireAdmin, (req, res) => {
  res.json({ user: req.adminUser || 'admin', role: req.adminRole || '' });
});

app.get('/api/admin/users', requireAdmin, requireSuperuser, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT username, created_at, updated_at FROM admin_users ORDER BY username ASC;');
    res.json((rows || []).map(r => ({
      username: String(r.username || ''),
      created_at: r.created_at || null,
      updated_at: r.updated_at || null,
    })));
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/admin/users', requireAdmin, requireSuperuser, async (req, res) => {
  const username = String(req.body && req.body.username || '').trim();
  const password = String(req.body && req.body.password || '');
  if (!username || !password) return res.status(400).json({ error: 'BAD_REQUEST' });
  if (username.length > 120) return res.status(400).json({ error: 'BAD_REQUEST' });

  try {
    const h = hashPassword(password);
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2);', [username, h]);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (String(err && err.code || '') === '23505') return res.status(409).json({ error: 'EXISTS' });
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.delete('/api/admin/users/:username', requireAdmin, requireSuperuser, async (req, res) => {
  const username = String(req.params.username || '').trim();
  if (!username) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const r = await pool.query('DELETE FROM admin_users WHERE username = $1;', [username]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ ok: true });
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/admin/users/:username/password', requireAdmin, requireSuperuser, async (req, res) => {
  const username = String(req.params.username || '').trim();
  const password = String(req.body && req.body.password || '');
  if (!username || !password) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const h = hashPassword(password);
    const r = await pool.query('UPDATE admin_users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE username = $1;', [username, h]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ ok: true });
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// Login con Google: riceve id_token dal client, valida tramite tokeninfo e rilascia JWT
app.post('/api/auth/google', async (req, res) => {
  try {
    const idToken = String(req.body && req.body.id_token || '').trim();
    if (!idToken) return res.status(400).json({ error: 'BAD_REQUEST' });
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    const resp = await fetch(url);
    if (!resp.ok) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const info = await resp.json();
    const aud = String(info && info.aud || '');
    const email = String(info && info.email || '');
    const emailVerified = String(info && info.email_verified || '') === 'true';
    const googleClientId = getGoogleClientId();
    if (!googleClientId || aud !== googleClientId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (!email || !emailVerified) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // Sicurezza: Whitelist email
    const allowed = String(process.env.ALLOWED_GOOGLE_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(email.toLowerCase())) {
      console.warn(`Tentativo di login Google bloccato per email non autorizzata: ${email}`);
      return res.status(403).json({ error: 'FORBIDDEN_EMAIL' });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_NOT_CONFIGURED' });
    const token = jwt.sign({ user: email, provider: 'google' }, jwtSecret, { expiresIn: getJwtExpiresIn() });
    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/content/:key', async (req, res) => {
  const key = String(req.params.key || '').trim();
  try {
    if (!key) return res.status(400).json({ error: 'BAD_REQUEST' });
    let isAdmin = false;
    try {
      const auth = String(req.headers.authorization || '');
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (token) {
        const jwtSecret = getJwtSecret();
        if (jwtSecret) {
          jwt.verify(token, jwtSecret);
          isAdmin = true;
        }
      }
    } catch {}

    const { rows } = await pool.query('SELECT content_key, content_type, published_data, updated_at FROM contents WHERE content_key = $1;', [key]);
    const base = rows && rows[0] ? rows[0] : null;
    const publishedData = String(base && base.published_data || '');
    const publishedUpdatedAt = base && base.updated_at ? base.updated_at : null;
    const publishedType = String(base && base.content_type || 'html') || 'html';

    let draftData = '';
    let draftType = '';
    let draftCreatedAt = null;
    if (isAdmin) {
      try {
        const dr = await pool.query(
          'SELECT data, content_type, created_at FROM content_revisions WHERE content_key = $1 ORDER BY created_at DESC LIMIT 1;',
          [key]
        );
        if (dr.rows && dr.rows[0]) {
          draftData = String(dr.rows[0].data || '');
          draftType = String(dr.rows[0].content_type || '');
          draftCreatedAt = dr.rows[0].created_at || null;
        }
      } catch {}
    }

    const outType = (isAdmin ? (draftType || publishedType) : publishedType) || 'html';
    const outData = isAdmin ? (draftData || publishedData) : publishedData;

    res.json({
      content_key: key,
      content_type: outType,
      data: outData || '',
      published_data: publishedData || '',
      updated_at: isAdmin ? (draftCreatedAt || publishedUpdatedAt) : publishedUpdatedAt,
      published_updated_at: publishedUpdatedAt,
    });
  } catch (err) {
    if (key && isDbUnavailable(err)) {
      return res.json({ content_key: key, content_type: 'html', data: '', published_data: '', updated_at: null, published_updated_at: null });
    }
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/contents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT content_key, content_type, updated_at FROM contents ORDER BY content_key;');
    res.json(rows);
  } catch (err) {
    if (isDbUnavailable(err)) return res.json([]);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/content/:key/revisions', requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ error: 'BAD_REQUEST' });
    const { rows } = await pool.query(
      'SELECT id, content_key, content_type, username, created_at FROM content_revisions WHERE content_key = $1 ORDER BY created_at DESC LIMIT 50;',
      [key]
    );
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/content/revision/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
    const { rows } = await pool.query('SELECT id, content_key, content_type, data, username, created_at FROM content_revisions WHERE id = $1;', [id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/content', requireAdmin, async (req, res) => {
  const key = String(req.body.content_key || '').trim();
  const type = String(req.body.content_type || 'html').trim();
  const data = String(req.body.data || '');
  if (!key || !data) return res.status(400).json({ error: 'BAD_REQUEST' });
  if (data.length > 200000) return res.status(400).json({ error: 'CONTENT_TOO_LARGE' });
  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server' });
  }
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO content_revisions (content_key, data, content_type, username) VALUES ($1, $2, $3, $4);', [key, data, type, req.adminUser || 'admin']);
    const up = `
      INSERT INTO contents (content_key, content_type, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (content_key) DO UPDATE SET content_type = EXCLUDED.content_type, updated_at = CURRENT_TIMESTAMP
      RETURNING content_key;
    `;
    await client.query(up, [key, type]);
    await client.query('COMMIT');
    wsEmitInvalidate('contents', { action: 'draft_saved', key, user: req.adminUser || 'admin' });
    res.json({ ok: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/content/:key/publish', requireAdmin, async (req, res) => {
  const key = String(req.params.key || '').trim();
  if (!key) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const { rows } = await pool.query('SELECT data, content_type FROM content_revisions WHERE content_key = $1 ORDER BY created_at DESC LIMIT 1;', [key]);
    const rev = rows[0];
    await pool.query(`
      INSERT INTO contents (content_key, content_type, published_data, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (content_key) DO UPDATE SET content_type = EXCLUDED.content_type, published_data = EXCLUDED.published_data, updated_at = CURRENT_TIMESTAMP;
    `, [key, rev ? rev.content_type : 'html', rev ? rev.data : '']);
    wsEmitInvalidate('contents', { action: 'published', key, user: req.adminUser || 'admin' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/content/:key/publish_revision', requireAdmin, async (req, res) => {
  const key = String(req.params.key || '').trim();
  const revisionId = Number(req.body && req.body.revision_id || 0);
  if (!key || !Number.isFinite(revisionId) || revisionId <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    const { rows } = await pool.query('SELECT data, content_type FROM content_revisions WHERE id = $1 AND content_key = $2;', [revisionId, key]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    const rev = rows[0];
    await pool.query(
      `
        INSERT INTO contents (content_key, content_type, published_data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (content_key) DO UPDATE
        SET content_type = EXCLUDED.content_type, published_data = EXCLUDED.published_data, updated_at = CURRENT_TIMESTAMP;
      `,
      [key, String(rev.content_type || 'html'), String(rev.data || '')]
    );
    wsEmitInvalidate('contents', { action: 'published', key, user: req.adminUser || 'admin', revision_id: revisionId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/deploy/trigger', requireAdmin, async (req, res) => {
  try {
    const deployHookUrl = getRenderDeployHookUrl();
    const renderApiKey = getRenderApiKey();
    const renderServiceId = getRenderServiceId();

    if (deployHookUrl) {
      let parsedHook = null;
      try {
        const u = new URL(deployHookUrl);
        const host = String(u.hostname || '').toLowerCase();
        if (u.protocol !== 'https:') return res.status(400).json({ error: 'RENDER_CONFIG', detail: 'DEPLOY_HOOK_URL_NOT_HTTPS' });
        if (host !== 'api.render.com') return res.status(400).json({ error: 'RENDER_CONFIG', detail: 'DEPLOY_HOOK_URL_HOST_NOT_ALLOWED' });
        parsedHook = u.toString();
      } catch {
        return res.status(400).json({ error: 'RENDER_CONFIG', detail: 'DEPLOY_HOOK_URL_INVALID' });
      }

      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 15000);
      let r = null;
      try {
        r = await fetch(parsedHook, { method: 'POST', signal: controller.signal });
      } catch (err) {
        clearTimeout(tId);
        return res.status(502).json({ error: 'RENDER_HOOK_ERROR', detail: String(err && err.message ? err.message : err) });
      }
      clearTimeout(tId);
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return res.status(r.status).json({ error: 'RENDER_HOOK_ERROR', detail: t || r.statusText || '' });
      }
      return res.json({ ok: true, mode: 'hook' });
    }

    if (!renderApiKey || !renderServiceId) {
      return res.status(500).json({
        error: 'RENDER_CONFIG',
        have: {
          deploy_hook_url: !!deployHookUrl,
          api_key: !!renderApiKey,
          service_id: !!renderServiceId,
        },
        need_one_of: [
          { deploy_hook_url: true },
          { api_key: true, service_id: true },
        ],
      });
    }

    const url = `https://api.render.com/v1/services/${renderServiceId}/deploys`;
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 15000);
    let r = null;
    try {
      r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${renderApiKey}` }, signal: controller.signal });
    } catch (err) {
      clearTimeout(tId);
      return res.status(502).json({ error: 'RENDER_ERROR', detail: String(err && err.message ? err.message : err) });
    }
    clearTimeout(tId);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: 'RENDER_ERROR', detail: j });
    res.json({ ok: true, mode: 'api', deploy: j });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  }
});

// Esportazione dati (JSON) protetta
app.get('/api/export', requireAdmin, async (req, res) => {
  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server' });
  }
  try {
    const out = {};
    const tables = [
      { key: 'roulottes', q: 'SELECT id, public_id, title, description, price, year, weight, length, beds, data, visibile, created_at, updated_at FROM roulottes ORDER BY id;' },
      { key: 'photos', q: 'SELECT id, roulotte_id, url_full, url_thumb, is_cover, sort_order, created_at FROM photos ORDER BY id;' },
      { key: 'media', q: 'SELECT id, url_full, url_thumb, title, alt, created_at FROM media ORDER BY id;' },
      { key: 'contents', q: 'SELECT content_key, content_type, published_data, updated_at FROM contents ORDER BY content_key;' },
    ];
    for (const t of tables) {
      const r = await client.query(t.q);
      out[t.key] = r.rows || [];
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/media', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, url_full, url_thumb, title, alt, created_at FROM media ORDER BY id DESC LIMIT 200;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/media', requireAdmin, uploadArray('files', getUploadMaxFiles()), async (req, res) => {
  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  }
  try {
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      return res.status(500).json({ error: 'STORAGE_CONFIG' });
    }
    await client.query('BEGIN');
    const out = [];
    if (!req.files || req.files.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'NO_FILES' });
    }
    if (req.files) {
      const allowed = new Set(getUploadAllowedMimes());
      const maxBytes = getUploadMaxBytes();
      for (const file of req.files) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!allowed.has(mt)) {
          await client.query('ROLLBACK');
          return res.status(415).json({ error: 'UNSUPPORTED_FORMAT' });
        }
        if (sz > maxBytes) {
          await client.query('ROLLBACK');
          return res.status(413).json({ error: 'FILE_TOO_LARGE' });
        }
        const fileName = generateFileName();
        const params = { Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'public, max-age=31536000, immutable' };
        try {
          await s3Client.send(new PutObjectCommand(params));
        } catch (e) {
          await client.query('ROLLBACK');
          return res.status(502).json({ error: 'STORAGE_ERROR', detail: String(e && e.message ? e.message : e) });
        }
        if (process.env.R2_BACKUP_BUCKET_NAME) {
          const backupParams = { Bucket: process.env.R2_BACKUP_BUCKET_NAME, Key: fileName, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'public, max-age=31536000, immutable' };
          try { await s3Client.send(new PutObjectCommand(backupParams)); } catch {}
        }
        const url = joinUrl(process.env.R2_PUBLIC_URL, fileName);
        const { rows } = await client.query('INSERT INTO media (url_full, url_thumb, title, alt) VALUES ($1, $2, $3, $4) RETURNING id;', [url, url, null, null]);
        out.push({ id: rows[0].id, url_full: url, url_thumb: url });
      }
    }
    await client.query('COMMIT');
    res.json(out);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  } finally {
    if (client) client.release();
  }
});

app.delete('/api/media/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    await pool.query('DELETE FROM media WHERE id = $1;', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});
// Rotta per ottenere tutte le roulotte con le loro foto
app.get('/api/roulottes', async (req, res) => {
  try {
    const admin = tryGetAdminFromReq(req);
    const isAdmin = !!admin;

    if (directusEnabled()) {
      try {
        const list = isAdmin ? await fetchDirectusRoulottesForAdmin() : await fetchDirectusRoulottes();
        return res.json(list);
      } catch (e) {
        console.warn('Directus non disponibile, fallback al DB:', String(e && e.message ? e.message : e));
      }
    }

    const query = `
      SELECT 
        r.public_id AS id,
        r.data AS data,
        r.visibile AS visibile,
        r.created_at AS created_at,
        r.updated_at AS updated_at,
        COALESCE(
          (
            SELECT json_agg(p.url_full ORDER BY p.sort_order)
            FROM photos p 
            WHERE p.roulotte_id = r.id
          ), '[]'::json
        ) AS photos
      FROM roulottes r
      ORDER BY r.id DESC;
    `;

    const result = await pool.query(query);
    const now = Date.now();
    const list = result.rows.map((row) => ({
        ...(row.data || {}),
        id: row.id,
        photos: (row.photos || []).map(normalizePhotoUrlToCurrentPublicBase),
        visibile: row.visibile !== undefined && row.visibile !== null ? row.visibile : true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

    if (isAdmin) return res.json(list);

    const allowed = new Set(['pubblicato', 'venduto']);
    const out = list.filter((r) => {
      if (!r || typeof r !== 'object') return false;
      if (r.visibile === false) return false;
      const sRaw = r.stato_annuncio !== undefined && r.stato_annuncio !== null ? String(r.stato_annuncio) : '';
      const fallback = String(r.stato || '') === 'Venduto' ? 'venduto' : 'pubblicato';
      const s = (sRaw || fallback).trim().toLowerCase();
      if (!allowed.has(s)) return false;
      if (s === 'pubblicato' && r.data_pubblicazione) {
        const t = Date.parse(String(r.data_pubblicazione));
        if (Number.isFinite(t) && t > now) return false;
      }
      return true;
    });

    res.json(out);

  } catch (err) {
    if (isDbUnavailable(err)) return res.json([]);
    console.error('Errore durante il recupero delle roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 36) || 36, 1), 100);
    const stato = String(req.query.stato || '').trim();
    const min = req.query.min !== undefined ? Number(req.query.min) : null;
    const max = req.query.max !== undefined ? Number(req.query.max) : null;
    const hasPhoto = String(req.query.photo || '') === '1';
    const sort = String(req.query.sort || '').trim();

    const client = getMeiliClient();
    if (!client) return res.status(404).json({ error: 'NOT_CONFIGURED' });
    const index = client.index(getMeiliIndex());

    const filters = [];
    if (stato) filters.push(`stato = "${stato.replace(/"/g, '\\"')}"`);
    if (Number.isFinite(min)) filters.push(`prezzo >= ${min}`);
    if (Number.isFinite(max)) filters.push(`prezzo <= ${max}`);
    if (hasPhoto) filters.push(`hasPhoto = true`);

    let sortBy = null;
    if (sort === 'priceAsc') sortBy = 'prezzo:asc';
    else if (sort === 'priceDesc') sortBy = 'prezzo:desc';
    else if (sort === 'yearDesc') sortBy = 'anno:desc';
    else if (sort === 'yearAsc') sortBy = 'anno:asc';
    else if (sort === 'newest') sortBy = 'updatedAt:desc';

    const result = await index.search(q || '', {
      limit,
      filter: filters.length ? filters.join(' AND ') : undefined,
      sort: sortBy ? [sortBy] : undefined
    });

    const hits = result && typeof result === 'object' && Array.isArray(result.hits) ? result.hits : [];
    const list = hits.map((h) => {
      const obj = (h && typeof h === 'object') ? h : {};
      const photos = Array.isArray(obj.photos) ? obj.photos : [];
      return {
        ...obj,
        id: String(obj.id || '').trim() || null,
        photos
      };
    }).filter(x => x && x.id);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/meili/reindex', requireAdmin, async (req, res) => {
  try {
    const client = getMeiliClient();
    if (!client) return res.status(400).json({ error: 'MEILI_NOT_CONFIGURED' });
    if (!directusEnabled()) return res.status(400).json({ error: 'DIRECTUS_NOT_CONFIGURED' });

    const list = await fetchDirectusRoulottes();
    const docs = list.map(r => {
      const photos = Array.isArray(r.photos) ? r.photos : [];
      const first = photos[0] || null;
      return {
        id: r.id,
        marca: r.marca || '',
        modello: r.modello || '',
        stato: r.stato || '',
        prezzo: Number.isFinite(Number(r.prezzo)) ? Number(r.prezzo) : null,
        anno: Number.isFinite(Number(r.anno)) ? Number(r.anno) : null,
        lunghezza: r.lunghezza !== undefined ? r.lunghezza : null,
        larghezza: r.larghezza !== undefined ? r.larghezza : null,
        note: r.note || '',
        descrizione: r.note || '',
        createdAt: r.createdAt || null,
        updatedAt: r.updatedAt || null,
        hasPhoto: photos.length > 0,
        photos,
        photo: first
      };
    });

    const index = client.index(getMeiliIndex());
    await index.updateSettings({
      searchableAttributes: ['marca', 'modello', 'note', 'descrizione', 'id', 'stato'],
      filterableAttributes: ['stato', 'hasPhoto', 'prezzo', 'anno'],
      sortableAttributes: ['prezzo', 'anno', 'createdAt', 'updatedAt']
    });
    await index.addDocuments(docs, { primaryKey: 'id' });
    res.json({ ok: true, indexed: docs.length });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: String(err && err.message ? err.message : err) });
  }
});

// Proxy ORS: riceve indirizzi, fa geocoding+route, restituisce distanza/durata/geom
app.post('/api/transport/route', async (req, res) => {
  try {
    if (!orsEnabled()) return res.status(400).json({ error: 'ORS_NOT_CONFIGURED' });

    const orsBaseUrl = getOrsBaseUrl();
    const orsProfile = getOrsProfile();
    if (!orsBaseUrl || !orsProfile) return res.status(400).json({ error: 'ORS_NOT_CONFIGURED' });

    const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
    const fromAddress = String(body.fromAddress || body.from || '').trim();
    const toAddress = String(body.toAddress || body.to || '').trim();
    if (!fromAddress || !toAddress) return res.status(400).json({ error: 'BAD_REQUEST' });

    const from = await orsGeocodeOne(fromAddress);
    if (!from) return res.status(404).json({ error: 'FROM_NOT_FOUND' });
    const to = await orsGeocodeOne(toAddress);
    if (!to) return res.status(404).json({ error: 'TO_NOT_FOUND' });

    const routeUrl = new URL(joinUrl(orsBaseUrl, `v2/directions/${encodeURIComponent(orsProfile)}/geojson`));
    const route = await orsFetchJson(routeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[from.lon, from.lat], [to.lon, to.lat]] })
    });
    const feature = Array.isArray(route && route.features) ? route.features[0] : null;
    const summary = feature && feature.properties && feature.properties.summary ? feature.properties.summary : null;
    const distanceMeters = summary && summary.distance !== undefined ? Number(summary.distance) : null;
    const durationSeconds = summary && summary.duration !== undefined ? Number(summary.duration) : null;
    const geometry = feature && feature.geometry ? feature.geometry : null;

    const distance_km = Number.isFinite(distanceMeters) ? (distanceMeters / 1000) : null;
    const duration_min = Number.isFinite(durationSeconds) ? (durationSeconds / 60) : null;

    res.json({
      from,
      to,
      distance_km,
      duration_min,
      geometry
    });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    res.status(500).json({ error: 'SERVER_ERROR', detail: msg });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbPing = await pool.query('SELECT 1 AS ok;');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    res.json({
      ok: true,
      db: dbPing.rows && dbPing.rows[0] ? dbPing.rows[0].ok === 1 : false,
      tables: (tables.rows || []).map((r) => r.table_name),
    });
  } catch (err) {
    if (isDbUnavailable(err)) {
      return res.json({
        ok: true,
        db: false,
        tables: [],
        error: 'DB_UNAVAILABLE',
      });
    }
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
});

function parseBooleanLike(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (v === true || v === false) return v;
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'on' || s === 'si' || s === 'sì' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'off' || s === 'no') return false;
  return fallback;
}

function parseNumberLike(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function generateNextPublicId(client) {
  const { rows } = await client.query(`
    SELECT
      MAX(
        CASE
          WHEN public_id ~ '^R-[0-9]+$' THEN (SUBSTRING(public_id FROM 3))::int
          ELSE NULL
        END
      ) AS n
    FROM roulottes;
  `);
  const n = Number(rows[0]?.n || 0);
  return 'R-' + String(n + 1).padStart(4, '0');
}

// Rotta per creare una nuova roulotte con foto
app.post('/api/roulottes', requireAdmin, uploadArray('photos', getUploadMaxFiles()), async (req, res) => {
  if (directusEnabled()) {
    if (!directusWriteEnabled()) return res.status(400).json({ error: 'DIRECTUS_TOKEN_MISSING' });
    try {
      const collection = getDirectusCollection();
      const imagesField = getDirectusImagesField();
      const dataField = getDirectusDataField();
      const incoming = req.body || {};
      let raw = incoming;
      if (incoming && incoming.payload) {
        const parsed = safeJsonParse(incoming.payload);
        if (parsed && typeof parsed === 'object') raw = parsed;
      }

      const data = buildDirectusWriteDataFromIncoming(raw);
      if (data.prezzo !== undefined) data.prezzo = parseNumberLike(data.prezzo);
      if (data.lunghezza !== undefined) data.lunghezza = parseNumberLike(data.lunghezza);
      if (data.larghezza !== undefined) data.larghezza = parseNumberLike(data.larghezza);
      if (data.doppio_asse !== undefined) data.doppio_asse = parseBooleanLike(data.doppio_asse, null);
      if (data.trainabile !== undefined) data.trainabile = parseBooleanLike(data.trainabile, null);
      if (data.revisionata !== undefined) data.revisionata = parseBooleanLike(data.revisionata, null);

      const newFileIds = await directusUploadMulterFiles(req.files);
      if (newFileIds.length > 0) {
        data[imagesField] = buildDirectusImagesWriteValue(newFileIds);
      }

      const createPath = `items/${encodeURIComponent(collection)}`;
      let created = null;
      try {
        created = await directusRequestJson('POST', createPath, { body: data });
      } catch (err) {
        const status = Number(err && err.status !== undefined ? err.status : NaN);
        if (status !== 400) throw err;

        const tries = [];
        tries.push({ ...data });
        if (data[imagesField]) {
          tries.push({ ...data, [imagesField]: buildDirectusImagesWriteValue(newFileIds, 'ids') });
        }
        if (dataField && data[dataField] !== undefined) {
          const noData = { ...data };
          delete noData[dataField];
          tries.push(noData);
          if (data[imagesField]) {
            tries.push({ ...noData, [imagesField]: buildDirectusImagesWriteValue(newFileIds, 'ids') });
          }
        }

        let lastErr = err;
        for (const body of tries) {
          try {
            created = await directusRequestJson('POST', createPath, { body });
            lastErr = null;
            break;
          } catch (e2) {
            lastErr = e2;
          }
        }
        if (lastErr) throw lastErr;
      }

      const createdId =
        created && typeof created === 'object' && created.data && typeof created.data === 'object'
          ? String(created.data.id || '').trim()
          : '';
      if (!createdId) return res.status(502).json({ error: 'DIRECTUS_ERROR' });

      wsEmitInvalidate('roulottes', { action: 'created', id: createdId, user: req.adminUser || 'admin' });
      return res.status(201).json({ message: 'Roulotte creata con successo!', id: createdId });
    } catch (err) {
      const st = Number(err && err.status !== undefined ? err.status : 502);
      const code = st === 413 ? 'FILE_TOO_LARGE' : (st === 415 ? 'UNSUPPORTED_FORMAT' : 'DIRECTUS_ERROR');
      return res.status(Number.isFinite(st) ? st : 502).json({ error: code, detail: String(err && err.detail ? err.detail : (err && err.message ? err.message : err)) });
    }
  }

  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  }
  try {
    await client.query('BEGIN'); // Inizia la transazione

    const incoming = req.body || {};
    let raw = incoming;
    if (incoming && incoming.payload) {
      const parsed = safeJsonParse(incoming.payload);
      if (parsed && typeof parsed === 'object') raw = parsed;
    }
    const visibile = parseBooleanLike(raw.visibile, true);

    const publicIdFromClient = String(raw.id || '').trim();
    const publicId = publicIdFromClient || (await generateNextPublicId(client));

    const marca = String(raw.marca || '').trim();
    const modello = String(raw.modello || '').trim();
    const title = `${marca} ${modello}`.trim() || String(raw.title || '').trim() || 'Senza titolo';

    const description = String(raw.note || raw.descrizione || raw.description || '').trim() || null;
    const price = parseNumberLike(raw.prezzo ?? raw.price);
    const year = parseNumberLike(raw.anno ?? raw.year);
    const weight = parseNumberLike(raw.pesoVuoto ?? raw.weight);
    const length = parseNumberLike(raw.lunghezzaTotale ?? raw.length);
    const beds = parseNumberLike(raw.postiLetto ?? raw.beds);

    const data = { ...raw };
    delete data.photos;
    const nowIso = new Date().toISOString();
    const statoAnnRaw = data.stato_annuncio !== undefined && data.stato_annuncio !== null ? String(data.stato_annuncio) : '';
    const statoAnn = (statoAnnRaw || 'bozza').trim().toLowerCase();
    data.stato_annuncio = statoAnn;
    if (!data.dipendente_creatore) data.dipendente_creatore = req.adminUser || 'admin';
    if (!data.data_creazione) data.data_creazione = nowIso;
    if ((statoAnn === 'pubblicato' || statoAnn === 'venduto') && !data.data_pubblicazione) data.data_pubblicazione = nowIso;

    // 1. Inserisci la roulotte nel database
    const roulotteQuery = `
      INSERT INTO roulottes (title, description, price, year, weight, length, beds, public_id, data, visibile, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, CURRENT_TIMESTAMP)
      RETURNING id, public_id;
    `;
    const roulotteResult = await client.query(roulotteQuery, [
      title,
      description,
      price,
      year,
      weight,
      length,
      beds,
      publicId,
      JSON.stringify(data),
      visibile,
    ]);
    const roulotteDbId = roulotteResult.rows[0].id;
    const savedPublicId = roulotteResult.rows[0].public_id;

    // 2. Carica le foto su R2 e inserisci i riferimenti nel database
    if (req.files && req.files.length > 0) {
      if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'STORAGE_CONFIG_MISSING', detail: 'Mancano le variabili R2_BUCKET_NAME o R2_PUBLIC_URL su Render.' });
      }
      const allowed = new Set(getUploadAllowedMimes());
      const maxBytes = getUploadMaxBytes();
      for (const [index, file] of req.files.entries()) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!allowed.has(mt)) {
          await client.query('ROLLBACK');
          return res.status(415).json({ error: 'UNSUPPORTED_FORMAT' });
        }
        if (sz > maxBytes) {
          await client.query('ROLLBACK');
          return res.status(413).json({ error: 'FILE_TOO_LARGE' });
        }
        const fileName = generateFileName();
        const params = {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable'
        };

        try {
          await s3Client.send(new PutObjectCommand(params));
        } catch (e) {
          await client.query('ROLLBACK');
          return res.status(502).json({ error: 'STORAGE_ERROR', detail: String(e && e.message ? e.message : e) });
        }
        if (process.env.R2_BACKUP_BUCKET_NAME) {
          const backupParams = {
            Bucket: process.env.R2_BACKUP_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'public, max-age=31536000, immutable'
          };
          try { await s3Client.send(new PutObjectCommand(backupParams)); } catch {}
        }
        
        const photoUrl = joinUrl(process.env.R2_PUBLIC_URL, fileName);
        const photoQuery = `
          INSERT INTO photos (roulotte_id, url_full, url_thumb, sort_order, is_cover)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(photoQuery, [roulotteDbId, photoUrl, photoUrl, index, index === 0]);
      }
    } else {
      try { await insertRoulotteRevision(client, savedPublicId, 'CREATE', req.adminUser || 'admin'); } catch {}
      await client.query('COMMIT');
      try { await adminLog(client, 'CREATE_ROULOTTE', req.adminUser || 'admin', { id: savedPublicId }); } catch {}
      wsEmitInvalidate('roulottes', { action: 'created', id: savedPublicId, user: req.adminUser || 'admin' });
      return res.status(201).json({ message: 'Roulotte creata con successo!', id: savedPublicId });
    }

    try { await insertRoulotteRevision(client, savedPublicId, 'CREATE', req.adminUser || 'admin'); } catch {}
    await client.query('COMMIT'); // Conferma la transazione
    try {
      if (process.env.WEBHOOK_URL) {
        const payload = { type: 'upload_complete', id: savedPublicId, count: (req.files || []).length, user: req.adminUser || 'admin' };
        await fetch(String(process.env.WEBHOOK_URL), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
    } catch {}
    try { await adminLog(client, 'CREATE_ROULOTTE', req.adminUser || 'admin', { id: savedPublicId }); } catch {}
    wsEmitInvalidate('roulottes', { action: 'created', id: savedPublicId, user: req.adminUser || 'admin' });
    res.status(201).json({ message: 'Roulotte creata con successo!', id: savedPublicId });

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    try { await adminLog(client, 'CREATE_ROULOTTE_ERROR', req.adminUser || 'admin', { error: String(err && err.message ? err.message : err) }); } catch {}
    console.error('Errore durante la creazione della roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  } finally {
    if (client) client.release(); // Rilascia la connessione al pool
  }
});

// Rotta per aggiornare una roulotte esistente
app.put('/api/roulottes/:id', requireAdmin, uploadArray('new_photos', getUploadMaxFiles()), async (req, res) => {
  if (directusEnabled()) {
    if (!directusWriteEnabled()) return res.status(400).json({ error: 'DIRECTUS_TOKEN_MISSING' });
    try {
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).json({ error: 'BAD_REQUEST' });
      const collection = getDirectusCollection();
      const imagesField = getDirectusImagesField();
      const dataField = getDirectusDataField();

      const incoming = req.body || {};
      let raw = incoming;
      if (incoming && incoming.payload) {
        const parsed = safeJsonParse(incoming.payload);
        if (parsed && typeof parsed === 'object') raw = parsed;
      }

      const itemPath = `items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
      const fields = ['id', 'date_updated', imagesField + '.*.*.*', dataField].join(',');
      let itemRes = null;
      try {
        itemRes = await directusRequestJson('GET', itemPath, { params: { fields } });
      } catch (err) {
        const status = Number(err && err.status !== undefined ? err.status : NaN);
        if (status !== 400) throw err;
        itemRes = await directusRequestJson('GET', itemPath);
      }
      const current = itemRes && typeof itemRes === 'object' ? itemRes.data : null;
      if (!current) return res.status(404).json({ error: 'NOT_FOUND' });

      const currentUpdatedAt = current.date_updated ? new Date(current.date_updated).toISOString() : null;
      const expectedUpdatedAt = String(req.headers['x-if-updated-at'] || raw.updatedAt || '').trim();
      if (expectedUpdatedAt && currentUpdatedAt) {
        const e = Date.parse(expectedUpdatedAt);
        const c = Date.parse(currentUpdatedAt);
        if (Number.isFinite(e) && Number.isFinite(c) && e < c) {
          return res.status(409).json({ error: 'CONFLICT', currentUpdatedAt });
        }
      }

      const patch = buildDirectusWriteDataFromIncoming(raw);
      if (patch.prezzo !== undefined) patch.prezzo = parseNumberLike(patch.prezzo);
      if (patch.lunghezza !== undefined) patch.lunghezza = parseNumberLike(patch.lunghezza);
      if (patch.larghezza !== undefined) patch.larghezza = parseNumberLike(patch.larghezza);
      if (patch.doppio_asse !== undefined) patch.doppio_asse = parseBooleanLike(patch.doppio_asse, null);
      if (patch.trainabile !== undefined) patch.trainabile = parseBooleanLike(patch.trainabile, null);
      if (patch.revisionata !== undefined) patch.revisionata = parseBooleanLike(patch.revisionata, null);

      const currentIds = normalizeDirectusImageIdsFromField(current[imagesField]);

      let keptIds = currentIds;
      if (raw.existing_photos !== undefined) {
        keptIds = [];
        const parsed = parseJsonOrNull(raw.existing_photos);
        const list = Array.isArray(parsed) ? parsed : [];
        for (const u of list) {
          const fid = parseDirectusAssetIdFromUrl(u);
          if (fid) keptIds.push(fid);
        }
      }

      const newFileIds = await directusUploadMulterFiles(req.files);
      const finalIds = [...(keptIds || []), ...(newFileIds || [])].map(x => String(x || '').trim()).filter(Boolean);
      const uniq = Array.from(new Set(finalIds));
      if (raw.existing_photos !== undefined || newFileIds.length > 0) {
        patch[imagesField] = buildDirectusImagesWriteValue(uniq);
      }

      const updPath = `items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
      try {
        await directusRequestJson('PATCH', updPath, { body: patch });
      } catch (err) {
        const status = Number(err && err.status !== undefined ? err.status : NaN);
        if (status !== 400) throw err;

        const tries = [];
        tries.push({ ...patch });
        if (patch[imagesField]) {
          tries.push({ ...patch, [imagesField]: buildDirectusImagesWriteValue(uniq, 'ids') });
        }
        if (dataField && patch[dataField] !== undefined) {
          const noData = { ...patch };
          delete noData[dataField];
          tries.push(noData);
          if (patch[imagesField]) {
            tries.push({ ...noData, [imagesField]: buildDirectusImagesWriteValue(uniq, 'ids') });
          }
        }

        let lastErr = err;
        for (const body of tries) {
          try {
            await directusRequestJson('PATCH', updPath, { body });
            lastErr = null;
            break;
          } catch (e2) {
            lastErr = e2;
          }
        }
        if (lastErr) throw lastErr;
      }

      wsEmitInvalidate('roulottes', { action: 'updated', id, user: req.adminUser || 'admin' });
      return res.json({ ok: true, id });
    } catch (err) {
      const st = Number(err && err.status !== undefined ? err.status : 502);
      const code = st === 413 ? 'FILE_TOO_LARGE' : (st === 415 ? 'UNSUPPORTED_FORMAT' : 'DIRECTUS_ERROR');
      return res.status(Number.isFinite(st) ? st : 502).json({ error: code, detail: String(err && err.detail ? err.detail : (err && err.message ? err.message : err)) });
    }
  }

  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  }
  try {
    await client.query('BEGIN');

    const publicId = req.params.id;
    if (!publicId) return res.status(400).json({ error: 'BAD_REQUEST' });

    const incoming = req.body || {};
    let raw = incoming;
    if (incoming && incoming.payload) {
      const parsed = safeJsonParse(incoming.payload);
      if (parsed && typeof parsed === 'object') raw = parsed;
    }

    // Verifica esistenza
    const check = await client.query('SELECT id, updated_at, created_at, data FROM roulottes WHERE public_id = $1', [publicId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const dbId = check.rows[0].id;
    const currentUpdatedAt = check.rows[0].updated_at ? new Date(check.rows[0].updated_at).toISOString() : null;
    const currentCreatedAt = check.rows[0].created_at ? new Date(check.rows[0].created_at).toISOString() : null;
    const currentData = (check.rows[0].data && typeof check.rows[0].data === 'object') ? check.rows[0].data : {};

    const expectedUpdatedAt = String(req.headers['x-if-updated-at'] || raw.updatedAt || '').trim();
    if (expectedUpdatedAt && currentUpdatedAt) {
      const e = Date.parse(expectedUpdatedAt);
      const c = Date.parse(currentUpdatedAt);
      if (Number.isFinite(e) && Number.isFinite(c) && e < c) {
        await client.query('ROLLBACK');
        try { await adminLog(client, 'UPDATE_ROULOTTE_CONFLICT', req.adminUser || 'admin', { id: publicId, expectedUpdatedAt, currentUpdatedAt }); } catch {}
        return res.status(409).json({ error: 'CONFLICT', currentUpdatedAt });
      }
    }

    const visibile = parseBooleanLike(raw.visibile, true);
    
    const marca = String(raw.marca || '').trim();
    const modello = String(raw.modello || '').trim();
    const title = `${marca} ${modello}`.trim() || String(raw.title || '').trim() || 'Senza titolo';

    const description = String(raw.note || raw.descrizione || raw.description || '').trim() || null;
    const price = parseNumberLike(raw.prezzo ?? raw.price);
    const year = parseNumberLike(raw.anno ?? raw.year);
    const weight = parseNumberLike(raw.pesoVuoto ?? raw.weight);
    const length = parseNumberLike(raw.lunghezzaTotale ?? raw.length);
    const beds = parseNumberLike(raw.postiLetto ?? raw.beds);

    const data = { ...raw };
    // Rimuoviamo campi speciali dal blob json
    delete data.new_photos;
    delete data.existing_photos;
    delete data.photos;
    const nowIso = new Date().toISOString();
    const prevStatoAnnRaw = currentData.stato_annuncio !== undefined && currentData.stato_annuncio !== null ? String(currentData.stato_annuncio) : '';
    const prevFallback = String(currentData.stato || '') === 'Venduto' ? 'venduto' : '';
    const prevStatoAnn = (prevStatoAnnRaw || prevFallback).trim().toLowerCase();
    const nextStatoAnnRaw = data.stato_annuncio !== undefined && data.stato_annuncio !== null ? String(data.stato_annuncio) : '';
    const nextStatoAnn = (nextStatoAnnRaw || prevStatoAnn || 'bozza').trim().toLowerCase();
    data.stato_annuncio = nextStatoAnn;
    if (!data.dipendente_creatore) data.dipendente_creatore = currentData.dipendente_creatore || (req.adminUser || 'admin');
    if (!data.data_creazione) data.data_creazione = currentData.data_creazione || currentCreatedAt || nowIso;
    if ((nextStatoAnn === 'pubblicato' || nextStatoAnn === 'venduto')) {
      const hadPub = !!(currentData && currentData.data_pubblicazione);
      if (!data.data_pubblicazione && (!hadPub || (prevStatoAnn !== 'pubblicato' && prevStatoAnn !== 'venduto'))) {
        data.data_pubblicazione = nowIso;
      }
    }

    // 1. Aggiorna dati testuali
    const updateQuery = `
      UPDATE roulottes
      SET title = $1, description = $2, price = $3, year = $4, weight = $5, length = $6, beds = $7, 
          data = data || $8::jsonb, visibile = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
    `;
    await client.query(updateQuery, [
      title, description, price, year, weight, length, beds, JSON.stringify(data), visibile, dbId
    ]);

    // 2. Gestione foto esistenti (Sync cancellazioni)
    // raw.existing_photos dovrebbe essere una stringa JSON di array di URL
    let keptUrls = [];
    if (raw.existing_photos) {
      try {
        const parsed = JSON.parse(raw.existing_photos);
        if (Array.isArray(parsed)) keptUrls = parsed.map(u => String(u).trim());
      } catch {}
    }
    
    // Se è stato passato un elenco di foto esistenti, cancelliamo quelle non presenti
    // Se non è stato passato (es. null/undefined), assumiamo di non voler toccare le foto esistenti (o gestirlo diversamente?)
    // Per sicurezza: se existing_photos è presente (anche array vuoto), sincronizziamo. Se manca del tutto, ignoriamo.
    if (raw.existing_photos !== undefined) {
      const currentPhotosRes = await client.query('SELECT id, url_full FROM photos WHERE roulotte_id = $1', [dbId]);
      const currentPhotos = currentPhotosRes.rows;
      
      for (const p of currentPhotos) {
        // Logica di matching semplice: se l'URL salvato non è nella lista dei keptUrls, elimina.
        // Attenzione: i client potrebbero avere URL normalizzati o relativi.
        // Cerchiamo di matchare la parte finale (filename) se l'URL completo fallisce?
        // Per ora proviamo match esatto o "contains".
        
        const match = keptUrls.some(k => k === p.url_full || k.endsWith(p.url_full) || p.url_full.endsWith(k));
        if (!match) {
           await client.query('DELETE FROM photos WHERE id = $1', [p.id]);
           // Opzionale: cancellare anche da R2? Per ora lasciamo i file orfani o gestiamoli con un cron job.
        }
      }
    }

    // 3. Carica nuove foto
    if (req.files && req.files.length > 0) {
      if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
         // Se manca config storage, non possiamo caricare foto. 
         // Ma l'update testuale è andato. Vogliamo fallire tutto o solo avvisare?
         // Meglio fallire per coerenza.
         await client.query('ROLLBACK');
         return res.status(500).json({ error: 'STORAGE_CONFIG_MISSING', detail: 'Mancano variabili R2.' });
      }

      // Trova l'ordine massimo attuale per accodare
      const ordRes = await client.query('SELECT MAX(sort_order) as m FROM photos WHERE roulotte_id = $1', [dbId]);
      let maxOrd = Number(ordRes.rows[0]?.m || 0);

      const allowed = new Set(getUploadAllowedMimes());
      const maxBytes = getUploadMaxBytes();
      for (const file of req.files) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!allowed.has(mt)) continue;
        if (sz > maxBytes) continue;
        
        const fileName = generateFileName();
        const params = {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable'
        };

        try {
          await s3Client.send(new PutObjectCommand(params));
        } catch (e) {
           // Skip failed upload or rollback? Skip single file safest here.
           continue;
        }
        
        if (process.env.R2_BACKUP_BUCKET_NAME) {
          try {
             await s3Client.send(new PutObjectCommand({
               Bucket: process.env.R2_BACKUP_BUCKET_NAME, Key: fileName, Body: file.buffer, ContentType: file.mimetype
             })); 
          } catch {}
        }
        
        const photoUrl = joinUrl(process.env.R2_PUBLIC_URL, fileName);
        maxOrd++;
        await client.query(`
          INSERT INTO photos (roulotte_id, url_full, url_thumb, sort_order, is_cover)
          VALUES ($1, $2, $3, $4, $5)
        `, [dbId, photoUrl, photoUrl, maxOrd, false]);
      }
    }

    try { await insertRoulotteRevision(client, publicId, 'UPDATE', req.adminUser || 'admin'); } catch {}
    await client.query('COMMIT');
    try { await adminLog(client, 'UPDATE_ROULOTTE', req.adminUser || 'admin', { id: publicId }); } catch {}
    wsEmitInvalidate('roulottes', { action: 'updated', id: publicId, user: req.adminUser || 'admin' });
    res.json({ ok: true, id: publicId });

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    try { await adminLog(client, 'UPDATE_ROULOTTE_ERROR', req.adminUser || 'admin', { id: String(req.params.id || ''), error: String(err && err.message ? err.message : err) }); } catch {}
    console.error('Errore update roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  } finally {
    if (client) client.release();
  }
});

app.delete('/api/roulottes/:id', requireAdmin, async (req, res) => {
  if (directusEnabled()) {
    if (!directusWriteEnabled()) return res.status(400).json({ error: 'DIRECTUS_TOKEN_MISSING' });
    try {
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).json({ error: 'BAD_REQUEST' });
      const collection = getDirectusCollection();
      await directusRequestJson('DELETE', `items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      wsEmitInvalidate('roulottes', { action: 'deleted', id, user: req.adminUser || 'admin' });
      return res.json({ ok: true });
    } catch (err) {
      const st = Number(err && err.status !== undefined ? err.status : 502);
      const code = st === 404 ? 'NOT_FOUND' : 'DIRECTUS_ERROR';
      return res.status(Number.isFinite(st) ? st : 502).json({ error: code, detail: String(err && err.detail ? err.detail : (err && err.message ? err.message : err)) });
    }
  }

  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Errore interno del server' });
  }
  try {
    const publicId = req.params.id;
    if (!publicId) return res.status(400).json({ error: 'BAD_REQUEST' });

    await client.query('BEGIN');
    const check = await client.query('SELECT id FROM roulottes WHERE public_id = $1', [publicId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const dbId = check.rows[0].id;

    try { await insertRoulotteRevision(client, publicId, 'DELETE', req.adminUser || 'admin'); } catch {}
    await client.query('DELETE FROM roulottes WHERE id = $1', [dbId]);
    // Cascade dovrebbe rimuovere le foto dal DB.

    await client.query('COMMIT');
    try { await adminLog(client, 'DELETE_ROULOTTE', req.adminUser || 'admin', { id: publicId }); } catch {}
    wsEmitInvalidate('roulottes', { action: 'deleted', id: publicId, user: req.adminUser || 'admin' });
    res.json({ ok: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    try { await adminLog(client, 'DELETE_ROULOTTE_ERROR', req.adminUser || 'admin', { id: String(req.params.id || ''), error: String(err && err.message ? err.message : err) }); } catch {}
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    if (client) client.release();
  }
});

app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    await pool.query('DELETE FROM photos WHERE id = $1;', [id]);
    wsEmitInvalidate('roulottes', { action: 'photo_deleted', photoId: id, user: req.adminUser || 'admin' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.patch('/api/photos/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
  const sortOrder = req.body.sort_order;
  const isCover = req.body.is_cover;
  try {
    if (sortOrder !== undefined) await pool.query('UPDATE photos SET sort_order = $1 WHERE id = $2;', [Number(sortOrder) || 0, id]);
    if (isCover !== undefined) await pool.query('UPDATE photos SET is_cover = $1 WHERE id = $2;', [isCover === true || String(isCover).toLowerCase() === 'true', id]);
    wsEmitInvalidate('roulottes', { action: 'photo_updated', photoId: id, user: req.adminUser || 'admin' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


// Qui aggiungeremo le rotte per gestire le roulotte e le foto
// Esempio: app.use('/api/roulottes', require('./api/roulottes'));

const PORT = process.env.PORT || 3001; // Render userà la variabile d'ambiente PORT

createTables()
  .then(async () => {
    console.log('Tabelle database pronte.');
    await loadSettingsCache();
    await bootstrapCentralSettings();
    await loadSettingsCache();
  })
  .catch((err) => console.error('Errore durante la preparazione delle tabelle:', err));

server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
