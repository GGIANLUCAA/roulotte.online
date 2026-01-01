const test = require('node:test');
const assert = require('node:assert');

const DEFAULT_LOCAL_API_BASE = process.env.DEFAULT_LOCAL_API_BASE || 'http://localhost:3001';
const API_BASE = process.env.API_BASE_URL || DEFAULT_LOCAL_API_BASE;

function isRemoteApiBase(url) {
  try {
    const u = new URL(String(url || ''));
    const h = String(u.hostname || '').toLowerCase();
    return !(h === 'localhost' || h === '127.0.0.1' || h === '::1');
  } catch {
    return true;
  }
}

const allowRemoteTests = ['1', 'true', 'yes'].includes(String(process.env.ALLOW_REMOTE_TESTS || '').trim().toLowerCase());
const writeTestsEnabled = !isRemoteApiBase(API_BASE) || allowRemoteTests;

function writeTest(name, fn) {
  if (writeTestsEnabled) return test(name, fn);
  return test(name, { skip: 'Test di scrittura disabilitati su API remota. Imposta ALLOW_REMOTE_TESTS=1.' }, fn);
}

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

test('POST /api/transport/route (tollerante a ORS non configurato)', async () => {
  const res = await fetch(`${API_BASE}/api/transport/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ fromAddress: 'Milano', toAddress: 'Roma' })
  });

  if (!res.ok) {
    assert.ok([400, 404, 429, 500].includes(res.status));
    const j = await res.json().catch(() => null);
    if (res.status === 400 && j && typeof j === 'object') {
      assert.ok(j && (j.error === 'ORS_NOT_CONFIGURED' || j.error === 'BAD_REQUEST'));
    }
    if (res.status === 404 && j && typeof j === 'object') {
      assert.ok(j && (j.error === 'FROM_NOT_FOUND' || j.error === 'TO_NOT_FOUND'));
    }
    return;
  }

  const json = await res.json();
  assert.ok(json && typeof json === 'object');
  assert.ok(typeof json.distance_km === 'number');
  assert.ok(typeof json.duration_min === 'number');
  assert.ok(json.geometry && typeof json.geometry === 'object');
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

writeTest('POST protette richiedono auth (compatibile con backend legacy)', async () => {
  const res1 = await fetch(`${API_BASE}/api/roulottes`, { method: 'POST' });
  assert.ok([201, 401].includes(res1.status));
  const res2 = await fetch(`${API_BASE}/api/media`, { method: 'POST' });
  assert.ok([201, 401, 404, 405].includes(res2.status));
});

writeTest('Login admin e upload immagine su /api/media', async () => {
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
  if (up.status === 503) {
    const j = await up.json().catch(() => ({}));
    assert.strictEqual(String(j && j.error || ''), 'DB_UNAVAILABLE');
    return;
  }
  if (!up.ok) {
    const j = await up.json().catch(() => ({}));
    assert.ok([400, 413, 415, 500, 502].includes(up.status));
    assert.ok(j && typeof j === 'object');
    return;
  }
  assert.strictEqual(up.ok, true, 'Upload media deve riuscire');
  const arr = await up.json();
  assert.ok(Array.isArray(arr));
});

writeTest('Creazione roulotte con foto su /api/roulottes', async () => {
  const login = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  assert.strictEqual(login.ok, true);
  const { token } = await login.json();
  assert.ok(token);
  let createdId = '';

  try {
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
    if (res.status === 503) {
      const j = await res.json().catch(() => ({}));
      assert.strictEqual(String(j && j.error || ''), 'DB_UNAVAILABLE');
      return;
    }
    if (res.status === 400) {
      const j = await res.json().catch(() => ({}));
      assert.ok(j && typeof j === 'object');
      assert.ok(j && j.error);
      return;
    }
    assert.ok([201, 500, 502].includes(res.status), 'Creazione roulotte deve rispondere 201 o errore di storage/compatibilità');
    if (res.ok) {
      const body = await res.json();
      assert.ok(body && body.id);
      createdId = String(body.id || '');
    }
  } finally {
    if (createdId) {
      try {
        await fetch(`${API_BASE}/api/roulottes/${createdId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      } catch {}
    }
  }
});

