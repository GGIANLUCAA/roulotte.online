const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // Abilita la comunicazione tra frontend e backend
app.use(express.json({ limit: '50mb' })); // Permette al server di ricevere dati JSON (es. info roulotte)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Permette di ricevere dati da form HTML

const pool = require('./db'); // Importiamo la configurazione del database
const s3Client = require('./s3-client'); // Importiamo il client S3 per R2
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const { createTables } = require('./init-db');

// Configurazione di Multer per gestire l'upload di file in memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Funzione per generare un nome file univoco
const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// Rotta di prova per verificare che il server sia online
app.get('/', (req, res) => {
  res.send('Backend di Roulotte.online attivo e funzionante!');
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
        photos: row.photos || [],
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
app.post('/api/roulottes', upload.array('photos'), async (req, res) => {
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
        };

        await s3Client.send(new PutObjectCommand(params));
        
        const photoUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
        const photoQuery = `
          INSERT INTO photos (roulotte_id, url_full, url_thumb, sort_order, is_cover)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(photoQuery, [roulotteDbId, photoUrl, photoUrl, index, index === 0]);
      }
    }

    await client.query('COMMIT'); // Conferma la transazione
    res.status(201).json({ message: 'Roulotte creata con successo!', id: savedPublicId });

  } catch (err) {
    await client.query('ROLLBACK'); // Annulla la transazione in caso di errore
    console.error('Errore durante la creazione della roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server', detail: String(err && err.message ? err.message : err) });
  } finally {
    client.release(); // Rilascia la connessione al pool
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
