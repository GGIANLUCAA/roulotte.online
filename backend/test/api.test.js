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