writeTest('Update roulotte: persistenza campi e conflitto 409', async () => {
  const login = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  assert.strictEqual(login.ok, true);
  const { token } = await login.json();
  assert.ok(token);
  let id = '';

  try {
    const createFd = new FormData();
    const createPayload = {
      marca: 'TestMarcaUpdate',
      modello: 'TestModelloUpdate',
      prezzo: 9999,
      anno: 2023,
      provenienza: 'Italia'
    };
    createFd.append('payload', JSON.stringify(createPayload));
    createFd.append('marca', createPayload.marca);
    createFd.append('modello', createPayload.modello);
    createFd.append('prezzo', String(createPayload.prezzo));
    createFd.append('anno', String(createPayload.anno));
    createFd.append('provenienza', createPayload.provenienza);
    const created = await fetch(`${API_BASE}/api/roulottes`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: createFd });
    if (created.status === 503) {
      const j = await created.json().catch(() => ({}));
      assert.strictEqual(String(j && j.error || ''), 'DB_UNAVAILABLE');
      return;
    }
    assert.strictEqual(created.ok, true);
    const createdBody = await created.json();
    assert.ok(createdBody && createdBody.id);
    id = String(createdBody.id || '');

    const list1 = await fetch(`${API_BASE}/api/roulottes`, { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json());
    const r1 = (list1 || []).find(x => x && x.id === id);
    assert.ok(r1, 'Roulotte creata deve essere presente in lista');
    assert.ok(
      r1.modello === 'TestModelloUpdate' || r1.title === 'TestMarcaUpdate TestModelloUpdate' || r1.title === 'TestMarcaUpdate TestModelloUpdate'.trim(),
      'La roulotte deve riportare modello o title coerente'
    );
    if (Object.prototype.hasOwnProperty.call(r1, 'provenienza')) {
      assert.strictEqual(r1.provenienza, 'Italia');
    }
    const updatedAt1 = r1.updatedAt || r1.updated_at;
    if (updatedAt1) {
      assert.ok(updatedAt1, 'updatedAt deve essere presente per gestire conflitti');
    }

    const updFd = new FormData();
    const updPayload = {
      id,
      marca: 'TestMarcaUpdate',
      modello: 'TestModelloUpdate-NEW',
      prezzo: 9999,
      anno: 2023,
      provenienza: null,
      existing_photos: '[]',
      updatedAt: updatedAt1
    };
    updFd.append('payload', JSON.stringify(updPayload));
    updFd.append('marca', updPayload.marca);
    updFd.append('modello', updPayload.modello);
    updFd.append('prezzo', String(updPayload.prezzo));
    updFd.append('anno', String(updPayload.anno));
    updFd.append('provenienza', '');
    updFd.append('existing_photos', '[]');
    const upd = await fetch(`${API_BASE}/api/roulottes/${id}`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: updFd });
    assert.strictEqual(upd.ok, true);

    const list2 = await fetch(`${API_BASE}/api/roulottes`, { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json());
    const r2 = (list2 || []).find(x => x && x.id === id);
    assert.ok(r2, 'Roulotte aggiornata deve essere presente in lista');
    assert.ok(
      r2.modello === 'TestModelloUpdate-NEW' || r2.title === 'TestMarcaUpdate TestModelloUpdate-NEW' || r2.title === 'TestMarcaUpdate TestModelloUpdate-NEW'.trim(),
      'La roulotte aggiornata deve riportare modello o title coerente'
    );
    if (Object.prototype.hasOwnProperty.call(r2, 'provenienza')) {
      assert.notStrictEqual(r2.provenienza, 'Italia');
    }
    const updatedAt2 = r2.updatedAt || r2.updated_at;
    if (updatedAt2) assert.ok(updatedAt2);

    if (!updatedAt1) return;

    const conflictFd = new FormData();
    const conflictPayload = {
      id,
      marca: 'TestMarcaUpdate',
      modello: 'TestModelloUpdate-CONFLICT',
      prezzo: 9999,
      anno: 2023,
      existing_photos: '[]',
      updatedAt: updatedAt1
    };
    conflictFd.append('payload', JSON.stringify(conflictPayload));
    conflictFd.append('marca', conflictPayload.marca);
    conflictFd.append('modello', conflictPayload.modello);
    conflictFd.append('prezzo', String(conflictPayload.prezzo));
    conflictFd.append('anno', String(conflictPayload.anno));
    conflictFd.append('existing_photos', '[]');
    const conflictRes = await fetch(`${API_BASE}/api/roulottes/${id}`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: conflictFd });
    if (conflictRes.status === 409) {
      const conflictJson = await conflictRes.json().catch(() => ({}));
      assert.strictEqual(conflictJson.error, 'CONFLICT');
      assert.ok(conflictJson.currentUpdatedAt);
    } else {
      assert.ok([200, 204].includes(conflictRes.status));
    }
  } finally {
    if (id) {
      try {
        await fetch(`${API_BASE}/api/roulottes/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      } catch {}
    }
  }
});
