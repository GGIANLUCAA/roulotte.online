const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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
app.use(express.static(path.join(__dirname, '..')));
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Config pubblica (solo parametri non sensibili)
app.get('/api/config', (req, res) => {
  res.json({ google_client_id: GOOGLE_CLIENT_ID, ors_enabled: orsEnabled() });
});

const pool = require('./db'); // Importiamo la configurazione del database
const s3Client = require('./s3-client'); // Importiamo il client S3 per R2
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const { createTables } = require('./init-db');

// Configurazione Sicurezza (Default Fallback)
const JWT_SECRET = process.env.JWT_SECRET || 'roulotte_secret_fallback_2025';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN || 'reset_token_fallback_2025';
const RENDER_API_KEY = process.env.RENDER_API_KEY || '';
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-d54pt6i4d50c739h8ob0';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

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
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      role = 'admin';
      user = payload && payload.user ? String(payload.user) : 'admin';
    } catch {}
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
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp'].includes(String(file.mimetype || '').toLowerCase());
    cb(null, ok);
  }
});

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

const DIRECTUS_URL = String(process.env.DIRECTUS_URL || '').trim();
const DIRECTUS_TOKEN = String(process.env.DIRECTUS_TOKEN || '').trim();
const DIRECTUS_COLLECTION = String(process.env.DIRECTUS_COLLECTION || 'roulottes').trim() || 'roulottes';
const DIRECTUS_ASSET_BASE_URL = String(process.env.DIRECTUS_ASSET_BASE_URL || process.env.DIRECTUS_URL || '').trim();
const DIRECTUS_IMAGES_FIELD = String(process.env.DIRECTUS_IMAGES_FIELD || 'immagini').trim() || 'immagini';
const DIRECTUS_DESC_FIELD = String(process.env.DIRECTUS_DESC_FIELD || 'descrizione').trim() || 'descrizione';

const MEILI_URL = String(process.env.MEILI_URL || '').trim();
const MEILI_API_KEY = String(process.env.MEILI_API_KEY || '').trim();
const MEILI_INDEX = String(process.env.MEILI_INDEX || 'roulottes').trim() || 'roulottes';

// OpenRouteService: la chiave resta sul backend (non esposta al frontend)
const ORS_API_KEY = String(
  process.env.ORS_API_KEY ||
  process.env.OPENROUTESERVICE_API_KEY ||
  process.env.ORS_KEY ||
  ''
).trim();

function directusEnabled() {
  return !!DIRECTUS_URL;
}

function meiliEnabled() {
  return !!MEILI_URL;
}

function orsEnabled() {
  return !!ORS_API_KEY;
}

let meiliClient = null;
function getMeiliClient() {
  if (!meiliEnabled()) return null;
  if (meiliClient) return meiliClient;
  meiliClient = new MeiliSearch({ host: MEILI_URL, apiKey: MEILI_API_KEY || undefined });
  return meiliClient;
}

async function orsFetchJson(url, init) {
  let finalUrl = String(url || '');
  try {
    const u = new URL(finalUrl);
    if (u.hostname === 'api.openrouteservice.org' && ORS_API_KEY && !u.searchParams.get('api_key')) {
      u.searchParams.set('api_key', ORS_API_KEY);
      finalUrl = u.toString();
    }
  } catch {}

  const headers = { 'Accept': 'application/json, application/geo+json' };
  if (init && init.headers && typeof init.headers === 'object') Object.assign(headers, init.headers);
  if (ORS_API_KEY) headers['Authorization'] = ORS_API_KEY;

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
    const url = new URL('https://api.openrouteservice.org/geocode/search');
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
  const base = joinUrl(DIRECTUS_URL, pathname);
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
  const base = joinUrl(DIRECTUS_ASSET_BASE_URL, `assets/${encodeURIComponent(id)}`);
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
  if (DIRECTUS_TOKEN) headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
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

function mapDirectusItemToRoulotte(item) {
  const src = (item && typeof item === 'object') ? item : {};
  const marca = String(src.marca || '').trim();
  const modello = String(src.modello || '').trim();
  const stato = String(src.stato || '').trim();
  const prezzo = src.prezzo !== undefined ? Number(src.prezzo) : null;
  const anno =
    src.anno !== undefined ? Number(src.anno) :
    (src.year !== undefined ? Number(src.year) : null);
  const lunghezza = src.lunghezza !== undefined ? Number(src.lunghezza) : null;
  const larghezza = src.larghezza !== undefined ? Number(src.larghezza) : null;
  const note = String(src[DIRECTUS_DESC_FIELD] || '').trim();

  const createdAt = src.date_created || src.created_at || src.createdAt || null;
  const updatedAt = src.date_updated || src.updated_at || src.updatedAt || createdAt || null;

  const id =
    String(src.public_id || src.publicId || src.id || '').trim() ||
    ('D-' + crypto.randomBytes(6).toString('hex'));

  const imagesRaw = src[DIRECTUS_IMAGES_FIELD];
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
    id,
    marca,
    modello,
    prezzo: Number.isFinite(prezzo) ? prezzo : null,
    anno: Number.isFinite(anno) ? anno : null,
    stato: stato || null,
    lunghezza: Number.isFinite(lunghezza) ? lunghezza : null,
    larghezza: Number.isFinite(larghezza) ? larghezza : null,
    note,
    photos,
    visibile: src.visibile === undefined || src.visibile === null ? true : !!src.visibile,
    createdAt,
    updatedAt
  };
}

