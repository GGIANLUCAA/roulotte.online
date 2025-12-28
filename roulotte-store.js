(function () {
  const storageKey = 'roulotte_db_v1';
  // Rileva automaticamente se siamo in locale o in produzione
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE_URL = isLocal ? 'http://localhost:3001' : '';

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function parseOptionalNumber(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseOptionalBool(v) {
    if (v === undefined || v === null) return null;
    if (v === true || v === false) return v;
    const s = String(v).trim().toLowerCase();
    if (s === '') return null;
    if (s === 'si' || s === 'sì' || s === 'true' || s === '1' || s === 'yes' || s === 'presente') return true;
    if (s === 'no' || s === 'false' || s === '0' || s === 'assente') return false;
    return null;
  }

  function normalizeStringList(v) {
    if (!Array.isArray(v)) return [];
    return v.map(x => String(x ?? '').trim()).filter(Boolean);
  }

  function seed() {
    const updatedAt = nowIso();
    return {
      version: 2,
      updatedAt,
      // Configurazione Sicurezza e Admin
      admin: {
        username: 'admin',
        password: 'admin', // In un'app reale andrebbe hashata
        lastLogin: null,
        failedAttempts: 0,
        lockedUntil: null
      },
      // Log attività
      logs: [
        { id: 'L-INIT', action: 'Inizializzazione Sistema', timestamp: updatedAt, user: 'system' }
      ],
      // Categorie
      categories: [
        { id: 'cat-1', name: 'Caravan Nuove', parentId: null },
        { id: 'cat-2', name: 'Caravan Usate', parentId: null },
        { id: 'cat-3', name: 'Camper', parentId: null }
      ],
      roulottes: [
        { id: 'R-0001', marca: 'Knaus', modello: 'Sport 400', anno: 2019, prezzo: 18500, stato: 'Ottimo', categoryId: 'cat-2', photos: [], note: '', createdAt: updatedAt },
        { id: 'R-0002', marca: 'Hobby', modello: 'De Luxe', anno: 2015, prezzo: 14200, stato: 'Da sistemare', categoryId: 'cat-2', photos: [], note: '', createdAt: updatedAt },
        { id: 'R-0003', marca: 'Fendt', modello: 'Bianco', anno: 2021, prezzo: 24000, stato: 'Nuovo', categoryId: 'cat-1', photos: [], note: '', createdAt: updatedAt }
      ]
    };
  }

  let store = null;
  let authToken = null;
  let serverDbSupported = null;

  async function initializeStore() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roulottes`);
      if (!response.ok) {
        throw new Error(`Errore nel caricamento dati: ${response.status}`);
      }
      const roulottesFromServer = await response.json();
      
      const db = seed();
      db.roulottes = roulottesFromServer;
      store = saveDB(db, { skipServerPush: true });
      
    } catch (error) {
      console.error("Impossibile caricare i dati dal server.", error);
      store = loadDBFromStorage() || seed();
    }
    return store;
  }

  function loadDBFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const obj = safeJsonParse(raw);
      if (!isValidDbObject(obj)) return null;
      return obj;
    } catch {
      return null;
    }
  }

  function getDB() {
    if (!store) store = loadDBFromStorage() || seed();
    return store;
  }

  let serverPushTimer = null;
  let serverBackoffUntil = 0;

  function isFileProtocol() {
    try { return location && location.protocol === 'file:'; } catch { return false; }
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    if (typeof fetch !== 'function') throw new Error('fetch_unavailable');
    if (typeof AbortController === 'undefined') return fetch(url, options);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(t));
  }

  function getUpdatedAtMs(db) {
    const s = db && typeof db === 'object' ? String(db.updatedAt || '') : '';
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }

  function isValidDbObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (Number(obj.version) !== 2) return false;
    if (!Array.isArray(obj.categories)) return false;
    if (!Array.isArray(obj.roulottes)) return false;
    return true;
  }

  async function serverGetDB(timeoutMs = 1500) {
    if (isFileProtocol()) throw new Error('file_protocol');
    const res = await fetchWithTimeout('/api/db', { method: 'GET', headers: { 'Accept': 'application/json' } }, timeoutMs);
    if (res.status === 404) {
      serverDbSupported = false;
      return null;
    }
    serverDbSupported = true;
    if (!res.ok) throw new Error('server_get_failed');
    const obj = await res.json();
    if (!isValidDbObject(obj)) throw new Error('invalid_server_db');
    return obj;
  }

  async function serverPutDB(db, timeoutMs = 1500) {
    if (isFileProtocol()) throw new Error('file_protocol');
    if (!isValidDbObject(db)) throw new Error('invalid_local_db');
    const body = JSON.stringify(db);
    const res = await fetchWithTimeout('/api/db', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }, timeoutMs);
    if (!res.ok) throw new Error('server_put_failed');
    return true;
  }

  function scheduleServerPush(db) {
    if (typeof fetch !== 'function') return;
    if (isFileProtocol()) return;
    if (serverDbSupported === false) return;
    const now = Date.now();
    if (now < serverBackoffUntil) return;
    if (serverPushTimer) clearTimeout(serverPushTimer);
    serverPushTimer = setTimeout(async () => {
      try {
        const current = getDB();
        await serverPutDB(current);
      } catch {
        serverBackoffUntil = Date.now() + 15000;
      }
    }, 800);
  }

  async function pushToServer() {
    const db = getDB();
    await serverPutDB(db);
    return { ok: true, mode: 'push' };
  }

  async function pullFromServer() {
    const serverDb = await serverGetDB();
    if (!serverDb) return { ok: false, mode: 'not_found' };
    const next = saveDB(serverDb, { skipServerPush: true });
    return { ok: true, mode: 'pull', updatedAt: next.updatedAt };
  }

  async function syncNow() {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/roulottes`, { method: 'GET', headers: { 'Accept': 'application/json' } }, 2500);
      if (!res.ok) throw new Error('roulottes_fetch_failed');
      const list = await res.json();
      const db = getDB();
      const next = saveDB({ ...db, roulottes: Array.isArray(list) ? list : [] }, { skipServerPush: true });
      store = next;
      return { ok: true, mode: 'pulled_roulottes', updatedAt: next.updatedAt };
    } catch {}

    const local = getDB();
    let serverDb = null;
    try {
      serverDb = await serverGetDB();
    } catch {
      return { ok: false, mode: 'offline' };
    }
    if (!serverDb) {
      try {
        await serverPutDB(local);
        return { ok: true, mode: 'seeded' };
      } catch {
        return { ok: false, mode: 'offline' };
      }
    }

    const lt = getUpdatedAtMs(local);
    const st = getUpdatedAtMs(serverDb);
    if (st > lt) {
      const next = saveDB(serverDb, { skipServerPush: true });
      return { ok: true, mode: 'pulled', updatedAt: next.updatedAt };
    }
    if (lt > st) {
      try {
        await serverPutDB(local);
        return { ok: true, mode: 'pushed', updatedAt: local.updatedAt };
      } catch {
        return { ok: false, mode: 'offline' };
      }
    }
    return { ok: true, mode: 'noop', updatedAt: local.updatedAt };
  }

  function saveDB(db, opts = {}) {
    const next = { ...db, updatedAt: nowIso() };
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (!opts.skipServerPush) scheduleServerPush(next);
    return next;
  }

  function addLog(action, user = 'admin') {
    const db = getDB();
    const newLog = {
      id: 'L-' + Date.now(),
      action,
      timestamp: nowIso(),
      user
    };
    // Mantieni solo ultimi 100 log
    const logs = [newLog, ...(db.logs || [])].slice(0, 100);
    saveDB({ ...db, logs });
  }

  function checkLogin(user, pass) {
    const db = getDB();
    const admin = db.admin;
    const now = new Date();

    // Check blocco
    if (admin.lockedUntil && new Date(admin.lockedUntil) > now) {
      return { success: false, error: 'Account bloccato. Riprova più tardi.' };
    }

    if (user === admin.username && pass === admin.password) {
      // Successo
      const newAdmin = { ...admin, failedAttempts: 0, lastLogin: nowIso(), lockedUntil: null };
      saveDB({ ...db, admin: newAdmin });
      addLog('Login effettuato', user);
      return { success: true };
    } else {
      // Fallimento
      let attempts = (admin.failedAttempts || 0) + 1;
      let lockedUntil = null;
      let errorMsg = 'Credenziali non valide.';
      
      if (attempts >= 5) {
        // Blocca per 5 minuti
        lockedUntil = new Date(now.getTime() + 5 * 60000).toISOString();
        attempts = 0; // Reset o mantieni? Meglio reset dopo lock
        errorMsg = 'Troppi tentativi. Account bloccato per 5 minuti.';
        addLog('Account bloccato per troppi tentativi', user);
      }

      saveDB({ 
        ...db, 
        admin: { ...admin, failedAttempts: attempts, lockedUntil } 
      });
      return { success: false, error: errorMsg };
    }
  }

  function updateAdmin(newUsername, newPassword) {
    const db = getDB();
    db.admin.username = newUsername;
    db.admin.password = newPassword;
    addLog('Credenziali admin modificate');
    saveDB(db);
  }

  function addCategory(name, parentId = null) {
      const db = getDB();
      const id = 'cat-' + Date.now();
      const newCat = { id, name, parentId };
      const categories = [...(db.categories || []), newCat];
      saveDB({ ...db, categories });
      addLog(`Creata categoria: ${name}`);
      return newCat;
  }

  function deleteCategory(id) {
      const db = getDB();
      // Impedisci cancellazione se usata? Per ora semplice
      const categories = (db.categories || []).filter(c => c.id !== id);
      saveDB({ ...db, categories });
      addLog(`Eliminata categoria ID: ${id}`);
  }

  function makeId(db) {
    const items = Array.isArray(db.roulottes) ? db.roulottes : [];
    const nums = items.map(r => String(r.id || '')).map(id => {
      const m = id.match(/R-(\d+)/);
      return m ? Number(m[1]) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    return 'R-' + String(max + 1).padStart(4, '0');
  }

  async function sendRoulotteData(method, url, input, photos = [], photoField = 'photos', onProgress) {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(input || {}));
    for (const key in (input || {})) {
      const v = input[key];
      const t = typeof v;
      if (v === undefined) continue;
      if (v === null) continue;
      if (t === 'string' || t === 'number' || t === 'boolean') formData.append(key, String(v));
    }
    for (const photo of photos) {
      if (photo && photo.file) formData.append(photoField, photo.file, photo.name);
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      if (authToken) xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
      const expectedUpdatedAt = input && typeof input === 'object' ? String(input.updatedAt || input.updated_at || '').trim() : '';
      if (expectedUpdatedAt && String(method || '').toUpperCase() === 'PUT') xhr.setRequestHeader('x-if-updated-at', expectedUpdatedAt);
      xhr.upload.onprogress = function(e){
        if (onProgress && e && e.lengthComputable) {
          try { onProgress(Math.round((e.loaded / e.total) * 100)); } catch {}
        }
      };
      xhr.onreadystatechange = function(){
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
          } else {
            let msg = 'Errore dal server: ' + xhr.status;
            try { const j = JSON.parse(xhr.responseText); if (j && j.error) msg = String(j.error) + (j.detail ? (': ' + String(j.detail)) : ''); } catch {}
            reject(new Error(msg));
          }
        }
      };
      xhr.onerror = function(){ reject(new Error('network_error')); };
      xhr.send(formData);
    });
  }

  async function forceReloadRoulottes() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roulottes`);
      if (!response.ok) throw new Error('Reload failed');
      const list = await response.json();
      const db = getDB();
      db.roulottes = list;
      saveDB(db, { skipServerPush: true }); // Salva in locale senza pushare indietro
      return true;
    } catch (e) {
      console.error("Errore ricaricamento lista:", e);
      return false;
    }
  }

  async function searchRoulottes(params = {}, timeoutMs = 1500) {
    const q = String(params.q || '').trim();
    const url = new URL(`${API_BASE_URL}/api/search`);
    url.searchParams.set('q', q);
    if (params && typeof params === 'object') {
      const stato = String(params.stato || '').trim();
      const sort = String(params.sort || '').trim();
      if (stato) url.searchParams.set('stato', stato);
      if (sort) url.searchParams.set('sort', sort);
      if (params.min !== undefined && params.min !== null && Number.isFinite(Number(params.min))) url.searchParams.set('min', String(Number(params.min)));
      if (params.max !== undefined && params.max !== null && Number.isFinite(Number(params.max))) url.searchParams.set('max', String(Number(params.max)));
      if (params.hasPhoto) url.searchParams.set('photo', '1');
      if (params.limit !== undefined && params.limit !== null && Number.isFinite(Number(params.limit))) url.searchParams.set('limit', String(Math.min(Math.max(Number(params.limit) || 36, 1), 100)));
    }

    const res = await fetchWithTimeout(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' } }, timeoutMs);
    if (res.status === 404) throw new Error('remote_search_not_supported');
    if (!res.ok) throw new Error('remote_search_failed');
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  }

  async function addRoulotte(input, photos = [], onProgress) {
    const res = await sendRoulotteData('POST', `${API_BASE_URL}/api/roulottes`, input, photos, 'photos', onProgress);
    await forceReloadRoulottes(); // Forza aggiornamento lista
    return res;
  }

  async function updateRoulotte(input, photos = [], onProgress) {
    if (!input || !input.id) throw new Error('ID mancante per modifica');
    const res = await sendRoulotteData('PUT', `${API_BASE_URL}/api/roulottes/${input.id}`, input, photos, 'new_photos', onProgress);
    await forceReloadRoulottes(); // Forza aggiornamento lista
    return res;
  }

  async function deleteRoulotte(id) {
    if (!id) throw new Error('ID mancante');
    const res = await fetch(`${API_BASE_URL}/api/roulottes/${id}`, {
       method: 'DELETE',
       headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) {
       let msg = 'Errore cancellazione';
       try { const j = await res.json(); if(j.error) msg = j.error; } catch{}
       throw new Error(msg);
    }
    await forceReloadRoulottes(); // Forza aggiornamento lista
    return true;
  }

  function replaceAll(db) {
    // Basic restore
    return saveDB(db);
  }

  window.RoulotteStore = {
    storageKey,
    getDB,
    saveDB,
    addRoulotte,
    updateRoulotte,
    deleteRoulotte,
    reloadRoulottes: forceReloadRoulottes,
    searchRoulottes,
    replaceAll,
    syncNow,
    pullFromServer,
    pushToServer,
    checkLogin,
    updateAdmin,
    addCategory,
    deleteCategory,
    addLog,
    setAuthToken: function(t){
      authToken = String(t || '');
      try { sessionStorage.setItem('admin_jwt_token', authToken); } catch {}
    },
    getAuthToken: function(){
      if (!authToken) {
        try { authToken = String(sessionStorage.getItem('admin_jwt_token') || ''); } catch {}
      }
      return authToken;
    }
  };
})();
