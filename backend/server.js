const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();

// Middlewares
app.use(cors({ origin: String(process.env.ALLOWED_ORIGIN || '*') })); // Abilita la comunicazione tra frontend e backend
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
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  next();
});

const pool = require('./db'); // Importiamo la configurazione del database
const s3Client = require('./s3-client'); // Importiamo il client S3 per R2
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const { createTables } = require('./init-db');

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
  const b = String(base || '').trim().replace(/\/+$/, '');
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

function adminLog(client, action, username, details) {
  const q = `
    INSERT INTO admin_logs (action, username, details)
    VALUES ($1, $2, $3::jsonb)
  `;
  const d = details ? JSON.stringify(details) : JSON.stringify({});
  return client.query(q, [String(action || ''), String(username || ''), d]);
}

function requireAdmin(req, res, next) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = jwt.verify(token, String(process.env.JWT_SECRET || ''));
    req.adminUser = payload && payload.user ? String(payload.user) : 'admin';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

// Rotta di prova per verificare che il server sia online
app.get('/', (req, res) => {
  res.send('Backend di Roulotte.online attivo e funzionante!');
});

app.post('/api/auth/login', async (req, res) => {
  const u = String(req.body.username || '').trim();
  const p = String(req.body.password || '');
  const okU = String(process.env.ADMIN_USER || '');
  const okP = String(process.env.ADMIN_PASS || '');
  if (!okU || !okP) return res.status(500).json({ error: 'CONFIG' });
  const key = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') + '|' + u;
  const limit = Number(process.env.LOGIN_RATE_LIMIT || 20);
  const windowMs = Number(process.env.LOGIN_RATE_WINDOW_MS || 10 * 60 * 1000);
  global.__loginAttempts = global.__loginAttempts || new Map();
  const now = Date.now();
  const rec = global.__loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  if (rec.count >= limit) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
  if (u !== okU || p !== okP) { rec.count++; global.__loginAttempts.set(key, rec); return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); }
  const token = jwt.sign({ user: u }, String(process.env.JWT_SECRET || ''), { expiresIn: '12h' });
  res.json({ token });
});

app.get('/api/content/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ error: 'BAD_REQUEST' });
    const { rows } = await pool.query('SELECT content_key, content_type, published_data, updated_at FROM contents WHERE content_key = $1;', [key]);
    if (!rows.length) return res.json({ content_key: key, content_type: 'html', data: '', updated_at: null });
    res.json({ content_key: rows[0].content_key, content_type: rows[0].content_type, data: rows[0].published_data || '', updated_at: rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/contents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT content_key, content_type, updated_at FROM contents ORDER BY content_key;');
    res.json(rows);
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
  const client = await pool.connect();
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
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    client.release();
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = [];
    if (req.files) {
      for (const file of req.files) {
        const fileName = generateFileName();
        const params = { Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'public, max-age=31536000, immutable' };
        await s3Client.send(new PutObjectCommand(params));
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
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    client.release();
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
    console.error('Errore durante il recupero delle roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Inizia la transazione

    const raw = req.body || {};
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
    if (req.files) {
      for (const [index, file] of req.files.entries()) {
        const fileName = generateFileName();
        const params = {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable'
        };

        await s3Client.send(new PutObjectCommand(params));
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
    }

    await client.query('COMMIT'); // Conferma la transazione
    try {
      if (process.env.WEBHOOK_URL) {
        const payload = { type: 'upload_complete', id: savedPublicId, count: (req.files || []).length, user: req.adminUser || 'admin' };
        await fetch(String(process.env.WEBHOOK_URL), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
    } catch {}
    try { await adminLog(client, 'CREATE_ROULOTTE', req.adminUser || 'admin', { id: savedPublicId }); } catch {}
    res.status(201).json({ message: 'Roulotte creata con successo!', id: savedPublicId });

  } catch (err) {
    await client.query('ROLLBACK'); // Annulla la transazione in caso di errore
    console.error('Errore durante la creazione della roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  } finally {
    client.release(); // Rilascia la connessione al pool
  }
});

app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'BAD_REQUEST' });
  try {
    await pool.query('DELETE FROM photos WHERE id = $1;', [id]);
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

app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
