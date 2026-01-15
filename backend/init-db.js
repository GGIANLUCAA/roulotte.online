const db = require('./db');

async function createTables() {
  const createRoulotteTable = `
    CREATE TABLE IF NOT EXISTS roulottes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2),
      year INTEGER,
      weight INTEGER,
      length NUMERIC(10, 2),
      beds INTEGER,
      public_id TEXT UNIQUE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      visibile BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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

  await db.query(createRoulotteTable);
  await db.query(createPhotoTable);

  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS description TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS year INTEGER;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS weight INTEGER;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS length NUMERIC(10, 2);`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS beds INTEGER;`);

  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS public_id TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS visibile BOOLEAN DEFAULT TRUE;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);

  try {
    await db.query(`ALTER TABLE roulottes ALTER COLUMN length TYPE NUMERIC(10, 2) USING length::numeric;`);
  } catch {}

  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS nome TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS descrizione TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10, 2);`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS anno INTEGER;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS peso INTEGER;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS posti_letto INTEGER;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS dimensioni TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS condizioni TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS accessori TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS telefono TEXT;`);
  await db.query(`ALTER TABLE roulottes ADD COLUMN IF NOT EXISTS email TEXT;`);

  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_roulottes_public_id ON roulottes(public_id);`);

  await db.query(`
    UPDATE roulottes
    SET public_id = 'R-' || LPAD(id::text, 4, '0')
    WHERE public_id IS NULL;
  `);

  await db.query(`
    UPDATE roulottes
    SET data = COALESCE(NULLIF(data, '{}'::jsonb), '{}'::jsonb)
      || jsonb_strip_nulls(
        jsonb_build_object(
          'nome', nome,
          'descrizione', descrizione,
          'prezzo', prezzo,
          'anno', anno,
          'peso', peso,
          'posti_letto', posti_letto,
          'dimensioni', dimensioni,
          'condizioni', condizioni,
          'accessori', accessori,
          'telefono', telefono,
          'email', email
        )
      )
    WHERE data = '{}'::jsonb;
  `);

  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS url_full TEXT;`);
  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS url_thumb TEXT;`);
  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS blur_hash TEXT;`);
  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT FALSE;`);
  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;`);

  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS url TEXT;`);
  await db.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS ordine INTEGER DEFAULT 0;`);

  await db.query(`UPDATE photos SET url_full = COALESCE(url_full, url) WHERE url_full IS NULL AND url IS NOT NULL;`);
  await db.query(`UPDATE photos SET url_thumb = COALESCE(url_thumb, url_full, url) WHERE url_thumb IS NULL;`);
  await db.query(`UPDATE photos SET sort_order = COALESCE(sort_order, ordine, 0) WHERE sort_order IS NULL;`);

  const createAdminLogs = `
    CREATE TABLE IF NOT EXISTS admin_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      username TEXT,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(createAdminLogs);

  const createRoulotteRevisions = `
    CREATE TABLE IF NOT EXISTS roulotte_revisions (
      id SERIAL PRIMARY KEY,
      public_id TEXT NOT NULL,
      action TEXT NOT NULL,
      snapshot JSONB NOT NULL,
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      username TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_roulotte_rev_public_id ON roulotte_revisions(public_id);
  `;
  await db.query(createRoulotteRevisions);

  const createContents = `
    CREATE TABLE IF NOT EXISTS contents (
      id SERIAL PRIMARY KEY,
      content_key TEXT UNIQUE NOT NULL,
      content_type TEXT NOT NULL,
      published_data TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(createContents);

  const createContentRevisions = `
    CREATE TABLE IF NOT EXISTS content_revisions (
      id SERIAL PRIMARY KEY,
      content_key TEXT NOT NULL,
      data TEXT NOT NULL,
      content_type TEXT NOT NULL,
      username TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_content_rev_key ON content_revisions(content_key);
  `;
  await db.query(createContentRevisions);

  const createMedia = `
    CREATE TABLE IF NOT EXISTS media (
      id SERIAL PRIMARY KEY,
      url_full TEXT NOT NULL,
      url_thumb TEXT NOT NULL,
      title TEXT,
      alt TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(createMedia);

  const createAdminUsers = `
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(createAdminUsers);

  await db.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';`);
  await db.query(`UPDATE admin_users SET role = 'admin' WHERE role IS NULL OR BTRIM(role) = '';`);

  const createAppSettings = `
    CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      value TEXT,
      is_secret BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
  `;
  await db.query(createAppSettings);

  const createShareLinks = `
    CREATE TABLE IF NOT EXISTS share_links (
      id SERIAL PRIMARY KEY,
      share_key TEXT UNIQUE NOT NULL,
      title TEXT,
      mode TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      expires_at TIMESTAMP WITH TIME ZONE,
      revoked_at TIMESTAMP WITH TIME ZONE,
      notify_days INTEGER,
      created_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      views_count INTEGER NOT NULL DEFAULT 0,
      last_view_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);
    CREATE INDEX IF NOT EXISTS idx_share_links_revoked_at ON share_links(revoked_at);
  `;
  await db.query(createShareLinks);

  const createShareLinkEvents = `
    CREATE TABLE IF NOT EXISTS share_link_events (
      id SERIAL PRIMARY KEY,
      share_key TEXT NOT NULL REFERENCES share_links(share_key) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_share_link_events_key ON share_link_events(share_key);
    CREATE INDEX IF NOT EXISTS idx_share_link_events_type ON share_link_events(event_type);
  `;
  await db.query(createShareLinkEvents);

  const createShareTemplates = `
    CREATE TABLE IF NOT EXISTS share_templates (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(createShareTemplates);
}

module.exports = { createTables };
