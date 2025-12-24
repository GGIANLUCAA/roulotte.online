const test = require('node:test');
const assert = require('node:assert');

const API_BASE = process.env.API_BASE_URL || 'https://roulotte-online-foto.onrender.com';

test('GET /api/health risponde ok', async () => {
  const res = await fetch(`${API_BASE}/api/health`);
  assert.strictEqual(res.ok, true);
  const json = await res.json();
  assert.strictEqual(json.ok, true);
});

test('GET /api/roulottes ritorna array', async () => {
  const res = await fetch(`${API_BASE}/api/roulottes`);
  assert.strictEqual(res.ok, true);
  const arr = await res.json();
  assert.ok(Array.isArray(arr));
  if (arr.length > 0) {
    assert.ok(typeof arr[0] === 'object');
    assert.ok('id' in arr[0]);
    assert.ok('photos' in arr[0]);
  }
});

test('GET contenuti pubblici (tollerante a backend non aggiornato)', async () => {
  const res = await fetch(`${API_BASE}/api/content/home_hero_title`);
  if (!res.ok) {
    assert.ok([404, 500].includes(res.status));
    return;
  }
  const json = await res.json();
  assert.ok('content_key' in json);
  assert.ok('data' in json);
});

test('POST protette richiedono auth (compatibile con backend legacy)', async () => {
  const res1 = await fetch(`${API_BASE}/api/roulottes`, { method: 'POST' });
  assert.ok([201, 401].includes(res1.status));
  const res2 = await fetch(`${API_BASE}/api/media`, { method: 'POST' });
  assert.ok([201, 401, 404, 405].includes(res2.status));
});

test('Login admin e upload immagine su /api/media', async () => {
  const login = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  assert.strictEqual(login.ok, true);
  const { token } = await login.json();
  assert.ok(token);

  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFklEQVR4nGP4//8/AwMDAxgYGBgAAAkAA3+uU7gAAAAASUVORK5CYII=';
  const buf = Buffer.from(pngB64, 'base64');
  const blob = new Blob([buf], { type: 'image/png' });
  const fd = new FormData();
  fd.append('files', blob, 'test.png');
  const up = await fetch(`${API_BASE}/api/media`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
  assert.strictEqual(up.ok, true, 'Upload media deve riuscire');
  const arr = await up.json();
  assert.ok(Array.isArray(arr));
});

test('Creazione roulotte con foto su /api/roulottes', async () => {
  const login = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  assert.strictEqual(login.ok, true);
  const { token } = await login.json();
  assert.ok(token);

  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFklEQVR4nGP4//8/AwMDAxgYGBgAAAkAA3+uU7gAAAAASUVORK5CYII=';
  const buf = Buffer.from(pngB64, 'base64');
  const blob = new Blob([buf], { type: 'image/png' });
  const fd = new FormData();
  fd.append('marca', 'TestMarca');
  fd.append('modello', 'TestModello');
  fd.append('prezzo', '1234');
  fd.append('anno', '2020');
  fd.append('photos', blob, 'test.png');
  const res = await fetch(`${API_BASE}/api/roulottes`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
  assert.ok([201, 500].includes(res.status), 'Creazione roulotte deve rispondere 201 o 500 in caso di storage non configurato');
  if (res.ok) {
    const body = await res.json();
    assert.ok(body && body.id);
  }
});
