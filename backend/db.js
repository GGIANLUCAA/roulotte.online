const { Pool } = require('pg');
require('dotenv').config();

// Durante il deploy su Render, DATABASE_URL sarà fornito dall'ambiente.
// Per lo sviluppo locale, potremmo usare un file .env, ma per ora ci concentriamo su Render.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  // Render richiede la connessione SSL per i database esterni, 
  // ma non quando le app comunicano sulla loro rete interna.
  // Per sicurezza, lo abilitiamo ma permettiamo che non sia strettamente richiesto.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