async function fetchDirectusRoulottes() {
  const payload = await directusFetchJson(`items/${encodeURIComponent(DIRECTUS_COLLECTION)}`, {
    limit: '-1',
    fields: '*.*.*'
  });
  const items = payload && typeof payload === 'object' ? payload.data : [];
  const list = Array.isArray(items) ? items.map(mapDirectusItemToRoulotte) : [];
  return list.filter(r => r && typeof r === 'object');
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
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.adminUser = payload && payload.user ? String(payload.user) : 'admin';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

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
  const okU = ADMIN_USER;
  const okP = ADMIN_PASS;
  if (okU && okP && u === okU && p === okP) {
    const token = jwt.sign({ user: u, role: 'superuser' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }

  // 2. DB Users
  try {
    const { rows } = await pool.query('SELECT username, password_hash FROM admin_users LIMIT 1;');
    if (rows.length) {
      const row = rows.find(r => String(r.username) === u) || rows[0];
      const ok = (String(row.username) === u) && verifyPassword(p, String(row.password_hash));
      if (!ok) { rec.count++; global.__loginAttempts.set(key, rec); return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); }
      const token = jwt.sign({ user: u }, JWT_SECRET, { expiresIn: '12h' });
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
  const tokenOk = code && (code === ADMIN_RESET_TOKEN || code === JWT_SECRET);
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
    if (!GOOGLE_CLIENT_ID || aud !== GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (!email || !emailVerified) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // Sicurezza: Whitelist email
    const allowed = String(process.env.ALLOWED_GOOGLE_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(email.toLowerCase())) {
      console.warn(`Tentativo di login Google bloccato per email non autorizzata: ${email}`);
      return res.status(403).json({ error: 'FORBIDDEN_EMAIL' });
    }

    const token = jwt.sign({ user: email, provider: 'google' }, JWT_SECRET, { expiresIn: '12h' });
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
        jwt.verify(token, JWT_SECRET);
        isAdmin = true;
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
    if (!RENDER_API_KEY || !RENDER_SERVICE_ID) return res.status(500).json({ error: 'RENDER_CONFIG' });
    const url = `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`;
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${RENDER_API_KEY}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: 'RENDER_ERROR', detail: j });
    res.json({ ok: true, deploy: j });
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

app.post('/api/media', requireAdmin, upload.array('files'), async (req, res) => {
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
      for (const file of req.files) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!['image/jpeg','image/png','image/webp'].includes(mt)) {
          await client.query('ROLLBACK');
          return res.status(415).json({ error: 'UNSUPPORTED_FORMAT' });
        }
        if (sz > (10 * 1024 * 1024)) {
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
    if (directusEnabled()) {
      try {
        const list = await fetchDirectusRoulottes();
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
    res.json(
      result.rows.map((row) => ({
        ...(row.data || {}),
        id: row.id,
        photos: (row.photos || []).map(normalizePhotoUrlToCurrentPublicBase),
        visibile: row.visibile !== undefined && row.visibile !== null ? row.visibile : true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );

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
    const index = client.index(MEILI_INDEX);

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

    const index = client.index(MEILI_INDEX);
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

    const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
    const fromAddress = String(body.fromAddress || body.from || '').trim();
    const toAddress = String(body.toAddress || body.to || '').trim();
    if (!fromAddress || !toAddress) return res.status(400).json({ error: 'BAD_REQUEST' });

    const from = await orsGeocodeOne(fromAddress);
    if (!from) return res.status(404).json({ error: 'FROM_NOT_FOUND' });
    const to = await orsGeocodeOne(toAddress);
    if (!to) return res.status(404).json({ error: 'TO_NOT_FOUND' });

    const routeUrl = new URL('https://api.openrouteservice.org/v2/directions/driving-car/geojson');
    if (ORS_API_KEY && !routeUrl.searchParams.get('api_key')) routeUrl.searchParams.set('api_key', ORS_API_KEY);
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
app.post('/api/roulottes', requireAdmin, upload.array('photos'), async (req, res) => {
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
      for (const [index, file] of req.files.entries()) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!['image/jpeg','image/png','image/webp'].includes(mt)) {
          await client.query('ROLLBACK');
          return res.status(415).json({ error: 'UNSUPPORTED_FORMAT' });
        }
        if (sz > (10 * 1024 * 1024)) {
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
app.put('/api/roulottes/:id', requireAdmin, upload.array('new_photos'), async (req, res) => {
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
    const check = await client.query('SELECT id, updated_at FROM roulottes WHERE public_id = $1', [publicId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const dbId = check.rows[0].id;
    const currentUpdatedAt = check.rows[0].updated_at ? new Date(check.rows[0].updated_at).toISOString() : null;

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

      for (const file of req.files) {
        const mt = String(file.mimetype || '').toLowerCase();
        const sz = Number(file.size || 0);
        if (!['image/jpeg','image/png','image/webp'].includes(mt)) continue; // Skip invalid
        
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
  .then(() => console.log('Tabelle database pronte.'))
  .catch((err) => console.error('Errore durante la preparazione delle tabelle:', err));

server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
