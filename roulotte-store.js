(function () {
  const storageKey = 'roulotte_db_v1';
  const API_BASE_URL = 'https://roulotte-online-foto.onrender.com';

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

  async function initializeStore() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roulottes`);
      if (!response.ok) {
        throw new Error(`Errore nel caricamento dati: ${response.status}`);
      }
      const roulottesFromServer = await response.json();
      
      const db = seed();
      db.roulottes = roulottesFromServer;
      store = db;
      
    } catch (error) {
      console.error("Impossibile caricare i dati dal server.", error);
      store = seed();
    }
    return store;
  }

  function getDB() {
    if (!store) store = seed();
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
    if (res.status === 404) return null;
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

  async function saveRoulotteToServer(input, photos = [], onProgress) {
    const formData = new FormData();
    for (const key in input) {
      if (input[key] !== null && input[key] !== undefined) {
        formData.append(key, input[key]);
      }
    }
    for (const photo of photos) {
      if (photo && photo.file) formData.append('photos', photo.file, photo.name);
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/roulottes`);
      if (authToken) xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
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
            reject(new Error('Errore dal server: ' + xhr.status));
          }
        }
      };
      xhr.onerror = function(){ reject(new Error('network_error')); };
      xhr.send(formData);
    });
  }

  async function addRoulotte(input, photos = [], onProgress) {
    return saveRoulotteToServer(input, photos, onProgress);
  }

  function updateRoulotte(input) {
    const db = getDB();
    const existingIndex = db.roulottes.findIndex(r => r.id === input.id);
    if (existingIndex === -1) return null;

    const old = db.roulottes[existingIndex];
    const updated = {
      ...old,
      marca: String(input.marca || old.marca).trim(),
      modello: String(input.modello || old.modello).trim(),
      versione: input.versione !== undefined ? String(input.versione || '').trim() : old.versione,
      anno: input.anno !== undefined ? parseOptionalNumber(input.anno) : old.anno,
      prezzo: input.prezzo !== undefined ? parseOptionalNumber(input.prezzo) : old.prezzo,
      stato: String(input.stato || old.stato).trim(),
      categoryId: String(input.categoryId || old.categoryId),
      disponibilitaProntaConsegna: input.disponibilitaProntaConsegna !== undefined ? parseOptionalBool(input.disponibilitaProntaConsegna) : old.disponibilitaProntaConsegna,
      permuta: input.permuta !== undefined ? parseOptionalBool(input.permuta) : old.permuta,
      tipologiaMezzo: input.tipologiaMezzo !== undefined ? String(input.tipologiaMezzo || '').trim() : old.tipologiaMezzo,

      condizioneGenerale: input.condizioneGenerale !== undefined ? String(input.condizioneGenerale || '').trim() : old.condizioneGenerale,
      statoInterni: input.statoInterni !== undefined ? String(input.statoInterni || '').trim() : old.statoInterni,
      statoEsterni: input.statoEsterni !== undefined ? String(input.statoEsterni || '').trim() : old.statoEsterni,
      infiltrazioni: input.infiltrazioni !== undefined ? String(input.infiltrazioni || '').trim() : old.infiltrazioni,
      odori: input.odori !== undefined ? String(input.odori || '').trim() : old.odori,
      provenienza: input.provenienza !== undefined ? String(input.provenienza || '').trim() : old.provenienza,

      targata: input.targata !== undefined ? parseOptionalBool(input.targata) : old.targata,
      librettoCircolazione: input.librettoCircolazione !== undefined ? parseOptionalBool(input.librettoCircolazione) : old.librettoCircolazione,
      omologataCircolazione: input.omologataCircolazione !== undefined ? parseOptionalBool(input.omologataCircolazione) : old.omologataCircolazione,
      numeroTelaio: input.numeroTelaio !== undefined ? String(input.numeroTelaio || '').trim() : old.numeroTelaio,
      numeroAssi: input.numeroAssi !== undefined ? String(input.numeroAssi || '').trim() : old.numeroAssi,
      timone: input.timone !== undefined ? parseOptionalBool(input.timone) : old.timone,
      frenoRepulsione: input.frenoRepulsione !== undefined ? parseOptionalBool(input.frenoRepulsione) : old.frenoRepulsione,

      massa: input.massa !== undefined ? parseOptionalNumber(input.massa) : old.massa,
      pesoVuoto: input.pesoVuoto !== undefined ? parseOptionalNumber(input.pesoVuoto) : old.pesoVuoto,

      lunghezzaTotale: input.lunghezzaTotale !== undefined ? parseOptionalNumber(input.lunghezzaTotale) : (input.lunghezza !== undefined ? parseOptionalNumber(input.lunghezza) : old.lunghezzaTotale),
      lunghezzaInterna: input.lunghezzaInterna !== undefined ? parseOptionalNumber(input.lunghezzaInterna) : old.lunghezzaInterna,
      larghezza: input.larghezza !== undefined ? parseOptionalNumber(input.larghezza) : old.larghezza,
      altezza: input.altezza !== undefined ? parseOptionalNumber(input.altezza) : old.altezza,

      postiLetto: input.postiLetto !== undefined ? parseOptionalNumber(input.postiLetto) : (input.posti !== undefined ? parseOptionalNumber(input.posti) : old.postiLetto),
      disposizioneLetti: input.disposizioneLetti !== undefined ? normalizeStringList(input.disposizioneLetti) : old.disposizioneLetti,
      lettoFisso: input.lettoFisso !== undefined ? parseOptionalBool(input.lettoFisso) : old.lettoFisso,
      idealePer: input.idealePer !== undefined ? normalizeStringList(input.idealePer) : old.idealePer,

      tipoDinette: input.tipoDinette !== undefined ? String(input.tipoDinette || '').trim() : old.tipoDinette,
      cucina: input.cucina !== undefined ? String(input.cucina || '').trim() : old.cucina,
      bagno: input.bagno !== undefined ? String(input.bagno || '').trim() : old.bagno,
      docciaSeparata: input.docciaSeparata !== undefined ? parseOptionalBool(input.docciaSeparata) : old.docciaSeparata,
      armadi: input.armadi !== undefined ? parseOptionalBool(input.armadi) : old.armadi,
      gavoniInterni: input.gavoniInterni !== undefined ? parseOptionalBool(input.gavoniInterni) : old.gavoniInterni,

      fornelli: input.fornelli !== undefined ? parseOptionalNumber(input.fornelli) : old.fornelli,
      frigorifero: input.frigorifero !== undefined ? parseOptionalBool(input.frigorifero) : old.frigorifero,
      tipoFrigorifero: input.tipoFrigorifero !== undefined ? String(input.tipoFrigorifero || '').trim() : old.tipoFrigorifero,
      forno: input.forno !== undefined ? parseOptionalBool(input.forno) : old.forno,
      lavello: input.lavello !== undefined ? parseOptionalBool(input.lavello) : old.lavello,
      cappaAspirante: input.cappaAspirante !== undefined ? parseOptionalBool(input.cappaAspirante) : old.cappaAspirante,

      wc: input.wc !== undefined ? String(input.wc || '').trim() : old.wc,
      doccia: input.doccia !== undefined ? parseOptionalBool(input.doccia) : old.doccia,
      lavabo: input.lavabo !== undefined ? parseOptionalBool(input.lavabo) : old.lavabo,
      finestraBagno: input.finestraBagno !== undefined ? parseOptionalBool(input.finestraBagno) : old.finestraBagno,

      presa220Esterna: input.presa220Esterna !== undefined ? parseOptionalBool(input.presa220Esterna) : old.presa220Esterna,
      impianto12V: input.impianto12V !== undefined ? parseOptionalBool(input.impianto12V) : old.impianto12V,
      batteriaServizi: input.batteriaServizi !== undefined ? parseOptionalBool(input.batteriaServizi) : old.batteriaServizi,
      illuminazioneLed: input.illuminazioneLed !== undefined ? parseOptionalBool(input.illuminazioneLed) : old.illuminazioneLed,

      impiantoGas: input.impiantoGas !== undefined ? String(input.impiantoGas || '').trim() : old.impiantoGas,
      numeroBombole: input.numeroBombole !== undefined ? parseOptionalNumber(input.numeroBombole) : old.numeroBombole,
      scadenzaImpiantoGas: input.scadenzaImpiantoGas !== undefined ? String(input.scadenzaImpiantoGas || '').trim() : old.scadenzaImpiantoGas,

      serbatoioAcquaPulita: input.serbatoioAcquaPulita !== undefined ? parseOptionalBool(input.serbatoioAcquaPulita) : old.serbatoioAcquaPulita,
      serbatoioAcqueGrigie: input.serbatoioAcqueGrigie !== undefined ? parseOptionalBool(input.serbatoioAcqueGrigie) : old.serbatoioAcqueGrigie,
      pompaAcqua: input.pompaAcqua !== undefined ? parseOptionalBool(input.pompaAcqua) : old.pompaAcqua,
      boilerAcquaCalda: input.boilerAcquaCalda !== undefined ? parseOptionalBool(input.boilerAcquaCalda) : old.boilerAcquaCalda,

      riscaldamento: input.riscaldamento !== undefined ? parseOptionalBool(input.riscaldamento) : old.riscaldamento,
      tipoRiscaldamento: input.tipoRiscaldamento !== undefined ? String(input.tipoRiscaldamento || '').trim() : old.tipoRiscaldamento,
      boilerIntegrato: input.boilerIntegrato !== undefined ? parseOptionalBool(input.boilerIntegrato) : old.boilerIntegrato,
      climatizzatore: input.climatizzatore !== undefined ? parseOptionalBool(input.climatizzatore) : old.climatizzatore,
      predisposizioneClima: input.predisposizioneClima !== undefined ? parseOptionalBool(input.predisposizioneClima) : old.predisposizioneClima,

      numeroFinestre: input.numeroFinestre !== undefined ? parseOptionalNumber(input.numeroFinestre) : old.numeroFinestre,
      oblo: input.oblo !== undefined ? parseOptionalBool(input.oblo) : old.oblo,
      zanzariere: input.zanzariere !== undefined ? parseOptionalBool(input.zanzariere) : old.zanzariere,
      oscuranti: input.oscuranti !== undefined ? parseOptionalBool(input.oscuranti) : old.oscuranti,
      verandaTendalino: input.verandaTendalino !== undefined ? parseOptionalBool(input.verandaTendalino) : old.verandaTendalino,
      stabilizzatori: input.stabilizzatori !== undefined ? parseOptionalBool(input.stabilizzatori) : old.stabilizzatori,
      ruotaScorta: input.ruotaScorta !== undefined ? parseOptionalBool(input.ruotaScorta) : old.ruotaScorta,
      portabici: input.portabici !== undefined ? parseOptionalBool(input.portabici) : old.portabici,

      documenti: input.documenti !== undefined ? String(input.documenti ?? '') : old.documenti,
      tipologia: input.tipologia !== undefined ? String(input.tipologia ?? '') : old.tipologia,
      lunghezza: input.lunghezza !== undefined ? parseOptionalNumber(input.lunghezza) : old.lunghezza,
      posti: input.posti !== undefined ? parseOptionalNumber(input.posti) : old.posti,

      videoUrl: input.videoUrl !== undefined ? String(input.videoUrl || '').trim() : old.videoUrl,
      planimetriaUrl: input.planimetriaUrl !== undefined ? String(input.planimetriaUrl || '').trim() : old.planimetriaUrl,

      contattoTelefono: input.contattoTelefono !== undefined ? String(input.contattoTelefono || '').trim() : old.contattoTelefono,
      contattoWhatsapp: input.contattoWhatsapp !== undefined ? String(input.contattoWhatsapp || '').trim() : old.contattoWhatsapp,
      contattoEmail: input.contattoEmail !== undefined ? String(input.contattoEmail || '').trim() : old.contattoEmail,
      localita: input.localita !== undefined ? String(input.localita || '').trim() : old.localita,
      orariContatto: input.orariContatto !== undefined ? String(input.orariContatto || '').trim() : old.orariContatto,
      
      photos: Array.isArray(input.photos) ? input.photos : old.photos,
      note: input.note !== undefined ? String(input.note).trim() : old.note,
      updatedAt: nowIso()
    };

    const newRoulottes = [...db.roulottes];
    newRoulottes[existingIndex] = updated;

    const next = { ...db, roulottes: newRoulottes };
    addLog(`Modificata roulotte: ${updated.marca} ${updated.modello} (${updated.id})`);
    return saveDB(next);
  }

  function deleteRoulotte(id) {
    const db = getDB();
    const r = db.roulottes.find(x => x.id === id);
    if (!r) return;
    
    const next = {
      ...db,
      roulottes: db.roulottes.filter(x => x.id !== id)
    };
    addLog(`Eliminata roulotte: ${r.marca} ${r.modello} (${id})`);
    return saveDB(next);
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
    replaceAll,
    syncNow,
    pullFromServer,
    pushToServer,
    checkLogin,
    updateAdmin,
    addCategory,
    deleteCategory,
    addLog,
    setAuthToken: function(t){ authToken = String(t || ''); },
    getAuthToken: function(){ return authToken; }
  };
})();
