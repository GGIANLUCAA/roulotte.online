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
        r.id, 
        r.nome, 
        r.descrizione, 
        r.prezzo, 
        r.anno, 
        r.peso, 
        r.posti_letto, 
        r.dimensioni, 
        r.condizioni, 
        r.accessori, 
        r.telefono, 
        r.email,
        r.visibile,
        COALESCE(
          (
            SELECT json_agg(p.url ORDER BY p.ordine)
            FROM photos p 
            WHERE p.roulotte_id = r.id
          ), '[]'::json
        ) AS photos
      FROM roulottes r
      ORDER BY r.id DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error('Errore durante il recupero delle roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Rotta per creare una nuova roulotte con foto
app.post('/api/roulottes', upload.array('photos'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Inizia la transazione

    const { nome, descrizione, prezzo, anno, peso, posti_letto, dimensioni, condizioni, accessori, telefono, email } = req.body;
    const visibile = req.body.visibile === 'true' || req.body.visibile === 'on';


    // 1. Inserisci la roulotte nel database
    const roulotteQuery = `
      INSERT INTO roulottes (nome, descrizione, prezzo, anno, peso, posti_letto, dimensioni, condizioni, accessori, telefono, email, visibile)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id;
    `;
    const roulotteResult = await client.query(roulotteQuery, [nome, descrizione, prezzo, anno, peso, posti_letto, dimensioni, condizioni, accessori, telefono, email, visibile]);
    const roulotteId = roulotteResult.rows[0].id;

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
          INSERT INTO photos (roulotte_id, url, ordine)
          VALUES ($1, $2, $3);
        `;
        await client.query(photoQuery, [roulotteId, photoUrl, index]);
      }
    }

    await client.query('COMMIT'); // Conferma la transazione
    res.status(201).json({ message: 'Roulotte creata con successo!', roulotteId: roulotteId });

  } catch (err) {
    await client.query('ROLLBACK'); // Annulla la transazione in caso di errore
    console.error('Errore durante la creazione della roulotte:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    client.release(); // Rilascia la connessione al pool
  }
});


// Qui aggiungeremo le rotte per gestire le roulotte e le foto
// Esempio: app.use('/api/roulottes', require('./api/roulottes'));

const PORT = process.env.PORT || 3001; // Render userà la variabile d'ambiente PORT

app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
