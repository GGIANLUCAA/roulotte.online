const { query } = require('./db');

const createTables = async () => {
  const createRoulotteTable = `
    CREATE TABLE IF NOT EXISTS roulottes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2),
      year INTEGER,
      weight INTEGER,
      length INTEGER,
      beds INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPhotoTable = `
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      roulotte_id INTEGER NOT NULL REFERENCES roulottes(id) ON DELETE CASCADE,
      url_full TEXT NOT NULL,
      url_thumb TEXT NOT NULL,
      blur_hash TEXT,
      is_cover BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0
    );
  `;

  try {
    console.log('Creazione tabella roulottes...');
    await query(createRoulotteTable);
    console.log('Tabella roulottes creata con successo (o già esistente).');

    console.log('Creazione tabella photos...');
    await query(createPhotoTable);
    console.log('Tabella photos creata con successo (o già esistente).');

  } catch (err) {
    console.error('Errore durante la creazione delle tabelle:', err.stack);
  } finally {
    // Poiché usiamo un pool, non è necessario chiudere la connessione manualmente qui.
  }
};

createTables();
