    const AUTH_KEY = 'admin_auth_v2';
    const toastWrap = document.getElementById('toastWrap');

    function showToast(variant, title, message, opts) {
      if (!toastWrap) return;
      const o = opts && typeof opts === 'object' ? opts : {};
      const v = String(variant || 'info');
      const t = String(title || '').trim();
      const m = String(message || '').trim();
      const timeoutMs = Number.isFinite(o.timeoutMs) ? o.timeoutMs : (v === 'error' ? 5200 : v === 'warning' ? 4200 : 2600);

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('data-variant', v);

      const icon = document.createElement('div');
      icon.className = 'toast-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = v === 'success' ? 'OK' : v === 'warning' ? '!' : v === 'error' ? 'X' : 'i';

      const body = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.className = 'toast-title';
      titleEl.textContent = t || (v === 'success' ? 'Operazione completata' : v === 'warning' ? 'Attenzione' : v === 'error' ? 'Errore' : 'Info');
      const msgEl = document.createElement('div');
      msgEl.className = 'toast-msg';
      msgEl.textContent = m || '';
      body.appendChild(titleEl);
      if (m) body.appendChild(msgEl);

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'toast-close';
      close.textContent = 'Chiudi';
      close.addEventListener('click', () => {
        try { toast.remove(); } catch {}
      });

      toast.appendChild(icon);
      toast.appendChild(body);
      toast.appendChild(close);

      const progressWrap = document.createElement('div');
      progressWrap.className = 'toast-progress';
      const progressBar = document.createElement('div');
      progressWrap.appendChild(progressBar);
      toast.appendChild(progressWrap);

      toastWrap.appendChild(toast);

      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        try { toast.remove(); } catch {}
      };

      if (timeoutMs > 0) {
        const startedAt = Date.now();
        const tick = () => {
          const p = Math.max(0, Math.min(1, (Date.now() - startedAt) / timeoutMs));
          progressBar.style.transform = `scaleX(${String(1 - p)})`;
          if (p >= 1) return cleanup();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      if (timeoutMs <= 0) progressWrap.style.display = 'none';
      if (o.persist === true) progressWrap.style.display = 'none';
      if (o.persist === true) return { close: cleanup };

      setTimeout(cleanup, timeoutMs + 250);
      return { close: cleanup };
    }

    const _errorSeen = new Map();
    function _shouldReport(key, ms = 180000) {
      const now = Date.now();
      const last = _errorSeen.get(key) || 0;
      if (now - last < ms) return false;
      _errorSeen.set(key, now);
      return true;
    }
    window.addEventListener('error', (e) => {
      try {
        const msg = String(e && e.message ? e.message : '');
        const file = String(e && e.filename ? e.filename : '');
        const line = (e && e.lineno) ? e.lineno : '';
        const col = (e && e.colno) ? e.colno : '';
        const isGeneric = (!msg || msg === 'Script error') && !file && !line && !col;
        const key = [msg || 'script_error', file, line, col].join('|');
        if (!isGeneric && _shouldReport(key)) {
          const detail = [msg, file, line ? ('L' + line) : '', col ? ('C' + col) : ''].filter(Boolean).join(' • ');
          showToast('error', 'Errore script', detail || 'Errore');
        }
        const token = window.RoulotteStore.getAuthToken();
        fetch(apiUrl('/api/admin/log'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' },
          body: JSON.stringify({ action: 'SCRIPT_ERROR', details: { message: msg || 'Script error', filename: file, lineno: line, colno: col } })
        }).catch(()=>{});
      } catch {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try {
        const msg = String(e && e.reason ? (e.reason.message || e.reason) : 'Promise rejection');
        if (_shouldReport('rej|' + msg)) showToast('error', 'Errore script', msg);
        const token = window.RoulotteStore.getAuthToken();
        fetch(apiUrl('/api/admin/log'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' },
          body: JSON.stringify({ action: 'SCRIPT_REJECTION', details: { message: msg } })
        }).catch(()=>{});
      } catch {}
    });
    // Elementi UI Principali
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const userEl = document.getElementById('user');
    const passEl = document.getElementById('pass');
    const loginApiBaseEl = document.getElementById('loginApiBase');
    const loginWsBaseEl = document.getElementById('loginWsBase');
    const loginApiHealthEl = document.getElementById('loginApiHealth');
    const clearApiOverrideBtn = document.getElementById('clearApiOverrideBtn');

    const app = document.getElementById('app');
    const pageTitle = document.getElementById('pageTitle');
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    const refreshBtn = document.getElementById('refreshBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');

    // Dashboard
    const statAvailable = document.getElementById('statAvailable');
    const statSold = document.getElementById('statSold');
    const statSoldValue = document.getElementById('statSoldValue');
    const statValue = document.getElementById('statValue');
    const statAvgPriceEl = document.getElementById('statAvgPrice');
    const statMinMaxEl = document.getElementById('statMinMax');
    const statPublishedEl = document.getElementById('statPublished');
    const statDraftsEl = document.getElementById('statDrafts');
    const statNoPhotosEl = document.getElementById('statNoPhotos');
    const catStats = document.getElementById('catStats');
    const activityLog = document.getElementById('activityLog');
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    const autoRefreshInterval = document.getElementById('autoRefreshInterval');
    const probeBtn = document.getElementById('probeBtn');
    const syncNowBtnDash = document.getElementById('syncNowBtnDash');
    const wsStatusEl = document.getElementById('wsStatus');
    const filterNoPhotosBtn = document.getElementById('filterNoPhotosBtn');
    const filterDraftsBtn = document.getElementById('filterDraftsBtn');
    const filterPublishedBtn = document.getElementById('filterPublishedBtn');
    let listFilterMissingPhotos = false;

    // Form Nuova Roulotte
    const newForm = document.getElementById('newForm');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const goListBtn = document.getElementById('goListBtn');
    const formMsg = document.getElementById('formMsg');
    const formTitle = document.getElementById('formTitle');

    const editIdEl = document.getElementById('editId'); // Hidden
    const marcaEl = document.getElementById('marca');
    const modelloEl = document.getElementById('modello');
    const statoEl = document.getElementById('stato');
    const statoAnnuncioEl = document.getElementById('stato_annuncio');
    const categoryIdEl = document.getElementById('categoryId'); 
    const prezzoEl = document.getElementById('prezzo');
    const annoEl = document.getElementById('anno');
    
    // Nuovi campi
    const versioneEl = document.getElementById('versione');
    const tipologiaMezzoEl = document.getElementById('tipologiaMezzo');
    const prontaConsegnaEl = document.getElementById('prontaConsegna');

    const condizioneGeneraleEl = document.getElementById('condizioneGenerale');
    const statoInterniEl = document.getElementById('statoInterni');
    const statoEsterniEl = document.getElementById('statoEsterni');
    const infiltrazioniEl = document.getElementById('infiltrazioni');
    const odoriEl = document.getElementById('odori');
    const provenienzaEl = document.getElementById('provenienza');

    const targataEl = document.getElementById('targata');
    const librettoCircolazioneEl = document.getElementById('librettoCircolazione');
    const omologataCircolazioneEl = document.getElementById('omologataCircolazione');
    const numeroTelaioEl = document.getElementById('numeroTelaio');
    const numeroAssiEl = document.getElementById('numeroAssi');
    const timoneEl = document.getElementById('timone');
    const frenoRepulsioneEl = document.getElementById('frenoRepulsione');
    const pesoVuotoEl = document.getElementById('pesoVuoto');

    const lunghezzaEl = document.getElementById('lunghezza');
    const lunghezzaInternaEl = document.getElementById('lunghezzaInterna');
    const larghezzaEl = document.getElementById('larghezza');
    const altezzaEl = document.getElementById('altezza');
    const postiEl = document.getElementById('posti');
    const massaEl = document.getElementById('massa');
    const documentiEl = document.getElementById('documenti');
    const tipologiaEl = document.getElementById('tipologia');

    const lettoFissoEl = document.getElementById('lettoFisso');

    const tipoDinetteEl = document.getElementById('tipoDinette');
    const cucinaEl = document.getElementById('cucina');
    const bagnoEl = document.getElementById('bagno');
    const docciaSeparataEl = document.getElementById('docciaSeparata');
    const armadiEl = document.getElementById('armadi');
    const gavoniInterniEl = document.getElementById('gavoniInterni');

    const presa220EsternaEl = document.getElementById('presa220Esterna');
    const impianto12VEl = document.getElementById('impianto12V');
    const batteriaServiziEl = document.getElementById('batteriaServizi');
    const illuminazioneLedEl = document.getElementById('illuminazioneLed');
    const impiantoGasEl = document.getElementById('impiantoGas');
    const numeroBomboleEl = document.getElementById('numeroBombole');
    const scadenzaImpiantoGasEl = document.getElementById('scadenzaImpiantoGas');
    const serbatoioAcquaPulitaEl = document.getElementById('serbatoioAcquaPulita');
    const serbatoioAcqueGrigieEl = document.getElementById('serbatoioAcqueGrigie');
    const riscaldamentoEl = document.getElementById('riscaldamento');
    const tipoRiscaldamentoEl = document.getElementById('tipoRiscaldamento');
    const climatizzatoreEl = document.getElementById('climatizzatore');
    const predisposizioneClimaEl = document.getElementById('predisposizioneClima');
    const verandaTendalinoEl = document.getElementById('verandaTendalino');
    const portabiciEl = document.getElementById('portabici');

    const contattoTelefonoEl = document.getElementById('contattoTelefono');
    const contattoWhatsappEl = document.getElementById('contattoWhatsapp');
    const contattoEmailEl = document.getElementById('contattoEmail');
    const localitaEl = document.getElementById('localita');
    const orariContattoEl = document.getElementById('orariContatto');
    const videoUrlEl = document.getElementById('videoUrl');
    const planimetriaUrlEl = document.getElementById('planimetriaUrl');

    const noteEl = document.getElementById('note');
    const editor = document.getElementById('editor'); // Nuovo WYSIWYG
    const noteStatsEl = document.getElementById('noteStats');

    // Upload
    const photosInput = document.getElementById('photosInput');
    const dropzone = document.getElementById('dropzone'); // Nuovo
    const photosPreview = document.getElementById('photosPreview');
    const photoHint = document.getElementById('photoHint');
    const photoCountEl = document.getElementById('photoCount');
    const photoUrlInput = document.getElementById('photoUrlInput');
    const addPhotoUrlBtn = document.getElementById('addPhotoUrlBtn');
    const autoAltBtn = document.getElementById('autoAltBtn');
    const clearPhotosBtn = document.getElementById('clearPhotosBtn');
    const newFormChecklist = document.getElementById('newFormChecklist');
    const newFormChecklistHint = document.getElementById('newFormChecklistHint');
    const saveAndPublishBtn = document.getElementById('saveAndPublishBtn');
    const aiInput = document.getElementById('aiInput');
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    const aiApplyBtn = document.getElementById('aiApplyBtn');
    const aiClearBtn = document.getElementById('aiClearBtn');
    const aiSuggestionsEl = document.getElementById('aiSuggestions');
    const copyLastBtn = document.getElementById('copyLastBtn');
    let draftPhotos = [];
    let draftEditingUpdatedAt = '';
    let aiPendingSuggestions = [];
    let newFormDirty = false;
    function setNewFormDirty(v) { newFormDirty = !!v; }
    function markNewFormDirty() { newFormDirty = true; }
    if (newForm) {
      newForm.addEventListener('input', () => markNewFormDirty(), true);
      newForm.addEventListener('change', () => markNewFormDirty(), true);
    }

    // Categorie
    const catList = document.getElementById('catList');
    const categoriesGrid = document.getElementById('categoriesGrid');
    const newCatName = document.getElementById('newCatName');
    const addCatBtn = document.getElementById('addCatBtn');

    // Sicurezza e Settings
    const securityForm = document.getElementById('securityForm');
    const newAuthUser = document.getElementById('newAuthUser');
    const newAuthPass = document.getElementById('newAuthPass');
    const secMsg = document.getElementById('secMsg');
    const adminUsersCard = document.getElementById('adminUsersCard');
    const adminUsersRefreshBtn = document.getElementById('adminUsersRefreshBtn');
    const adminUsersMsg = document.getElementById('adminUsersMsg');
    const adminUsersRole = document.getElementById('adminUsersRole');
    const adminUsersLocked = document.getElementById('adminUsersLocked');
    const adminUsersCreateForm = document.getElementById('adminUsersCreateForm');
    const adminNewUsername = document.getElementById('adminNewUsername');
    const adminNewPassword = document.getElementById('adminNewPassword');
    const adminUsersList = document.getElementById('adminUsersList');
    const adminResetUserForm = document.getElementById('adminResetUserForm');
    const adminResetCode = document.getElementById('adminResetCode');
    const adminResetUsername = document.getElementById('adminResetUsername');
    const adminResetPassword = document.getElementById('adminResetPassword');
    const adminResetUserMsg = document.getElementById('adminResetUserMsg');
    const exportBtn = document.getElementById('exportBtn');
    const importInput = document.getElementById('importInput');
    const importBtn = document.getElementById('importBtn');
    const importMsg = document.getElementById('importMsg');
    const syncNowBtn = document.getElementById('syncNowBtn');
    const pullServerBtn = document.getElementById('pullServerBtn');
    const pushServerBtn = document.getElementById('pushServerBtn');
    const syncMsg = document.getElementById('syncMsg');
    const wipeBtn = document.getElementById('wipeBtn');
    const siteStatsUpdatedAtEl = document.getElementById('siteStatsUpdatedAt');
    const siteStatsTotalEl = document.getElementById('siteStatsTotal');
    const siteStatsResultsEl = document.getElementById('siteStatsResults');
    const builderPageKey = document.getElementById('builderPageKey');
    const builderLoadBtn = document.getElementById('builderLoadBtn');
    const builderSaveBtn = document.getElementById('builderSaveBtn');
    const builderPublishBtn = document.getElementById('builderPublishBtn');
    const builderPreviewBtn = document.getElementById('builderPreviewBtn');
    const builderUndoBtn = document.getElementById('builderUndoBtn');
    const builderRedoBtn = document.getElementById('builderRedoBtn');
    const builderPreviewDialog = document.getElementById('builderPreviewDialog');
    const builderPreviewFrame = document.getElementById('builderPreviewFrame');
    const builderPreviewCloseBtn = document.getElementById('builderPreviewCloseBtn');
    const builderPreviewReloadBtn = document.getElementById('builderPreviewReloadBtn');
    const builderStatus = document.getElementById('builderStatus');
    const liveFrame = document.getElementById('liveFrame');
    const liveEnableBtn = document.getElementById('liveEnableBtn');
    const liveReloadBtn = document.getElementById('liveReloadBtn');
    const liveSaveBtn = document.getElementById('liveSaveBtn');
    const livePublishBtn = document.getElementById('livePublishBtn');
    const liveStatusEl = document.getElementById('liveStatus');
    let gjsEditor = null;
    function updateOfflineUiState(isOffline) {
      const mb = document.getElementById('modeBadge');
      if (mb) mb.textContent = isOffline ? 'Modalità: Offline' : 'Modalità: Online';
      const disable = (el) => { if (el) el.disabled = !!isOffline; };
      disable(publishContentBtn);
      disable(mediaUploadBtn);
      disable(syncNowBtn);
      disable(pullServerBtn);
      disable(pushServerBtn);
      disable(livePublishBtn);
      disable(liveSaveBtn);
    }
    let builderAutoLoaded = false;
    let builderLoading = false;
    let builderDirty = false;
    let builderStatusBase = String(builderStatus && builderStatus.textContent || 'Inattivo');

    // Elenco
    const listMeta = document.getElementById('listMeta');
    const listQ = document.getElementById('listQ');
    const listCategory = document.getElementById('listCategory');
    const listStato = document.getElementById('listStato');
    const listAnnuncio = document.getElementById('listAnnuncio');
    const listReset = document.getElementById('listReset');
    const tableBody = document.getElementById('tableBody');
    const shareTitleEl = document.getElementById('shareTitle');
    const shareExpiresEl = document.getElementById('shareExpires');
    const shareClearSelBtn = document.getElementById('shareClearSel');
    const shareCreateBtn = document.getElementById('shareCreateBtn');
    const shareSelCountEl = document.getElementById('shareSelCount');

    // Dettaglio
    const detailTitle = document.getElementById('detailTitle');
    const detailMeta = document.getElementById('detailMeta');
    const detailBackBtn = document.getElementById('detailBackBtn');
    const detailOpenPublicBtn = document.getElementById('detailOpenPublicBtn');
    const detailDuplicateBtn = document.getElementById('detailDuplicateBtn');
    const detailSoldBtn = document.getElementById('detailSoldBtn');
    const detailExportSubitoBtn = document.getElementById('detailExportSubitoBtn');
    const detailExportFbBtn = document.getElementById('detailExportFbBtn');
    const detailBmSubitoBtn = document.getElementById('detailBmSubitoBtn');
    const detailBmFbBtn = document.getElementById('detailBmFbBtn');
    const detailEditBtn = document.getElementById('detailEditBtn');
    const detailPhotos = document.getElementById('detailPhotos');
    const detailInfo = document.getElementById('detailInfo');
    const detailNote = document.getElementById('detailNote');
    let currentDetailId = null;
    const selectedShareIds = new Set();

    // --- Helpers ---
    function normalize(s) { return String(s ?? '').trim().toLowerCase(); }
    function formatPrice(v) { 
      const n = Number(v); 
      return Number.isFinite(n) ? '€ ' + n.toLocaleString('it-IT') : '€ —'; 
    }
    async function copyText(text) {
      const t = String(text || '');
      if (!t) return false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(t);
          return true;
        }
      } catch {}
      try {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
    function toNullIfEmpty(v) {
      const s = String(v ?? '').trim();
      return s === '' ? null : s;
    }
    function toNullIfEmptyNumber(v) {
      const s = String(v ?? '').trim();
      if (s === '') return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    function getRadioValue(name) {
      const el = document.querySelector(`input[type="radio"][name="${name}"]:checked`);
      return el ? el.value : '';
    }
    function setRadioValue(name, value) {
      const v = String(value ?? '').trim();
      document.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach(r => r.checked = (r.value === v));
    }
    function getCheckedValues(name) {
      return Array.from(document.querySelectorAll(`input[type="checkbox"][name="${name}"]:checked`)).map(el => el.value);
    }
    function setCheckedValues(name, values) {
      const set = new Set((Array.isArray(values) ? values : []).map(v => String(v ?? '').trim()));
      document.querySelectorAll(`input[type="checkbox"][name="${name}"]`).forEach(el => el.checked = set.has(el.value));
    }
    function setBoolSelect(el, v) {
      if (!el) return;
      if (v === true) el.value = 'Sì';
      else if (v === false) el.value = 'No';
      else el.value = '';
    }
    function boolLabel(v) {
      if (v === true) return 'Sì';
      if (v === false) return 'No';
      return '—';
    }

    function setInvalidControl(el, invalid) {
      if (!el) return;
      const bad = invalid === true;
      if (bad) {
        el.classList.add('is-invalid');
        el.setAttribute('aria-invalid', 'true');
      } else {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
      }
    }

    function computeNewFormChecklistState() {
      const marca = String(marcaEl?.value || '').trim();
      const modello = String(modelloEl?.value || '').trim();
      const prezzo = Number(prezzoEl?.value);
      const anno = Number(annoEl?.value);
      const tipologiaMezzo = String(tipologiaMezzoEl?.value || '').trim();
      const statoAnnuncio = String((statoAnnuncioEl && statoAnnuncioEl.value) ? statoAnnuncioEl.value : 'bozza');

      const state = {
        marca: marca.length > 0,
        modello: modello.length > 0,
        prezzo: Number.isFinite(prezzo) && prezzo > 0,
        anno: Number.isFinite(anno) && anno >= 1970 && anno <= 2100,
        tipologiaMezzo: tipologiaMezzo.length > 0,
        foto: Array.isArray(draftPhotos) && draftPhotos.length > 0,
        statoAnnuncio
      };
      state.requiredOk = state.marca && state.modello && state.prezzo && state.anno && state.tipologiaMezzo;
      state.publishOk = state.requiredOk && state.foto;
      return state;
    }

    function updateNewFormChecklistUi() {
      const state = computeNewFormChecklistState();

      if (photoCountEl) {
        photoCountEl.textContent = 'Foto selezionate: ' + String((draftPhotos && draftPhotos.length) ? draftPhotos.length : 0);
      }

      if (newFormChecklist) {
        const items = Array.from(newFormChecklist.querySelectorAll('.check-item'));
        items.forEach((it) => {
          const key = String(it.getAttribute('data-key') || '').trim();
          const ok = !!state[key];
          const dot = it.querySelector('.check-dot');
          if (ok) it.classList.add('is-ok');
          else it.classList.remove('is-ok');
          if (dot) {
            dot.classList.toggle('is-ok', ok);
            dot.classList.toggle('is-bad', !ok);
          }
        });
        if (newFormChecklistHint) {
          if (state.publishOk) newFormChecklistHint.textContent = 'Pronto: puoi pubblicare.';
          else if (state.requiredOk && !state.foto) newFormChecklistHint.textContent = 'Aggiungi almeno una foto per pubblicare.';
          else {
            const missing = [];
            if (!state.marca) missing.push('Marca');
            if (!state.modello) missing.push('Modello');
            if (!state.prezzo) missing.push('Prezzo (> 0)');
            if (!state.anno) missing.push('Anno');
            if (!state.tipologiaMezzo) missing.push('Tipologia');
            newFormChecklistHint.textContent = 'Manca: ' + missing.join(', ') + '.';
          }
        }
      }

      const submitBtn = newForm ? newForm.querySelector('button[type="submit"]') : null;
      const requiresPhoto = state.statoAnnuncio !== 'bozza';
      if (submitBtn) submitBtn.disabled = !state.requiredOk || (requiresPhoto && !state.foto);
      if (saveAndPublishBtn) saveAndPublishBtn.disabled = !state.publishOk;
    }

    function focusAndHighlight(el) {
      if (!el) return;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      try { if (typeof el.focus === 'function') el.focus({ preventScroll: true }); } catch {}
      try {
        el.classList.add('jump-highlight');
        setTimeout(() => { try { el.classList.remove('jump-highlight'); } catch {} }, 900);
      } catch {}
    }
    function jumpToNewFormField(key) {
      const k = String(key || '').trim();
      if (!k) return;
      const map = {
        marca: marcaEl,
        modello: modelloEl,
        prezzo: prezzoEl,
        anno: annoEl,
        tipologiaMezzo: tipologiaMezzoEl,
        foto: dropzone || photoUrlInput || photosInput
      };
      focusAndHighlight(map[k]);
    }
    if (newFormChecklist) {
      newFormChecklist.addEventListener('click', (e) => {
        const t = e && e.target;
        if (!t || typeof t.closest !== 'function') return;
        const item = t.closest('.check-item');
        if (!item) return;
        const key = item.getAttribute('data-key');
        jumpToNewFormField(key);
      });
    }

    function stripHtmlToText(html) {
      try {
        const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        return String((doc.body && doc.body.textContent) ? doc.body.textContent : '').trim();
      } catch {
        return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    function updateNoteStats() {
      if (!noteStatsEl) return;
      const text = stripHtmlToText(editor ? editor.innerHTML : (noteEl ? noteEl.value : ''));
      const chars = text.length;
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      noteStatsEl.textContent = `(${words} parole, ${chars} caratteri)`;
    }

    function toTitleCase(s) {
      return String(s || '').toLowerCase().replace(/\b\p{L}/gu, (m) => m.toUpperCase()).trim();
    }

    function normalizePhone(raw) {
      const digits = String(raw || '').replace(/[^\d+]/g, '');
      const d = digits.replace(/\D/g, '');
      if (!d) return '';
      if (d.startsWith('39') && d.length >= 11) return '+' + d;
      if (d.length === 10 && d.startsWith('3')) return '+39' + d;
      if (d.length === 9 && d.startsWith('3')) return '+39' + d;
      return digits.startsWith('+') ? digits : '+' + d;
    }

    function parsePriceFromText(text) {
      const t = String(text || '');
      const m = t.match(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[.,](\d{2}))?\s*€?/i);
      if (!m) return null;
      const intPart = String(m[1] || '').replace(/[.\s]/g, '');
      const dec = (m[2] !== undefined) ? String(m[2] || '') : '';
      const num = Number(intPart + (dec ? '.' + dec : ''));
      return Number.isFinite(num) ? num : null;
    }

    function parseYearFromText(text) {
      const t = String(text || '');
      const years = Array.from(t.matchAll(/\b(19\d{2}|20\d{2})\b/g)).map(m => Number(m[1]));
      const y = years.find(v => v >= 1970 && v <= 2100);
      return Number.isFinite(y) ? y : null;
    }

    function inferYesNo(text, keyword) {
      const t = String(text || '').toLowerCase();
      const k = String(keyword || '').toLowerCase();
      const idx = t.indexOf(k);
      if (idx < 0) return '';
      const around = t.slice(Math.max(0, idx - 18), Math.min(t.length, idx + k.length + 22));
      if (/(no|assent|mai|nessun)/i.test(around)) return 'No';
      if (/(sì|si|presen|ok|inclus)/i.test(around)) return 'Sì';
      return '';
    }

    function inferEnum(text, options) {
      const t = String(text || '').toLowerCase();
      const opts = Array.isArray(options) ? options : [];
      for (const o of opts) {
        const v = String(o || '').trim();
        if (!v) continue;
        if (t.includes(v.toLowerCase())) return v;
      }
      return '';
    }

    function inferTipologiaMezzo(text) {
      const t = String(text || '').toLowerCase();
      if (t.includes('casa mobile') || t.includes('casa-mobile') || t.includes('mobilhome') || t.includes('mobile home')) return 'Casa mobile';
      if (t.includes('campeggio') || t.includes('stanziale')) return 'Roulotte da campeggio';
      if (t.includes('progetto') || t.includes('da sistemare')) return 'Da sistemare / progetto';
      if (t.includes('roulotte') || t.includes('caravan') || t.includes('caravana')) return 'Roulotte stradale';
      return '';
    }

    function inferMarcaModello(text) {
      const raw = String(text || '').trim();
      if (!raw) return { marca: '', modello: '' };
      const firstLine = raw.split(/\r?\n/).map(s => s.trim()).find(Boolean) || raw;
      const head = firstLine.split(/[|•·]/)[0].split(' - ')[0].split(' – ')[0].trim();
      const cleaned = head
        .replace(/\b(roulotte|caravan|caravans|caravana|venduta|venduto|vendo|vendesi)\b/gi, '')
        .replace(/\b(19\d{2}|20\d{2})\b/g, '')
        .replace(/€.*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) return { marca: '', modello: '' };
      const parts = cleaned.split(' ').filter(Boolean);
      if (parts.length === 1) return { marca: toTitleCase(parts[0]), modello: '' };
      const known = new Set(['hobby','adria','knaus','fendt','bürstner','burstner','dethleffs','caravelair','hymer','weinsberg','tabbert','wilks','swift','bailey','eriba','laika']);
      const first = String(parts[0] || '').toLowerCase();
      const marca = toTitleCase(parts[0]);
      const modello = parts.slice(1).join(' ').trim();
      if (known.has(first)) return { marca, modello };
      return { marca, modello };
    }

    function findCategoryIdByNameLike(keyword) {
      if (!categoryIdEl) return '';
      const k = String(keyword || '').toLowerCase().trim();
      if (!k) return '';
      const opts = Array.from(categoryIdEl.querySelectorAll('option'));
      const found = opts.find(o => String(o.textContent || '').toLowerCase().includes(k));
      return found ? String(found.value || '') : '';
    }

    function buildAiSuggestionsFromText(text) {
      const raw = String(text || '').trim();
      const lower = raw.toLowerCase();
      const suggestions = [];

      const mm = inferMarcaModello(raw);
      if (mm.marca) suggestions.push({ key: 'marca', label: 'Marca', value: mm.marca, reason: 'Prima riga testo' });
      if (mm.modello) suggestions.push({ key: 'modello', label: 'Modello', value: mm.modello, reason: 'Prima riga testo' });

      const yr = parseYearFromText(raw);
      if (yr) suggestions.push({ key: 'anno', label: 'Anno', value: String(yr), reason: 'Anno trovato nel testo' });

      const pr = parsePriceFromText(raw);
      if (Number.isFinite(pr)) suggestions.push({ key: 'prezzo', label: 'Prezzo', value: String(pr), reason: 'Prezzo trovato nel testo' });

      const tipo = inferTipologiaMezzo(raw);
      if (tipo) suggestions.push({ key: 'tipologiaMezzo', label: 'Tipologia', value: tipo, reason: 'Parole chiave (roulotte/campeggio/casa mobile)' });

      const stato = inferEnum(lower, ['ottimo', 'buono', 'nuovo', 'da sistemare', 'venduto']);
      if (stato) suggestions.push({ key: 'stato', label: 'Stato', value: toTitleCase(stato), reason: 'Parola chiave nel testo' });

      if (lower.includes('vendut')) suggestions.push({ key: 'stato_annuncio', label: 'Pubblicazione', value: 'venduto', reason: 'Parola chiave “vendut*”' });
      else if (lower.includes('pubblicat')) suggestions.push({ key: 'stato_annuncio', label: 'Pubblicazione', value: 'pubblicato', reason: 'Parola chiave “pubblicat*”' });

      const infil = inferYesNo(raw, 'infiltr');
      if (infil) suggestions.push({ key: 'infiltrazioni', label: 'Infiltrazioni', value: infil === 'No' ? 'No' : infil === 'Sì' ? 'Sì' : infil, reason: 'Parola chiave “infiltr*”' });

      const targ = inferYesNo(raw, 'targ');
      if (targ) suggestions.push({ key: 'targata', label: 'Targata', value: targ, reason: 'Parola chiave “targ*”' });

      const lib = inferYesNo(raw, 'librett');
      if (lib) suggestions.push({ key: 'librettoCircolazione', label: 'Libretto', value: lib, reason: 'Parola chiave “librett*”' });

      const omo = inferYesNo(raw, 'omolog');
      if (omo) suggestions.push({ key: 'omologataCircolazione', label: 'Omologata circolazione', value: omo, reason: 'Parola chiave “omolog*”' });

      const perm = inferYesNo(raw, 'permuta');
      if (perm) suggestions.push({ key: 'permuta', label: 'Permuta', value: perm === 'Sì' ? 'Sì' : 'No', reason: 'Parola chiave “permuta”' });

      if (lower.includes('pronta consegna') || lower.includes('subito disponibile') || lower.includes('disponibile subito')) {
        suggestions.push({ key: 'prontaConsegna', label: 'Pronta consegna', value: 'Sì', reason: 'Parola chiave “pronta consegna / subito”' });
      }

      const email = (raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
      if (email) suggestions.push({ key: 'contattoEmail', label: 'Email', value: email, reason: 'Email nel testo' });

      const phoneMatch = raw.match(/(?:\+39\s*)?(?:3\d[\s.-]*){8,11}/);
      if (phoneMatch && phoneMatch[0]) {
        const ph = normalizePhone(phoneMatch[0]);
        if (ph) suggestions.push({ key: 'contattoTelefono', label: 'Telefono', value: ph, reason: 'Telefono nel testo' });
      }

      if (lower.includes('veranda') || lower.includes('tendalino')) suggestions.push({ key: 'verandaTendalino', label: 'Veranda/Tendalino', value: 'Sì', reason: 'Parola chiave “veranda/tendalino”' });
      if (lower.includes('portabici')) suggestions.push({ key: 'portabici', label: 'Portabici', value: 'Sì', reason: 'Parola chiave “portabici”' });
      if (lower.includes('clima') || lower.includes('climatizz')) suggestions.push({ key: 'climatizzatore', label: 'Climatizzatore', value: 'Sì', reason: 'Parola chiave “clima”' });

      if (tipo) {
        const catId = findCategoryIdByNameLike(tipo);
        if (catId) suggestions.push({ key: 'categoryId', label: 'Categoria', value: catId, reason: 'Categoria simile a tipologia' });
      }

      if (raw.length >= 40) suggestions.push({ key: 'note', label: 'Descrizione', value: raw, reason: 'Testo incollato' });

      const seen = new Set();
      return suggestions.filter(s => {
        const k = String(s.key || '');
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    function renderAiSuggestions(list) {
      if (!aiSuggestionsEl) return;
      const arr = Array.isArray(list) ? list : [];
      if (!arr.length) {
        aiSuggestionsEl.textContent = 'Nessun suggerimento trovato.';
        if (aiApplyBtn) aiApplyBtn.disabled = true;
        return;
      }
      const lines = arr.map(s => `${s.label}: ${s.value} — ${s.reason}`);
      aiSuggestionsEl.textContent = lines.join('\n');
      if (aiApplyBtn) aiApplyBtn.disabled = false;
    }

    function applyAiSuggestions(list) {
      const arr = Array.isArray(list) ? list : [];
      const setSelectIfPossible = (el, v) => {
        if (!el) return false;
        const value = String(v ?? '').trim();
        if (!value) return false;
        const opt = Array.from(el.querySelectorAll('option')).find(o => String(o.value || '') === value || String(o.textContent || '').trim().toLowerCase() === value.toLowerCase());
        if (opt) { el.value = String(opt.value || ''); return true; }
        return false;
      };
      const setIfEmpty = (el, v, force) => {
        if (!el) return false;
        const value = String(v ?? '').trim();
        if (!value) return false;
        const cur = String(el.value ?? '').trim();
        if (!force && cur) return false;
        el.value = value;
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        return true;
      };

      let applied = 0;
      for (const s of arr) {
        const key = String(s.key || '').trim();
        const val = s.value;
        if (key === 'marca') applied += setIfEmpty(marcaEl, val, false) ? 1 : 0;
        else if (key === 'modello') applied += setIfEmpty(modelloEl, val, false) ? 1 : 0;
        else if (key === 'anno') applied += setIfEmpty(annoEl, val, false) ? 1 : 0;
        else if (key === 'prezzo') applied += setIfEmpty(prezzoEl, val, false) ? 1 : 0;
        else if (key === 'tipologiaMezzo') applied += setSelectIfPossible(tipologiaMezzoEl, val) ? 1 : 0;
        else if (key === 'stato') applied += setSelectIfPossible(statoEl, val) ? 1 : 0;
        else if (key === 'stato_annuncio') applied += setSelectIfPossible(statoAnnuncioEl, val) ? 1 : 0;
        else if (key === 'infiltrazioni') applied += setSelectIfPossible(infiltrazioniEl, val) ? 1 : 0;
        else if (key === 'targata') applied += setSelectIfPossible(targataEl, val) ? 1 : 0;
        else if (key === 'librettoCircolazione') applied += setSelectIfPossible(librettoCircolazioneEl, val) ? 1 : 0;
        else if (key === 'omologataCircolazione') applied += setSelectIfPossible(omologataCircolazioneEl, val) ? 1 : 0;
        else if (key === 'contattoTelefono') applied += setIfEmpty(contattoTelefonoEl, val, false) ? 1 : 0;
        else if (key === 'contattoEmail') applied += setIfEmpty(contattoEmailEl, val, false) ? 1 : 0;
        else if (key === 'categoryId') applied += setSelectIfPossible(categoryIdEl, val) ? 1 : 0;
        else if (key === 'prontaConsegna') { if (prontaConsegnaEl && !prontaConsegnaEl.checked) { prontaConsegnaEl.checked = true; applied++; } }
        else if (key === 'permuta') { if (!getRadioValue('permuta') && (val === 'Sì' || val === 'No')) { setRadioValue('permuta', val); applied++; } }
        else if (key === 'verandaTendalino') applied += setSelectIfPossible(verandaTendalinoEl, val) ? 1 : 0;
        else if (key === 'portabici') applied += setSelectIfPossible(portabiciEl, val) ? 1 : 0;
        else if (key === 'climatizzatore') applied += setSelectIfPossible(climatizzatoreEl, val) ? 1 : 0;
        else if (key === 'note') {
          const cur = String((editor && editor.innerHTML) ? editor.innerHTML : '').trim();
          if (!cur && editor) {
            editor.textContent = String(val || '');
            noteEl.value = editor.innerHTML;
            applied++;
          }
        }
      }
      updateNewFormChecklistUi();
      updateNoteStats();
      try { saveDraft(); } catch {}
      return applied;
    }

    function renderBuilderStatus() {
      if (!builderStatus) return;
      const parts = [];
      const base = String(builderStatusBase || '').trim();
      if (base) parts.push(base);
      if (builderDirty) parts.push('Modifiche non salvate');
      builderStatus.textContent = parts.length ? parts.join(' · ') : 'Inattivo';
    }
    function setBuilderStatusBase(text) {
      builderStatusBase = String(text || '');
      renderBuilderStatus();
    }
    function setBuilderDirty(next) {
      builderDirty = !!next;
      renderBuilderStatus();
    }

    function syncBuilderThemeToCanvas() {
      try {
        if (!gjsEditor || !gjsEditor.Canvas) return;
        const doc = gjsEditor.Canvas.getDocument && gjsEditor.Canvas.getDocument();
        if (!doc || !doc.documentElement) return;
        doc.documentElement.dataset.theme = document.documentElement.dataset.theme || 'light';
      } catch {}
    }

    function applyTheme(theme) {
      const next = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('admin_theme', next);
      if (themeToggleBtn) themeToggleBtn.textContent = next === 'dark' ? 'Tema: Scuro' : 'Tema: Chiaro';
      syncBuilderThemeToCanvas();
    }
    function initTheme() {
      const saved = localStorage.getItem('admin_theme');
      applyTheme(saved || document.documentElement.dataset.theme || 'light');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        });
      }
    }

    let adminVoiceRecognition = null;
    let adminVoiceActive = false;
    let adminVoiceLastErrorAt = 0;
    let adminVoiceLastStartAt = 0;
    let adminVoiceRestartTimer = null;

    function getAdminVoiceCtor() {
      const w = window;
      return (w && (w.SpeechRecognition || w.webkitSpeechRecognition)) || null;
    }

    function updateAdminVoiceToggleUi() {
      if (!voiceToggleBtn) return;
      voiceToggleBtn.textContent = adminVoiceActive ? 'Voce: On' : 'Voce: Off';
      voiceToggleBtn.setAttribute('aria-pressed', adminVoiceActive ? 'true' : 'false');
      if (adminVoiceActive) voiceToggleBtn.classList.add('listening');
      else voiceToggleBtn.classList.remove('listening');
    }

    function setAdminVoiceActive(next) {
      adminVoiceActive = !!next;
      updateAdminVoiceToggleUi();
    }

    function stopAdminVoiceRecognition(opts) {
      const o = opts && typeof opts === 'object' ? opts : {};
      const silent = o.silent === true;
      if (adminVoiceRestartTimer) { clearTimeout(adminVoiceRestartTimer); adminVoiceRestartTimer = null; }
      if (adminVoiceRecognition) {
        try { adminVoiceRecognition.onend = null; } catch {}
        try { adminVoiceRecognition.stop(); } catch {}
      }
      setAdminVoiceActive(false);
      if (!silent) showToast('info', 'Voce', 'Comandi vocali disattivati.', { timeoutMs: 1600 });
    }

    function stripDiacritics(s) {
      try { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return String(s || ''); }
    }

    function normalizeVoiceMatch(s) {
      return stripDiacritics(String(s || '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function getActiveSectionId() {
      const el = document.querySelector('.section.active');
      return el && el.id ? String(el.id) : '';
    }

    function parseNumberFromVoice(text) {
      const t = normalizeVoiceMatch(text);
      const m = t.match(/(\d+(?:[.,]\d+)?)/);
      if (!m) return null;
      let n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return null;
      if (/\bmila\b/.test(t) && n > 0 && n < 1000) n = n * 1000;
      return n;
    }

    function setFieldValue(el, value) {
      if (!el) return false;
      try { el.value = value; } catch { return false; }
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
      return true;
    }

    function setSelectBySpoken(selectEl, spoken) {
      if (!selectEl) return false;
      const target = normalizeVoiceMatch(spoken);
      if (!target) return false;
      const opts = Array.from(selectEl.options || []);
      let best = null;
      for (const o of opts) {
        const label = normalizeVoiceMatch(o && o.textContent ? o.textContent : '');
        if (!label) continue;
        if (label === target) { best = o; break; }
        if (!best && (label.includes(target) || target.includes(label))) best = o;
      }
      if (!best) return false;
      return setFieldValue(selectEl, best.value);
    }

    function setEditorHtml(html) {
      if (!editor || !noteEl) return false;
      editor.innerHTML = String(html || '');
      try { editor.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
      return true;
    }

    function handleAdminVoiceCommand(raw) {
      const text = String(raw || '').trim();
      if (!text) return;
      const lower = normalizeVoiceMatch(text);

      if (/\b(ferma|stop|disattiva)\b/.test(lower) && /\bvoce\b/.test(lower)) {
        stopAdminVoiceRecognition({ silent: false });
        return;
      }
      if (/\b(attiva|avvia)\b/.test(lower) && /\bvoce\b/.test(lower)) {
        startAdminVoiceRecognition({ silent: false });
        return;
      }

      if (getActiveSectionId() !== 'new') {
        showToast('info', 'Voce', 'Vai su “Nuova Roulotte” per compilare con la voce.', { timeoutMs: 2200 });
        return;
      }

      let m = null;
      if ((m = lower.match(/^marca\s+(.+)$/))) {
        setFieldValue(marcaEl, m[1]);
        showToast('success', 'Voce', 'Marca aggiornata.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^modello\s+(.+)$/))) {
        setFieldValue(modelloEl, m[1]);
        showToast('success', 'Voce', 'Modello aggiornato.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^versione\s+(.+)$/))) {
        setFieldValue(versioneEl, m[1]);
        showToast('success', 'Voce', 'Versione aggiornata.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^anno\s+(.+)$/))) {
        const n = parseNumberFromVoice(m[1]);
        if (n === null) { showToast('warning', 'Voce', 'Anno non riconosciuto.', { timeoutMs: 2200 }); return; }
        setFieldValue(annoEl, String(Math.floor(n)));
        showToast('success', 'Voce', 'Anno aggiornato.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^prezzo\s+(.+)$/))) {
        const n = parseNumberFromVoice(m[1]);
        if (n === null) { showToast('warning', 'Voce', 'Prezzo non riconosciuto.', { timeoutMs: 2200 }); return; }
        setFieldValue(prezzoEl, String(n));
        showToast('success', 'Voce', 'Prezzo aggiornato.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^categoria\s+(.+)$/))) {
        const ok = setSelectBySpoken(categoryIdEl, m[1]);
        if (!ok) { showToast('warning', 'Voce', 'Categoria non trovata.', { timeoutMs: 2200 }); return; }
        showToast('success', 'Voce', 'Categoria aggiornata.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^stato\s+(.+)$/))) {
        const ok = setSelectBySpoken(statoEl, m[1]);
        if (!ok) { showToast('warning', 'Voce', 'Stato non trovato.', { timeoutMs: 2200 }); return; }
        showToast('success', 'Voce', 'Stato aggiornato.', { timeoutMs: 1600 });
        return;
      }
      if ((m = lower.match(/^(stato\s+annuncio|annuncio)\s+(.+)$/))) {
        const ok = setSelectBySpoken(statoAnnuncioEl, m[2]);
        if (!ok) { showToast('warning', 'Voce', 'Stato annuncio non trovato.', { timeoutMs: 2200 }); return; }
        showToast('success', 'Voce', 'Stato annuncio aggiornato.', { timeoutMs: 1600 });
        return;
      }
      if (/\b(genera|rigenera)\b/.test(lower) && /\bdescriz/.test(lower)) {
        try {
          if (typeof window.generateDescription === 'function') window.generateDescription();
          showToast('success', 'Voce', 'Descrizione generata.', { timeoutMs: 1800 });
        } catch {
          showToast('error', 'Voce', 'Errore durante la generazione descrizione.', { timeoutMs: 2600 });
        }
        return;
      }
      if ((m = lower.match(/^descrizione\s+(.+)$/))) {
        const html = '<p>' + escapeHtmlText(m[1]) + '</p>';
        setEditorHtml(html);
        showToast('success', 'Voce', 'Descrizione impostata.', { timeoutMs: 1800 });
        return;
      }
      if ((m = lower.match(/^(aggiungi\s+descrizione|aggiungi\s+nota|nota)\s+(.+)$/))) {
        const add = '<p>' + escapeHtmlText(m[2]) + '</p>';
        const cur = String(editor && editor.innerHTML ? editor.innerHTML : '');
        setEditorHtml((cur ? (cur + '<br>' + add) : add));
        showToast('success', 'Voce', 'Testo aggiunto in descrizione.', { timeoutMs: 1800 });
        return;
      }

      showToast('info', 'Voce', 'Comando non riconosciuto.', { timeoutMs: 2000 });
    }

    function startAdminVoiceRecognition(opts) {
      const o = opts && typeof opts === 'object' ? opts : {};
      const silent = o.silent === true;
      const Ctor = getAdminVoiceCtor();
      if (!Ctor) return;
      if (adminVoiceRestartTimer) { clearTimeout(adminVoiceRestartTimer); adminVoiceRestartTimer = null; }

      if (!adminVoiceRecognition) {
        adminVoiceRecognition = new Ctor();
        adminVoiceRecognition.interimResults = false;
        adminVoiceRecognition.continuous = true;
        adminVoiceRecognition.maxAlternatives = 1;
        adminVoiceRecognition.onresult = (e) => {
          try {
            const results = e && e.results ? e.results : null;
            const last = results && results.length ? results[results.length - 1] : null;
            const t = last && last[0] && last[0].transcript ? String(last[0].transcript) : '';
            if (t) handleAdminVoiceCommand(t);
          } catch {}
        };
        adminVoiceRecognition.onerror = (e) => {
          adminVoiceLastErrorAt = Date.now();
          const code = e && e.error ? String(e.error) : '';
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            showToast('error', 'Voce', 'Permesso microfono negato.', { timeoutMs: 3200 });
            stopAdminVoiceRecognition({ silent: true });
            return;
          }
          if (code === 'no-speech') return;
          showToast('error', 'Voce', 'Errore comandi vocali.', { timeoutMs: 2600 });
        };
      }

      adminVoiceRecognition.lang = 'it-IT';
      adminVoiceRecognition.onend = () => {
        if (!adminVoiceActive) return;
        const now = Date.now();
        if (now - adminVoiceLastErrorAt < 800) return;
        if (now - adminVoiceLastStartAt < 800) return;
        adminVoiceRestartTimer = setTimeout(() => {
          if (!adminVoiceActive) return;
          startAdminVoiceRecognition({ silent: true });
        }, 250);
      };

      try {
        adminVoiceLastStartAt = Date.now();
        adminVoiceRecognition.start();
        setAdminVoiceActive(true);
        if (!silent) showToast('info', 'Voce Attiva', 'In ascolto… Prova "Marca Adria", "Anno 2020", "Genera descrizione"…', { timeoutMs: 4000 });
      } catch {
        showToast('error', 'Voce', 'Impossibile avviare i comandi vocali.', { timeoutMs: 2600 });
        stopAdminVoiceRecognition({ silent: true });
      }
    }

    function toggleAdminVoiceRecognition() {
      if (adminVoiceActive) stopAdminVoiceRecognition({ silent: false });
      else startAdminVoiceRecognition({ silent: false });
    }

    function initAdminVoice() {
      if (!voiceToggleBtn) return;
      const Ctor = getAdminVoiceCtor();
      if (!Ctor) {
        voiceToggleBtn.disabled = true;
        voiceToggleBtn.textContent = 'Voce: non supportata';
        voiceToggleBtn.setAttribute('aria-pressed', 'false');
        return;
      }
      updateAdminVoiceToggleUi();
      voiceToggleBtn.addEventListener('click', () => toggleAdminVoiceRecognition());
    }

    initTheme();
    initAdminVoice();

    // --- Auth ---
    function isAuthed() {
      try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch { return false; }
    }
    function setAuthed(v) {
      try {
        if (v) sessionStorage.setItem(AUTH_KEY, '1');
        else sessionStorage.removeItem(AUTH_KEY);
      } catch {}
    }
    
    function showLogin() {
      loginOverlay.hidden = false;
      loginOverlay.style.display = 'grid'; // Forza display
      app.setAttribute('aria-hidden', 'true');
      userEl.focus();
    }
    function showApp() {
      loginOverlay.hidden = true;
      loginOverlay.style.display = 'none'; // Nascondi esplicitamente
      app.removeAttribute('aria-hidden');
    }
    function logout() {
      stopAdminVoiceRecognition({ silent: true });
      setAuthed(false);
      showLogin();
      try { if (typeof window.RoulotteStore?.setAuthToken === 'function') window.RoulotteStore.setAuthToken(''); } catch {}
      try { sessionStorage.removeItem('admin_jwt_token'); } catch {}
      try { if (adminWs) adminWs.close(); } catch {}
      adminWs = null;
      loginForm.reset();
      loginError.hidden = true;
    }

    function isLocalHost() {
      return (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    }
    function isFileProtocol() {
      try { return location && location.protocol === 'file:'; } catch { return false; }
    }

    const API_BASE_STORAGE_KEY = 'roulotte_api_base_url';
    const DEFAULT_REMOTE_API_BASE_URL = 'https://roulotte.online';

    function normalizeApiBaseUrl(input) {
      const s = String(input || '').trim();
      if (!s) return '';
      try {
        const u = new URL(s);
        u.pathname = '';
        u.search = '';
        u.hash = '';
        return u.toString().replace(/\/+$/, '');
      } catch {
        return s.replace(/\/+$/, '');
      }
    }

    function setApiBaseUrlOverride(baseUrl) {
      const v = normalizeApiBaseUrl(baseUrl);
      try {
        if (!v) localStorage.removeItem(API_BASE_STORAGE_KEY);
        else localStorage.setItem(API_BASE_STORAGE_KEY, v);
      } catch {}
      return v;
    }

    function getApiBaseUrlOverride() {
      try {
        const p = new URLSearchParams(location.search || '');
        const qp = String(p.get('api') || p.get('api_base') || '').trim();
        if (qp) return setApiBaseUrlOverride(qp);
      } catch {}
      try {
        const v = String(localStorage.getItem(API_BASE_STORAGE_KEY) || '').trim();
        return normalizeApiBaseUrl(v);
      } catch {
        return '';
      }
    }

    function getApiBaseUrl() {
      if (isLocalHost()) {
        const override = getApiBaseUrlOverride();
        if (override) return override;
        const port = String(location.port || '');
        const devServerPorts = new Set(['4173', '5173']);
        if (devServerPorts.has(port)) return `${location.protocol}//${location.hostname}:3001`;
        return '';
      }
      const override = getApiBaseUrlOverride();
      if (override) return override;
      if (location && location.protocol === 'file:') return DEFAULT_REMOTE_API_BASE_URL;
      return '';
    }

    function apiUrl(path) {
      return getApiBaseUrl() + String(path || '');
    }

    function getWsBaseUrl() {
      if (isLocalHost()) {
        const override = getApiBaseUrlOverride();
        if (override) {
          try {
            const u = new URL(override);
            const proto = u.protocol === 'https:' ? 'wss' : 'ws';
            return proto + '//' + u.host;
          } catch {}
        }
        const port = String(location.port || '');
        const devServerPorts = new Set(['4173', '5173']);
        if (devServerPorts.has(port)) return `ws://${location.hostname}:3001`;
        const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
        return proto + '://' + location.host;
      }
      const apiBase = getApiBaseUrl();
      try {
        const u = new URL(apiBase);
        const proto = u.protocol === 'https:' ? 'wss' : 'ws';
        return proto + '//' + u.host;
      } catch {}
      const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
      return proto + '://' + location.host;
    }

    function getApiBaseLabel() {
      const b = getApiBaseUrl();
      if (b) return b;
      try { return window.location.origin + ' (stessa origine)'; } catch { return '(stessa origine)'; }
    }

    function updateLoginDiagnostics() {
      if (loginApiBaseEl) loginApiBaseEl.textContent = getApiBaseLabel();
      if (loginWsBaseEl) loginWsBaseEl.textContent = getWsBaseUrl();

      const hasOverride = !!getApiBaseUrlOverride() || (location && location.protocol === 'file:');
      if (clearApiOverrideBtn) clearApiOverrideBtn.style.display = hasOverride ? '' : 'none';
      const hasApi = !!getApiBaseUrl();
      if (location && location.protocol === 'file:' && !hasApi) updateOfflineUiState(true);
    }

    async function checkLoginApiHealth(timeoutMs = 1500, attemptedFallback = false) {
      if (!loginApiHealthEl) return;
      updateLoginDiagnostics();
      loginApiHealthEl.textContent = 'Verifica…';
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = ctrl ? setTimeout(() => ctrl.abort(), Math.max(300, Number(timeoutMs) || 0)) : null;
      try {
        const r = await fetch(apiUrl('/api/health'), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: ctrl ? ctrl.signal : undefined
        });
        if (!r.ok) {
          if (!attemptedFallback && !getApiBaseUrlOverride() && !isLocalHost() && !isFileProtocol()) {
            const j = await r.json().catch(() => null);
            if (j && typeof j === 'object' && j.error === 'DB_UNAVAILABLE') {
              setApiBaseUrlOverride('https://roulotte-api.onrender.com');
              updateLoginDiagnostics();
              return await checkLoginApiHealth(timeoutMs, true);
            }
          }
          loginApiHealthEl.textContent = 'Errore (' + r.status + ')';
          return;
        }
        const j = await r.json().catch(() => null);
        if (!attemptedFallback && !getApiBaseUrlOverride() && !isLocalHost() && !isFileProtocol()) {
          if (j && typeof j === 'object' && j.error === 'DB_UNAVAILABLE') {
            setApiBaseUrlOverride('https://roulotte-api.onrender.com');
            updateLoginDiagnostics();
            return await checkLoginApiHealth(timeoutMs, true);
          }
        }
        if (j && typeof j === 'object' && j.ok === true) { loginApiHealthEl.textContent = 'Online'; updateOfflineUiState(false); }
        else { loginApiHealthEl.textContent = 'Online (DB KO)'; updateOfflineUiState(false); }
      } catch {
        loginApiHealthEl.textContent = 'Offline';
        updateOfflineUiState(true);
      } finally {
        if (t) clearTimeout(t);
      }
    }

    if (clearApiOverrideBtn) {
      clearApiOverrideBtn.addEventListener('click', async () => {
        setApiBaseUrlOverride('');
        updateLoginDiagnostics();
        await checkLoginApiHealth(1500);
      });
    }
    const apiOverrideInput = document.getElementById('apiOverrideInput');
    const saveApiOverrideBtn = document.getElementById('saveApiOverrideBtn');
    if (saveApiOverrideBtn && apiOverrideInput) {
      saveApiOverrideBtn.addEventListener('click', async () => {
        setApiBaseUrlOverride(apiOverrideInput.value);
        updateLoginDiagnostics();
        await checkLoginApiHealth(1500);
      });
    }
    const unlockOfflineBtn = document.getElementById('unlockOfflineBtn');
    if (unlockOfflineBtn) {
      unlockOfflineBtn.addEventListener('click', () => {
        try { window.RoulotteStore.unlockAdminOffline(); } catch {}
        loginError.hidden = true;
      });
    }

    function getInitialRoute() {
      let section = '';
      let page = '';
      try {
        const p = new URLSearchParams(location.search || '');
        section = String(p.get('section') || '').trim();
        page = String(p.get('page') || '').trim();
      } catch {}
      const okSections = new Set(['dashboard', 'new', 'list', 'detail', 'categories', 'settings', 'content', 'live']);
      const okPages = new Set(['home', 'header', 'footer', 'list_top', 'list_bottom', 'filters', 'detail_dialog', 'card_template']);
      return {
        section: okSections.has(section) ? (section === 'builder' ? 'live' : section) : '',
        page: okPages.has(page) ? page : ''
      };
    }

    async function applyInitialRoute() {
      const r = getInitialRoute();
      if (!r.section) return;
      switchSection(r.section);
      // Se era richiesto 'builder', reindirizza a 'live'
      if (r.section === 'live' && r.page && builderPageKey) builderPageKey.value = r.page;
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const username = userEl.value;
        const password = passEl.value;

        const loginUrl = apiUrl('/api/auth/login');
        
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
          let errCode = '';
          try {
            const errJson = await response.json().catch(() => ({}));
            errCode = String(errJson && errJson.error || '');
          } catch {}
          if (isLocalHost() || isFileProtocol()) {
            const resLocal = window.RoulotteStore.checkLogin(username, password);
            if (resLocal.success) {
              setAuthed(true);
              showApp();
              refreshAll();
              await applyInitialRoute();
              if (!getInitialRoute().section) switchSection('dashboard');
              return;
            }
          }
          loginError.hidden = false;
          if (response.status === 401) {
            loginError.textContent = 'Credenziali non valide.';
          } else if (response.status === 429 || errCode === 'TOO_MANY_ATTEMPTS') {
            loginError.textContent = 'Troppi tentativi. Attendi qualche minuto e riprova.';
          } else if (response.status === 500 && errCode === 'JWT_NOT_CONFIGURED') {
            loginError.textContent = 'Server non configurato: manca JWT_SECRET per generare i token.';
          } else if (response.status === 503 && errCode === 'DB_UNAVAILABLE') {
            loginError.textContent = 'Database non disponibile. Riprova più tardi.';
          } else {
            loginError.textContent = 'Credenziali non valide o server non configurato.';
          }
          passEl.value = '';
          passEl.focus();
          return;
        }
        const data = await response.json();
        if (data && data.token) {
          window.RoulotteStore.setAuthToken(data.token);
          try { sessionStorage.setItem('admin_jwt_token', String(data.token)); } catch {}
          setAuthed(true);
          showApp();
          refreshAll();
          await applyInitialRoute();
          if (!getInitialRoute().section) switchSection('dashboard');
        } else {
          loginError.hidden = false;
          loginError.textContent = 'Errore di autenticazione.';
        }
      } catch {
        if (isLocalHost() || isFileProtocol()) {
          const resLocal = window.RoulotteStore.checkLogin(userEl.value, passEl.value);
          if (resLocal.success) {
            setAuthed(true);
            showApp();
            refreshAll();
            await applyInitialRoute();
            if (!getInitialRoute().section) switchSection('dashboard');
            return;
          }
        }
        if (!isLocalHost()) {
          try {
            const username = userEl.value;
            const password = passEl.value;
            const fallbackBase = setApiBaseUrlOverride(DEFAULT_REMOTE_API_BASE_URL);
            const loginUrl2 = fallbackBase + '/api/auth/login';
            const r2 = await fetch(loginUrl2, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            if (r2.ok) {
              const data = await r2.json().catch(() => ({}));
              if (data && data.token) {
                window.RoulotteStore.setAuthToken(data.token);
                try { sessionStorage.setItem('admin_jwt_token', String(data.token)); } catch {}
                setAuthed(true);
                showApp();
                refreshAll();
                await applyInitialRoute();
                if (!getInitialRoute().section) switchSection('dashboard');
                return;
              }
            }
          } catch {}
        }
        loginError.hidden = false;
        loginError.textContent = 'Errore di rete o server non raggiungibile. Controlla la voce "API" sopra e, se serve, premi "Ripristina API".';
      }
    });

    updateLoginDiagnostics();
    checkLoginApiHealth(1500);
    (async function autoDetectLocalBackend(){
      try {
        if (!getApiBaseUrl()) {
          const r = await fetch('http://localhost:3001/api/health', { method: 'GET' }).catch(() => null);
          if (r && r.ok) {
            setApiBaseUrlOverride('http://localhost:3001');
            updateLoginDiagnostics();
            await checkLoginApiHealth(1500);
          } else {
            updateOfflineUiState(true);
          }
        }
      } catch {}
    })();
    setInterval(() => { checkLoginApiHealth(1500); }, 60000);
    // Login con Google
    (async function initGoogleLogin(){
      try {
        const cfg = await fetch(apiUrl('/api/config')).then(r => r.json()).catch(() => ({}));
        const cid = String(cfg && cfg.google_client_id || '');
        if (!cid) { console.warn('Google Client ID non trovato in /api/config'); return; }
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) { console.warn('Google Library non caricata'); return; }
        const googleWrap = document.createElement('div');
        googleWrap.style.marginTop = '10px';
        const googleBtn = document.createElement('div');
        googleWrap.appendChild(googleBtn);
        loginForm.parentElement.appendChild(googleWrap);
        google.accounts.id.initialize({
          client_id: cid,
          callback: async (response) => {
            try {
              const r = await fetch(apiUrl('/api/auth/google'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: response.credential })
              });
              if (!r.ok) {
                const errJson = await r.json().catch(() => ({}));
                loginError.hidden = false;
                if (r.status === 403 && errJson.error === 'FORBIDDEN_EMAIL') {
                  loginError.textContent = 'Email Google non autorizzata.';
                } else {
                  loginError.textContent = 'Login Google non riuscito.';
                }
                return;
              }
              const data = await r.json();
              if (data && data.token) {
                window.RoulotteStore.setAuthToken(data.token);
                setAuthed(true);
                showApp();
                refreshAll();
                await applyInitialRoute();
                if (!getInitialRoute().section) switchSection('dashboard');
              } else {
                loginError.hidden = false;
                loginError.textContent = 'Login Google non riuscito.';
              }
            } catch {
              loginError.hidden = false;
              loginError.textContent = 'Errore login Google.';
            }
          }
        });
        google.accounts.id.renderButton(googleBtn, { theme: 'outline', size: 'large' });
      } catch {}
    })();

    // Mostra l'origine corrente per aiutare il debug di Google Auth
    setTimeout(() => {
       console.log('Origin corrente:', window.location.origin);
       const debugOrigin = document.createElement('div');
       debugOrigin.style.padding = '10px';
       debugOrigin.style.background = '#fff3cd';
       debugOrigin.style.color = '#856404';
       debugOrigin.style.border = '1px solid #ffeeba';
       debugOrigin.style.margin = '10px 0';
       debugOrigin.style.borderRadius = '4px';
       debugOrigin.style.fontSize = '14px';
       debugOrigin.innerHTML = `<strong>Configurazione Google:</strong> Assicurati che l'URL <code>${window.location.origin}</code> sia aggiunto in "Origini JavaScript autorizzate" nella Google Cloud Console. <br><small>Se vedi "Accesso bloccato: errore di autorizzazione", copia questo URL e aggiungilo.</small>`;
       const loginContainer = document.querySelector('.login-container');
       if(loginContainer && !window.RoulotteStore.getAuthToken()) {
         loginContainer.appendChild(debugOrigin);
       }
    }, 1000);

    const recoveryForm = document.getElementById('recoveryForm');
    const toggleRecoveryBtn = document.getElementById('toggleRecoveryBtn');
    const recoveryMsg = document.getElementById('recoveryMsg');
    if (toggleRecoveryBtn) {
      toggleRecoveryBtn.addEventListener('click', async () => {
        const token = window.RoulotteStore.getAuthToken();
        try {
          const r = await fetch(apiUrl('/api/auth/setup'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
          });
          recoveryMsg.hidden = false;
          recoveryMsg.textContent = r.ok ? 'Credenziali iniziali impostate: admin/admin' : 'Setup non disponibile';
        } catch {
          recoveryMsg.hidden = false;
          recoveryMsg.textContent = 'Setup non disponibile';
        }
      });
    }
    if (recoveryForm) {
      recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('resetCode').value.trim();
        const nu = document.getElementById('newUser').value.trim();
        const np = document.getElementById('newPass').value;
        if (!code || !nu || !np) {
          recoveryMsg.hidden = false;
          recoveryMsg.textContent = 'Inserisci codice e nuove credenziali.';
          return;
        }
        try {
          const r = await fetch(apiUrl('/api/auth/reset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Reset': code },
            body: JSON.stringify({ username: nu, password: np })
          });
          if (r.ok) {
            recoveryMsg.hidden = false;
            recoveryMsg.textContent = 'Credenziali aggiornate. Accedi ora.';
          } else {
            recoveryMsg.hidden = false;
            recoveryMsg.textContent = 'Codice non valido o errore server.';
          }
        } catch {
          recoveryMsg.hidden = false;
          recoveryMsg.textContent = 'Errore di rete.';
        }
      });
    }

    // --- Navigazione ---
    function switchSection(sectionId) {
      const sections = Array.from(document.querySelectorAll('.section'));
      for (const s of sections) {
        s.classList.remove('active');
        s.hidden = true;
        s.style.display = 'none';
      }

      const el = document.getElementById(sectionId);
      if (el) {
        el.classList.add('active');
        el.hidden = false;
        el.style.display = 'block';
      }

      try {
        const main = document.querySelector('.main');
        if (main) main.scrollTop = 0;
      } catch {}
      
      navButtons.forEach(b => b.removeAttribute('aria-current'));
      const activeBtn = navButtons.find(b => b.dataset.section === sectionId);
      if (activeBtn) activeBtn.setAttribute('aria-current', 'page');

      const titleMap = { 
        dashboard: 'Dashboard', 
        new: 'Nuova Roulotte', 
        list: 'Elenco', 
        detail: 'Dettaglio',
        categories: 'Gestione Categorie',
        settings: 'Impostazioni',
        content: 'Gestione Contenuti',
        live: 'Editor Live',
        help: 'Guida'
      };
      pageTitle.textContent = titleMap[sectionId] || 'Admin';
      
      if (sectionId === 'new') marcaEl.focus();
      if (sectionId === 'list') listQ.focus();
      // Editor visivo disattivato: manteniamo solo Editor Live
      if (sectionId === 'settings') {
        try { ensureCentralSettingsPanel(); } catch {}
      }
      if (sectionId === 'live') {
        try { ensureLiveEditor(); } catch {}
      }
      if (sectionId === 'media') {
        try { loadMedia(); } catch {}
      }
    }
    navButtons.forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));
    refreshBtn.addEventListener('click', () => refreshAll());
    logoutBtn.addEventListener('click', logout);
    logoutBtnMobile.addEventListener('click', logout);
    const helpTopBtn = document.getElementById('helpTopBtn');
    if (helpTopBtn) helpTopBtn.addEventListener('click', () => switchSection('help'));
    const openSiteBtn = document.getElementById('openSiteBtn');
    if (openSiteBtn) openSiteBtn.addEventListener('click', () => {
      try { window.open('index.html', '_blank'); } catch {}
    });
    const deployNowBtn = document.getElementById('deployNowBtn');
    if (deployNowBtn) deployNowBtn.addEventListener('click', async () => {
      try {
        deployNowBtn.disabled = true;
        try { showToast('info', 'Deploy', 'Avvio aggiornamento online…', { timeoutMs: 1400 }); } catch {}
        const token = window.RoulotteStore.getAuthToken();
        const r = await fetch(apiUrl('/api/deploy/trigger'), { method: 'POST', headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
        if (r.ok) { try { showToast('success', 'Deploy', 'Aggiornamento avviato.', { timeoutMs: 2000 }); } catch {} }
        else {
          let msg = 'Configurazione deploy mancante';
          try {
            const j = await r.json();
            if (j && j.error === 'RENDER_CONFIG') msg = 'Configura Deploy Hook oppure API key + Service ID in Impostazioni.';
            else msg = 'Errore aggiornamento online: ' + (j && j.detail ? String(j.detail).slice(0, 200) : r.status);
          } catch {}
          try { showToast('error', 'Deploy', msg, { timeoutMs: 2800 }); } catch {}
        }
      } catch {
        try { showToast('error', 'Deploy', 'Errore di rete durante l’aggiornamento.', { timeoutMs: 2200 }); } catch {}
      } finally {
        deployNowBtn.disabled = false;
      }
    });
    Array.from(document.querySelectorAll('[data-help-target]')).forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const t = String(el.dataset.helpTarget || '');
        switchSection('help');
        setTimeout(() => {
          const target = document.getElementById(t);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      });
    });
    Array.from(document.querySelectorAll('[data-section-target]')).forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const s = String(el.dataset.sectionTarget || '');
        if (s) switchSection(s);
      });
    });

    let contentSaveTimer = null;

    // --- Content Elements (Moved up to fix TDZ Error) ---
    const contentKeyEl = document.getElementById('contentKey');
    const contentTypeEl = document.getElementById('contentType');
    const contentDataEl = document.getElementById('contentData');
    const contentPreviewEl = document.getElementById('contentPreview');
    const publishContentBtn = document.getElementById('publishContentBtn');
    const contentStatusEl = document.getElementById('contentStatus');
    const loadContentBtn = document.getElementById('loadContentBtn');
    const quillWrap = document.getElementById('quillWrap');
    let quill = null;
    const mediaUploadBtn = document.getElementById('mediaUploadBtn');
    const mediaUploadInput = document.getElementById('mediaUploadInput');
    const mediaGrid = document.getElementById('mediaGrid');
    const mediaSearch = document.getElementById('mediaSearch');
    let mediaItems = [];

    function escapeHtmlText(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function sanitizeHtmlForPreview(html) {
      const raw = String(html || '');
      if (!raw) return '';
      try {
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        const root = doc.body || doc;
        root.querySelectorAll('script,iframe,object,embed,link,meta,base,form,input,textarea,select,option').forEach(n => n.remove());
        root.querySelectorAll('*').forEach((el) => {
          const attrs = Array.from(el.attributes || []);
          attrs.forEach((a) => {
            const name = String(a && a.name || '').toLowerCase();
            const value = String(a && a.value || '');
            if (!name) return;
            if (name.startsWith('on')) { el.removeAttribute(a.name); return; }
            if (name === 'src' || name === 'href' || name === 'xlink:href') {
              const v = value.trim().toLowerCase();
              if (v.startsWith('javascript:') || v.startsWith('data:text/html') || v.startsWith('data:application/xhtml') || v.startsWith('vbscript:')) {
                el.removeAttribute(a.name);
                return;
              }
              if (name === 'href' && v.startsWith('data:')) {
                el.removeAttribute(a.name);
                return;
              }
              if (name === 'src' && v.startsWith('data:') && !v.startsWith('data:image/')) {
                el.removeAttribute(a.name);
                return;
              }
            }
          });
        });
        return root.innerHTML || '';
      } catch {
        return escapeHtmlText(raw);
      }
    }

    function renderContentPreview() {
      const t = String(contentTypeEl?.value || 'html');
      const d = String(contentDataEl?.value || '');
      if (!contentPreviewEl) return;
      if (t === 'markdown') {
        let html = escapeHtmlText(d);
        html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/^\- (.*)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        contentPreviewEl.innerHTML = html;
      } else {
        contentPreviewEl.innerHTML = sanitizeHtmlForPreview(d);
      }
    }

    async function loadMedia() {
      try {
        const token = window.RoulotteStore.getAuthToken();
        if (mediaGrid) mediaGrid.innerHTML = '<div class="hint">Caricamento…</div>';
        const r = await fetch(apiUrl('/api/media'), { headers: { 'Authorization': 'Bearer ' + token } });
        if (r.status === 401) { mediaItems = []; if (mediaGrid) mediaGrid.innerHTML = '<div class="hint">Sessione scaduta. Accedi di nuovo.</div>'; logout(); return; }
        const j = await r.json().catch(()=>[]);
        mediaItems = Array.isArray(j) ? j : [];
        renderMediaGrid();
      } catch {
        mediaItems = [];
        if (mediaGrid) mediaGrid.innerHTML = '<div class="hint">Errore durante il caricamento.</div>';
      }
    }
    function renderMediaGrid() {
      if (!mediaGrid) return;
      const q = String(mediaSearch?.value || '').trim().toLowerCase();
      const db = window.RoulotteStore.getDB();
      const cats = db.categories || [];
      const byId = new Map(cats.map(c => [c.id, c.name]));
      mediaGrid.innerHTML = '';
      const frag = document.createDocumentFragment();
      const visible = mediaItems.filter(it => {
        if (!q) return true;
        const t = (it.title || '') + ' ' + (it.alt || '');
        return t.toLowerCase().includes(q);
      });
      if (!visible.length) {
        mediaGrid.innerHTML = '<div class="hint">Nessun media trovato.</div>';
        return;
      }
      visible.forEach((it) => {
        const card = document.createElement('div');
        card.className = 'media-item';
        const img = document.createElement('img');
        img.className = 'media-thumb';
        img.loading = 'lazy';
        img.src = String(it.url_thumb || it.url_full || '');
        img.alt = String(it.title || 'Media');
        img.onerror = () => {
          const altSrc = String(it.url_full || '');
          if (altSrc && img.src !== altSrc) { img.src = altSrc; return; }
          try { img.removeAttribute('src'); } catch {}
          img.alt = 'Immagine non disponibile';
          img.style.background = 'linear-gradient(45deg, #eee, #ddd)';
          img.style.display = 'block';
          img.style.height = '160px';
        };
        const body = document.createElement('div');
        body.className = 'media-body';
        const row = document.createElement('div');
        row.className = 'media-row';
        const title = document.createElement('div');
        title.className = 'media-title';
        title.textContent = String(it.title || 'Senza titolo');
        const actions = document.createElement('div');
        actions.className = 'media-actions';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.textContent = 'Copia URL';
        copyBtn.addEventListener('click', () => {
          try { navigator.clipboard.writeText(String(it.url_full || '')); showToast('success','Copia','URL copiato'); } catch {}
        });
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Elimina';
        delBtn.addEventListener('click', async () => {
          if (!confirm('Eliminare elemento?')) return;
          const token = window.RoulotteStore.getAuthToken();
          const r = await fetch(apiUrl('/api/media/' + encodeURIComponent(it.id)), { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
          if (r.ok) { showToast('success','Media','Eliminato'); mediaItems = mediaItems.filter(x => x.id !== it.id); renderMediaGrid(); }
          else { showToast('error','Media','Eliminazione fallita'); }
        });
        actions.appendChild(copyBtn);
        actions.appendChild(delBtn);
        row.appendChild(title);
        row.appendChild(actions);
        body.appendChild(row);
        const hint = document.createElement('div');
        hint.className = 'media-hint';
        hint.textContent = String(it.alt || '');
        body.appendChild(hint);
        const editRow = document.createElement('div');
        editRow.className = 'media-row';
        const input = document.createElement('input');
        input.placeholder = 'Modello/Etichetta';
        input.value = String(it.title || '');
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn';
        saveBtn.textContent = 'Salva';
        saveBtn.addEventListener('click', async () => {
          const token = window.RoulotteStore.getAuthToken();
          const r = await fetch(apiUrl('/api/media/' + encodeURIComponent(it.id)), {
            method: 'PATCH',
            headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
            body: JSON.stringify({ title: String(input.value || '') })
          });
          if (r.ok) { showToast('success','Media','Aggiornato'); it.title = String(input.value || ''); renderMediaGrid(); }
          else { showToast('error','Media','Salvataggio fallito'); }
        });
        editRow.appendChild(input);
        editRow.appendChild(saveBtn);
        body.appendChild(editRow);
        card.appendChild(img);
        card.appendChild(body);
        frag.appendChild(card);
      });
      mediaGrid.appendChild(frag);
    }
    if (mediaSearch) mediaSearch.addEventListener('input', () => { renderMediaGrid(); });
    if (mediaUploadBtn && mediaUploadInput) {
      mediaUploadBtn.addEventListener('click', () => mediaUploadInput.click());
      mediaUploadInput.addEventListener('change', async () => {
        try {
          const files = Array.from(mediaUploadInput.files || []);
          if (!files.length) return;
          const fd = new FormData();
          files.forEach((f) => fd.append('files', f, f.name));
          const token = window.RoulotteStore.getAuthToken();
          const r = await fetch(apiUrl('/api/media'), { method:'POST', headers:{ 'Authorization':'Bearer ' + token }, body: fd });
          const j = await r.json().catch(()=>null);
          if (!r.ok) { showToast('error','Media','Upload fallito'); return; }
          const added = Array.isArray(j) ? j : [];
          added.forEach((x) => {
            const exists = mediaItems.find(m => m.id === x.id);
            if (!exists) mediaItems.unshift(x);
          });
          renderMediaGrid();
          showToast('success','Media','Immagini caricate');
          mediaUploadInput.value = '';
        } catch (e) {
          showToast('error','Media', String(e && e.message ? e.message : e));
        }
      });
    }
    let adminWhoami = { user: '', role: '' };

    function setAdminUsersMsg(text, ok) {
      if (!adminUsersMsg) return;
      const t = String(text || '').trim();
      if (!t) { adminUsersMsg.hidden = true; adminUsersMsg.textContent = ''; return; }
      adminUsersMsg.hidden = false;
      adminUsersMsg.className = ok ? 'error ok' : 'error';
      adminUsersMsg.textContent = t;
    }

    function setAdminUsersLockedState(locked, text) {
      if (adminUsersLocked) {
        adminUsersLocked.hidden = !locked;
        if (typeof text === 'string' && text.trim()) adminUsersLocked.textContent = text;
      }
      const disabled = !!locked;
      try {
        if (adminNewUsername) adminNewUsername.disabled = disabled;
        if (adminNewPassword) adminNewPassword.disabled = disabled;
        const submitBtn = adminUsersCreateForm ? adminUsersCreateForm.querySelector('button[type="submit"]') : null;
        if (submitBtn) submitBtn.disabled = disabled;
      } catch {}
    }

    function setAdminResetUserMsg(text, ok) {
      if (!adminResetUserMsg) return;
      const t = String(text || '').trim();
      if (!t) { adminResetUserMsg.hidden = true; adminResetUserMsg.textContent = ''; return; }
      adminResetUserMsg.hidden = false;
      adminResetUserMsg.className = ok ? 'error ok' : 'error';
      adminResetUserMsg.textContent = t;
    }

    async function fetchWhoami() {
      const token = window.RoulotteStore.getAuthToken();
      if (!token) return { user: '', role: '' };
      const r = await fetch(apiUrl('/api/admin/whoami'), { headers: { 'Authorization': 'Bearer ' + token } });
      if (r.status === 401) { logout(); return { user: '', role: '' }; }
      if (!r.ok) return { user: '', role: '' };
      const j = await r.json().catch(() => ({}));
      return { user: String(j && j.user || ''), role: String(j && j.role || '') };
    }

    function renderAdminUsersList(users) {
      if (!adminUsersList) return;
      const arr = Array.isArray(users) ? users : [];
      if (!arr.length) {
        adminUsersList.innerHTML = '<div class="hint">Nessun utente presente.</div>';
        return;
      }
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
      adminUsersList.innerHTML = `
        <div style="display:grid;gap:10px">
          ${arr.map(u => `
            <div class="card" style="padding:12px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
                <div>
                  <div style="font-weight:900">${esc(u.username)}</div>
                  <div class="hint" style="margin-top:4px">Creato: ${u.created_at ? esc(new Date(u.created_at).toLocaleString()) : '—'} · Aggiornato: ${u.updated_at ? esc(new Date(u.updated_at).toLocaleString()) : '—'}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <input type="password" data-user-pass="${esc(u.username)}" placeholder="Nuova password" style="min-width:220px" />
                  <button class="btn" type="button" data-user-action="setpass" data-user="${esc(u.username)}">Cambia password</button>
                  <button class="btn btn-danger" type="button" data-user-action="delete" data-user="${esc(u.username)}">Elimina</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    async function loadAdminUsers() {
      if (!adminUsersCard) return;
      const token = window.RoulotteStore.getAuthToken();
      if (!token) { adminUsersCard.hidden = true; return; }
      setAdminUsersMsg('', true);
      try {
        const r = await fetch(apiUrl('/api/admin/users'), { headers: { 'Authorization': 'Bearer ' + token } });
        if (r.status === 401) { logout(); return; }
        if (r.status === 403) {
          setAdminUsersLockedState(true, 'Non hai i permessi per gestire l’elenco utenti (ruolo Superuser richiesto).');
          if (adminUsersList) adminUsersList.innerHTML = '';
          return;
        }
        if (!r.ok) { setAdminUsersMsg('Impossibile caricare gli utenti.', false); return; }
        const arr = await r.json().catch(() => []);
        renderAdminUsersList(arr);
      } catch {
        setAdminUsersMsg('Errore di rete durante il caricamento utenti.', false);
      }
    }

    async function ensureAdminUsersPanel() {
      if (!adminUsersCard) return;
      const token = window.RoulotteStore.getAuthToken();
      if (!token) { adminUsersCard.hidden = true; return; }
      adminUsersCard.hidden = false;
      try { setAdminUsersMsg('', true); } catch {}

      try {
        adminWhoami = await fetchWhoami();
      } catch {
        adminWhoami = { user: '', role: '' };
      }

      const role = String(adminWhoami && adminWhoami.role || '').trim();
      const user = String(adminWhoami && adminWhoami.user || '').trim();
      const labelRole = role || 'admin';
      if (adminUsersRole) adminUsersRole.textContent = `Accesso: ${user || '—'} · Ruolo: ${labelRole}`;

      const isSuper = labelRole === 'superuser';
      if (!isSuper) {
        setAdminUsersLockedState(true, 'Non hai i permessi per gestire l’elenco utenti (ruolo Superuser richiesto).');
        if (adminUsersList) adminUsersList.innerHTML = '';
        return;
      }
      setAdminUsersLockedState(false, '');
      await loadAdminUsers();
    }
    async function saveContentDraft() {
      const key = String(contentKeyEl?.value || '').trim();
      const type = String(contentTypeEl?.value || 'html');
      const data = String(contentDataEl?.value || '');
      if (!key || !data) return;
      try {
        const token = window.RoulotteStore.getAuthToken();
        await fetch(apiUrl('/api/content'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' },
          body: JSON.stringify({ content_key: key, content_type: type, data })
        });
        if (contentStatusEl) contentStatusEl.textContent = 'Bozza salvata';
      } catch {
        if (contentStatusEl) contentStatusEl.textContent = 'Errore salvataggio';
      }
    }
    function scheduleContentSave() {
      if (contentSaveTimer) clearTimeout(contentSaveTimer);
      contentSaveTimer = setTimeout(saveContentDraft, 600);
      if (contentStatusEl) contentStatusEl.textContent = 'Modifiche non salvate';
      renderContentPreview();
    }
    if (contentKeyEl && contentTypeEl && contentDataEl) {
      contentKeyEl.addEventListener('input', scheduleContentSave);
      contentTypeEl.addEventListener('change', scheduleContentSave);
      contentDataEl.addEventListener('input', scheduleContentSave);
    }
    if (publishContentBtn) {
      publishContentBtn.addEventListener('click', async () => {
        const key = String(contentKeyEl?.value || '').trim();
        if (!key) return;
        try {
          const token = window.RoulotteStore.getAuthToken();
          await fetch(apiUrl('/api/content/' + encodeURIComponent(key) + '/publish'), {
            method: 'POST',
            headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
          });
          if (contentStatusEl) contentStatusEl.textContent = 'Pubblicato';
        } catch {
          if (contentStatusEl) contentStatusEl.textContent = 'Errore pubblicazione';
        }
      });
    }
    async function loadContent() {
      const key = String(contentKeyEl?.value || '').trim();
      if (!key) return;
      try {
        const r = await fetch(apiUrl('/api/content/' + encodeURIComponent(key)));
        if (!r.ok) return;
        const j = await r.json();
        const t = String(j && j.content_type || 'html');
        const d = String(j && (j.data || j.published_data) || '');
        if (contentTypeEl) contentTypeEl.value = t || 'html';
        if (contentDataEl) contentDataEl.value = d || '';
        renderContentPreview();
        initQuillIfNeeded();
        if (contentStatusEl) contentStatusEl.textContent = 'Caricato';
      } catch {}
    }
    if (loadContentBtn) loadContentBtn.addEventListener('click', loadContent);
    function initQuillIfNeeded() {
      const mode = String(contentTypeEl?.value || 'html');
      if (mode === 'html') {
        if (!quill) {
          try {
            quillWrap.style.display = '';
            contentDataEl.style.display = 'none';
            quill = new window.Quill('#quillEditor', { theme: 'snow', modules: { toolbar: '#quillToolbar' } });
            const html = String(contentDataEl.value || '');
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            quill.setContents(quill.clipboard.convert(tmp.innerHTML));
            quill.on('text-change', () => {
              const htmlOut = quill.root.innerHTML;
              contentDataEl.value = htmlOut;
              scheduleContentSave();
            });
          } catch {}
        }
      } else {
        if (quill) {
          try { quill.off('text-change'); } catch {}
          quill = null;
        }
        if (quillWrap) quillWrap.style.display = 'none';
        contentDataEl.style.display = '';
      }
    }
    initQuillIfNeeded();
    if (contentTypeEl) contentTypeEl.addEventListener('change', initQuillIfNeeded);

    async function builderLoad() {
      const page = String((builderPageKey && builderPageKey.value) ? builderPageKey.value : 'home');
      setBuilderStatusBase('Caricamento…');

      async function safeFetchContent(key) {
        try {
          const token = window.RoulotteStore.getAuthToken();
          const headers = { 'Accept': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const r = await fetch(apiUrl('/api/content/' + encodeURIComponent(key)), { headers });
          if (!r.ok) return { ok: false, status: r.status, data: '' };
          const j = await r.json().catch(() => null);
          const data = String((j && (j.data || j.published_data)) || '');
          return { ok: true, status: r.status, data };
        } catch {
          return { ok: false, status: 0, data: '' };
        }
      }

      const htmlKey = 'page_' + page + '_fragment';
      const cssKey = 'page_' + page + '_styles';

      const [htmlRes, cssRes] = await Promise.all([
        safeFetchContent(htmlKey),
        safeFetchContent(cssKey),
      ]);

      let html = String(htmlRes.data || '');
      let css = String(cssRes.data || '');
      let fallbackUsed = false;

      if (!html.trim()) {
        try {
          const raw = await fetch('index.html').then(x => x.text());
          const dom = new DOMParser().parseFromString(raw, 'text/html');
          let source = null;
          if (page === 'home') source = dom.querySelector('.hero');
          else if (page === 'header') source = dom.querySelector('header');
          else if (page === 'footer') source = dom.querySelector('footer');
          else if (page === 'list_top') source = null;
          else if (page === 'list_bottom') source = null;
          else if (page === 'filters') source = dom.querySelector('#editableFilters') || dom.querySelector('.controls');
          else if (page === 'detail_dialog') source = dom.querySelector('#detailDialog') || dom.querySelector('dialog');
          else if (page === 'card_template') source = null;

          if (page === 'card_template') {
            html = [
              '<article class="card">',
              '  <div class="card-media"><img data-slot="photo" alt="{{title}}"></div>',
              '  <div class="card-body">',
              '    <div class="card-title">{{title}}</div>',
              '    <div class="card-sub">',
              '      <span class="tag">Anno {{year}}</span>',
              '      <span class="tag">{{status}}</span>',
              '      <span class="tag">{{category}}</span>',
              '    </div>',
              '    <div class="card-actions">',
              '      <div class="price">{{price}}</div>',
              '      <button class="btn" type="button" data-action="details">Dettagli</button>',
              '    </div>',
              '  </div>',
              '</article>'
            ].join('\n');
          } else {
            html = source ? source.outerHTML : '<section class="container"><h2>Nuova sezione</h2><p>Modifica contenuti qui.</p></section>';
          }
          const styleTags = Array.from(dom.querySelectorAll('style'));
          css = styleTags.map(s => s.textContent || '').join('\n');
          fallbackUsed = true;
        } catch {}
      }

      try {
        builderLoading = true;
        if (gjsEditor) {
          gjsEditor.setComponents(html || '');
          gjsEditor.setStyle(css || '');
        }
        setBuilderStatusBase(fallbackUsed ? 'Caricato (fallback)' : 'Caricato');
        setBuilderDirty(false);
        showToast(fallbackUsed ? 'warning' : 'success', 'Editor caricato', fallbackUsed ? 'Caricati contenuti di fallback dal file locale.' : 'Contenuti caricati dal server.', { timeoutMs: 2600 });
      } catch {
        setBuilderStatusBase('Errore caricamento');
        showToast('error', 'Errore caricamento', 'Impossibile caricare i contenuti nell’editor.');
      } finally {
        builderLoading = false;
      }
    }
    async function builderSave(opts) {
      const o = opts && typeof opts === 'object' ? opts : {};
      const silent = o.silent === true;
      if (!gjsEditor) return false;
      const page = String(builderPageKey?.value || 'home');
      const token = window.RoulotteStore.getAuthToken();
      const html = gjsEditor.getHtml();
      const css = gjsEditor.getCss();
      setBuilderStatusBase('Salvataggio…');
      if (!silent) showToast('info', 'Salvataggio bozza', `Salvataggio in corso (${page})…`, { timeoutMs: 1400 });
      try {
        const r1 = await fetch(apiUrl('/api/content'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' }, body: JSON.stringify({ content_key: 'page_' + page + '_fragment', content_type: 'html', data: String(html || '') }) });
        if (!r1.ok) {
          if (r1.status === 401) { setBuilderStatusBase('Sessione scaduta. Accedi di nuovo.'); logout(); return false; }
          setBuilderStatusBase('Errore salvataggio');
          if (!silent) showToast('error', 'Errore salvataggio', 'Impossibile salvare la bozza.');
          return false;
        }
        const r2 = await fetch(apiUrl('/api/content'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' }, body: JSON.stringify({ content_key: 'page_' + page + '_styles', content_type: 'html', data: String(css || '') }) });
        if (!r2.ok) {
          if (r2.status === 401) { setBuilderStatusBase('Sessione scaduta. Accedi di nuovo.'); logout(); return false; }
          setBuilderStatusBase('Errore salvataggio');
          if (!silent) showToast('error', 'Errore salvataggio', 'Impossibile salvare gli stili della bozza.');
          return false;
        }
        setBuilderStatusBase('Bozza salvata');
        setBuilderDirty(false);
        if (!silent) showToast('success', 'Bozza salvata', `Bozza salvata per ${page}.`, { timeoutMs: 2600 });
        return true;
      } catch {
        setBuilderStatusBase('Errore salvataggio');
        if (!silent) showToast('error', 'Errore salvataggio', 'Errore di rete o server durante il salvataggio.');
        return false;
      }
    }
    async function builderPublish() {
      const page = String(builderPageKey?.value || 'home');
      setBuilderStatusBase('Pubblicazione…');
      showToast('info', 'Pubblicazione', `Pubblicazione in corso (${page})…`, { timeoutMs: 1600 });
      try {
        const token = window.RoulotteStore.getAuthToken();
        const r1 = await fetch(apiUrl('/api/content/page_' + page + '_fragment/publish'), { method: 'POST', headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
        if (!r1.ok) {
          if (r1.status === 401) { setBuilderStatusBase('Sessione scaduta. Accedi di nuovo.'); logout(); return; }
          setBuilderStatusBase('Errore pubblicazione');
          showToast('error', 'Errore pubblicazione', 'Impossibile pubblicare il contenuto.');
          return;
        }
        const r2 = await fetch(apiUrl('/api/content/page_' + page + '_styles/publish'), { method: 'POST', headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
        if (!r2.ok) {
          if (r2.status === 401) { setBuilderStatusBase('Sessione scaduta. Accedi di nuovo.'); logout(); return; }
          setBuilderStatusBase('Errore pubblicazione');
          showToast('error', 'Errore pubblicazione', 'Impossibile pubblicare gli stili.');
          return;
        }
        setBuilderStatusBase('Pubblicato');
        setBuilderDirty(false);
        showToast('success', 'Pubblicato', `Pubblicazione completata (${page}).`, { timeoutMs: 3000 });
      } catch {
        setBuilderStatusBase('Errore pubblicazione');
        showToast('error', 'Errore pubblicazione', 'Errore di rete o server durante la pubblicazione.');
      }
    }
    if (builderLoadBtn) builderLoadBtn.addEventListener('click', builderLoad);
    if (builderSaveBtn) builderSaveBtn.addEventListener('click', builderSave);
    if (builderPublishBtn) builderPublishBtn.addEventListener('click', builderPublish);
    if (builderPageKey) builderPageKey.addEventListener('change', builderLoad);
    if (builderUndoBtn) builderUndoBtn.addEventListener('click', () => { try { if (gjsEditor) gjsEditor.runCommand('core:undo'); } catch {} });
    if (builderRedoBtn) builderRedoBtn.addEventListener('click', () => { try { if (gjsEditor) gjsEditor.runCommand('core:redo'); } catch {} });
    async function openBuilderPreview() {
      if (!builderPreviewDialog || !builderPreviewFrame) return;
      if (!gjsEditor) return;
      const ok = await builderSave({ silent: true });
      if (!ok) {
        showToast('error', 'Anteprima', 'Impossibile salvare la bozza per l’anteprima.', { timeoutMs: 2600 });
        return;
      }
      const page = String(builderPageKey?.value || 'home');
      builderPreviewFrame.src = 'index.html?preview=1&page=' + encodeURIComponent(page) + '&ts=' + Date.now();
      try {
        if (typeof builderPreviewDialog.showModal === 'function') builderPreviewDialog.showModal();
        else builderPreviewDialog.setAttribute('open', 'open');
      } catch {}
    }
    function closeBuilderPreview() {
      if (!builderPreviewDialog) return;
      try {
        if (typeof builderPreviewDialog.close === 'function') builderPreviewDialog.close();
        else builderPreviewDialog.removeAttribute('open');
      } catch {}
      try { if (builderPreviewFrame) builderPreviewFrame.src = 'about:blank'; } catch {}
    }
    function reloadBuilderPreview() {
      if (!builderPreviewFrame) return;
      const page = String(builderPageKey?.value || 'home');
      builderPreviewFrame.src = 'index.html?preview=1&page=' + encodeURIComponent(page) + '&ts=' + Date.now();
    }
    if (builderPreviewBtn) builderPreviewBtn.addEventListener('click', openBuilderPreview);
    if (builderPreviewCloseBtn) builderPreviewCloseBtn.addEventListener('click', closeBuilderPreview);
    if (builderPreviewReloadBtn) builderPreviewReloadBtn.addEventListener('click', reloadBuilderPreview);
    if (builderPreviewDialog) builderPreviewDialog.addEventListener('close', () => { try { if (builderPreviewFrame) builderPreviewFrame.src = 'about:blank'; } catch {} });

    let liveEditing = false;
    let liveDirtyKeys = new Set();

    function setLiveStatus(text) { if (liveStatusEl) liveStatusEl.textContent = String(text || ''); }
    function setLiveDirty(isDirty) {
      const d = !!isDirty || (liveDirtyKeys.size > 0);
      if (liveSaveBtn) liveSaveBtn.disabled = !d;
      if (livePublishBtn) livePublishBtn.disabled = !d;
      setLiveStatus(d ? 'Modifiche non salvate' : (liveEditing ? 'Modifica attiva' : 'Inattivo'));
    }
    function ensureLiveEditor() {
      if (!liveFrame) return;
      if (!liveFrame.src) {
        liveFrame.src = 'index.html?preview=1&ts=' + Date.now();
        liveFrame.addEventListener('load', () => {
          try {
            if (liveEditing) toggleLiveEditing(true);
            wireLiveIframe();
          } catch {}
        }, { once: true });
      } else {
        try { wireLiveIframe(); } catch {}
      }
    }
    function getEditableNodes(doc) {
      if (!doc) return [];
      const sel = '[data-i18n]';
      return Array.from(doc.querySelectorAll(sel));
    }
    function toggleLiveEditing(enable) {
      liveEditing = !!enable;
      if (!liveFrame || !liveFrame.contentDocument) return;
      const doc = liveFrame.contentDocument;
      const root = doc.documentElement;
      injectLiveStyles(doc);
      if (root) {
        if (liveEditing) root.classList.add('live-editing');
        else root.classList.remove('live-editing');
      }
      const nodes = getEditableNodes(doc);
      nodes.forEach(el => {
        el.contentEditable = liveEditing ? 'true' : 'false';
        el.spellcheck = true;
        el.setAttribute('tabindex','0');
        if (liveEditing && el.tagName === 'A') { el.addEventListener('click', preventNavOnce, { once: true }); }
        if (liveEditing) {
          el.addEventListener('input', onLiveInput);
          el.addEventListener('blur', onLiveInput);
        }
      });
      setLiveDirty(false);
    }
    function preventNavOnce(e) { try { e.preventDefault(); } catch {} }
    function onLiveInput(e) {
      try {
        const el = e.target;
        const key = String(el.getAttribute('data-i18n') || '').trim();
        if (key) liveDirtyKeys.add(key);
        setLiveDirty(true);
      } catch {}
    }
    function injectLiveStyles(doc) {
      try {
        const head = doc.head || doc.documentElement;
        if (!head) return;
        if (doc.getElementById('liveEditorStyles')) return;
        const st = doc.createElement('style');
        st.id = 'liveEditorStyles';
        st.textContent = `
          .live-editing [data-i18n],
          .live-editing h1,.live-editing h2,.live-editing p,.live-editing .hint,.live-editing label,.live-editing a.btn{
            outline:2px dashed rgba(37,99,235,.45);
            outline-offset:2px;
            cursor:text;
          }
          .live-editing a[href]{pointer-events:none}
          .live-editing [data-i18n]{position:relative}
          .live-editing [data-i18n]::after{
            content: attr(data-i18n);
            position:absolute;
            right:4px; top:-8px;
            background:rgba(37,99,235,.12);
            border:1px solid rgba(37,99,235,.35);
            color:#2563eb;
            font-size:.68rem;
            padding:2px 6px;
            border-radius:999px;
          }
        `;
        head.appendChild(st);
      } catch {}
    }
    function wireLiveIframe() {
      if (!liveFrame || !liveFrame.contentDocument) return;
      const doc = liveFrame.contentDocument;
      doc.addEventListener('click', onLiveClick);
    }
    function onLiveClick(e) {
      if (!liveEditing) return;
      const el = e && e.target ? e.target.closest('[data-i18n]') : null;
      const keyEl = document.getElementById('liveKeyLabel');
      const txtEl = document.getElementById('livePropText');
      const applyBtn = document.getElementById('liveApplyBtn');
      const panelStatus = document.getElementById('livePanelStatus');
      if (!el) {
        if (keyEl) keyEl.value = '';
        if (txtEl) { txtEl.value = ''; txtEl.disabled = true; }
        if (applyBtn) applyBtn.disabled = true;
        if (panelStatus) panelStatus.textContent = 'Nessuna selezione';
        return;
      }
      const key = String(el.getAttribute('data-i18n') || '').trim();
      const txt = String(el.textContent || '').trim();
      if (keyEl) keyEl.value = key || '';
      if (txtEl) { txtEl.value = txt || ''; txtEl.disabled = false; }
      if (applyBtn) applyBtn.disabled = false;
      if (panelStatus) panelStatus.textContent = 'Elemento selezionato';
    }
    const livePropTextEl = document.getElementById('livePropText');
    const liveApplyBtn = document.getElementById('liveApplyBtn');
    if (livePropTextEl) livePropTextEl.addEventListener('input', () => {
      try {
        if (!liveFrame || !liveFrame.contentDocument) return;
        const doc = liveFrame.contentDocument;
        const key = String((document.getElementById('liveKeyLabel')?.value) || '').trim();
        if (!key) return;
        const el = doc.querySelector('[data-i18n="'+CSS.escape(key)+'"]');
        if (!el) return;
        const v = String(livePropTextEl.value || '');
        el.textContent = v;
        liveDirtyKeys.add(key);
        setLiveDirty(true);
      } catch {}
    });
    if (liveApplyBtn) liveApplyBtn.addEventListener('click', () => {
      try { setLiveStatus('Modifiche applicate'); } catch {}
    });
    async function liveSave() {
      const token = window.RoulotteStore.getAuthToken();
      if (!token) { logout(); return; }
      if (!liveFrame || !liveFrame.contentDocument) return;
      const doc = liveFrame.contentDocument;
      const nodes = getEditableNodes(doc);
      const changed = new Map();
      nodes.forEach(el => {
        const key = String(el.getAttribute('data-i18n') || '').trim();
        if (!key) return;
        if (!liveDirtyKeys.has(key)) return;
        changed.set(key, String(el.innerHTML || '').trim());
      });
      if (!changed.size) { setLiveDirty(false); try { showToast('info','Editor Live','Nessuna modifica.',{timeoutMs:1600}); } catch {} return; }
      try {
        for (const [key,data] of changed.entries()) {
          const r = await fetch(apiUrl('/api/content'), {
            method: 'POST',
            headers: { 'Content-Type':'application/json','Authorization':'Bearer '+token },
            body: JSON.stringify({ content_key: key, content_type: 'html', data })
          });
          if (r.status === 401) { logout(); return; }
          if (!r.ok) { try { showToast('error','Editor Live','Errore salvataggio '+key,{timeoutMs:2200}); } catch {} }
        }
        try { showToast('success','Editor Live','Bozza salvata',{timeoutMs:1600}); } catch {}
        setLiveDirty(false);
      } catch {
        try { showToast('error','Editor Live','Errore di rete',{timeoutMs:2200}); } catch {}
      }
    }
    async function livePublish() {
      const token = window.RoulotteStore.getAuthToken();
      if (!token) { logout(); return; }
      const keys = Array.from(liveDirtyKeys);
      if (!keys.length) { try { showToast('info','Editor Live','Nessuna modifica da pubblicare',{timeoutMs:1600}); } catch {} return; }
      try {
        for (const key of keys) {
          const r = await fetch(apiUrl('/api/content/'+encodeURIComponent(key)+'/publish'), {
            method: 'POST',
            headers: { 'Authorization':'Bearer '+token }
          });
          if (r.status === 401) { logout(); return; }
          if (!r.ok) { try { showToast('error','Editor Live','Errore pubblicazione '+key,{timeoutMs:2200}); } catch {} }
        }
        try { showToast('success','Editor Live','Pubblicato',{timeoutMs:1600}); } catch {}
        liveDirtyKeys.clear();
        setLiveDirty(false);
        ensureLiveEditor();
      } catch {
        try { showToast('error','Editor Live','Errore di rete',{timeoutMs:2200}); } catch {}
      }
    }
    if (liveEnableBtn) liveEnableBtn.addEventListener('click', async () => {
      if (!liveFrame) return;
      if (!liveFrame.src) ensureLiveEditor();
      if (!liveFrame.contentDocument) {
        liveFrame.addEventListener('load', () => toggleLiveEditing(true), { once: true });
        setLiveStatus('Caricamento…');
        return;
      }
      toggleLiveEditing(!liveEditing);
      try { showToast(liveEditing ? 'success':'info','Editor Live', liveEditing ? 'Modifica attiva' : 'Modifica disattivata', { timeoutMs: 1400 }); } catch {}
    });
    if (liveReloadBtn) liveReloadBtn.addEventListener('click', () => {
      ensureLiveEditor();
      if (liveEditing) setLiveStatus('Modifica attiva');
    });
    if (liveSaveBtn) liveSaveBtn.addEventListener('click', liveSave);
    if (livePublishBtn) livePublishBtn.addEventListener('click', livePublish);

    const mediaInput = document.getElementById('mediaInput');
    const mediaRefreshBtn = document.getElementById('mediaRefreshBtn');
    const mediaProg = document.getElementById('mediaProg');
    try {
      if (mediaInput) { mediaInput.setAttribute('accept','image/jpeg,image/png,image/webp'); mediaInput.setAttribute('multiple',''); }
      const pi = document.getElementById('photosInput');
      if (pi) { pi.setAttribute('accept','image/jpeg,image/png,image/webp'); pi.setAttribute('multiple',''); }
    } catch {}
    async function loadMedia() {
      if (!mediaGrid) return;
      try {
        const token = window.RoulotteStore.getAuthToken();
        const r = await fetch(apiUrl('/api/media'), { headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
        if (r.status === 401) { mediaGrid.innerHTML = '<div class="hint">Sessione scaduta. Accedi di nuovo.</div>'; logout(); return; }
        if (!r.ok) { mediaGrid.innerHTML = '<div class="hint">Impossibile caricare media.</div>'; return; }
        const arr = await r.json();
        mediaGrid.innerHTML = '';
        if (!Array.isArray(arr) || arr.length === 0) { mediaGrid.innerHTML = '<div class="hint">Nessun media presente.</div>'; return; }
        arr.forEach(m => {
          const card = document.createElement('div');
          card.className = 'card';
          const img = document.createElement('img');
          img.src = m.url_thumb;
          img.alt = m.title || 'Media';
          img.style.width = '100%';
          img.style.height = '160px';
          img.style.objectFit = 'cover';
          const actions = document.createElement('div');
          actions.className = 'card-actions';
          const use = document.createElement('button');
          use.className = 'btn';
          use.textContent = 'Usa in scheda';
          use.onclick = async () => {
            try {
              const res = await fetch(m.url_full || m.url_thumb);
              const blob = await res.blob();
              if (!String(blob.type || '').startsWith('image/')) return;
              const obj = await processImageFromBlob(blob);
              if (!obj.file) {
                const ext = obj.type === 'image/webp' ? 'webp' : 'jpg';
                obj.name = 'photo_' + Date.now() + '.' + ext;
                const f = dataURLToFile(obj.name, obj.src);
                if (f) obj.file = f;
              }
              obj.alt = m.alt || '';
              draftPhotos.push(obj);
              renderPhotos();
              switchSection('new');
            } catch {}
          };
          const del = document.createElement('button');
          del.className = 'btn btn-danger';
          del.textContent = 'Elimina';
          del.onclick = async () => {
            try {
              const token2 = window.RoulotteStore.getAuthToken();
              const rr = await fetch(apiUrl('/api/media/' + m.id), { method: 'DELETE', headers: { 'Authorization': token2 ? ('Bearer ' + token2) : '' } });
              if (rr.ok) loadMedia();
            } catch {}
          };
          actions.appendChild(use);
          actions.appendChild(del);
          card.appendChild(img);
          card.appendChild(actions);
          mediaGrid.appendChild(card);
        });
      } catch {
        mediaGrid.innerHTML = '<div class="hint">Errore durante il caricamento media.</div>';
      }
    }
    async function uploadMedia(files) {
      if (!files || files.length === 0) return;
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f, f.name));
      const token = window.RoulotteStore.getAuthToken();
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl('/api/media'));
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.onprogress = function(e){ if (mediaProg && e && e.lengthComputable) { mediaProg.style.display=''; mediaProg.value = Math.round((e.loaded/e.total)*100); } };
        xhr.onreadystatechange = function(){
          if (xhr.readyState===4){
            if (mediaProg){ mediaProg.style.display='none'; mediaProg.value=0; }
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); } catch { resolve([]); }
              loadMedia();
            } else {
              let msg = 'Errore caricamento immagini.';
              try { const j = JSON.parse(xhr.responseText); if (j && j.error) msg = String(j.error); } catch {}
              if (xhr.status === 401) { msg = 'Sessione scaduta. Accedi di nuovo.'; logout(); }
              if (mediaGrid) mediaGrid.innerHTML = '<div class="hint">'+msg+'</div>';
              resolve([]);
            }
          }
        };
        xhr.onerror = function(){ if (mediaProg){ mediaProg.style.display='none'; mediaProg.value=0; } resolve([]); };
        xhr.send(fd);
      });
    }
    if (mediaRefreshBtn) mediaRefreshBtn.addEventListener('click', loadMedia);
    if (mediaInput) {
      try { mediaInput.setAttribute('accept','image/jpeg,image/png,image/webp'); mediaInput.setAttribute('multiple',''); mediaInput.setAttribute('capture','environment'); } catch {}
      mediaInput.addEventListener('change', (e) => uploadMedia(e.target.files));
    }

    // --- Dashboard & Log ---
    function refreshStats() {
      const db = window.RoulotteStore.getDB();
      const list = db.roulottes || [];
      const cats = db.categories || [];

      // Calcolo Totali
      const soldItems = list.filter(r => r.stato === 'Venduto');
      const availableItems = list.filter(r => r.stato !== 'Venduto');

      if (siteStatsUpdatedAtEl) {
        siteStatsUpdatedAtEl.textContent = db.updatedAt ? new Date(db.updatedAt).toLocaleString() : '—';
      }
      if (siteStatsTotalEl) siteStatsTotalEl.textContent = String(list.length);
      if (siteStatsResultsEl) siteStatsResultsEl.textContent = String(availableItems.length);
      
      statAvailable.textContent = String(availableItems.length);
      statSold.textContent = `${soldItems.length} veicoli`;
      const soldValue = soldItems.reduce((acc, r) => acc + (Number(r.prezzo) || 0), 0);
      statSoldValue.textContent = formatPrice(soldValue);
      
      const totalValue = availableItems.reduce((acc, r) => acc + (Number(r.prezzo) || 0), 0);
      statValue.textContent = formatPrice(totalValue);
      const prices = availableItems.map(r => Number(r.prezzo) || 0).filter(n => Number.isFinite(n));
      const avg = prices.length ? (prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      if (statAvgPriceEl) statAvgPriceEl.textContent = formatPrice(avg);
      if (statMinMaxEl) statMinMaxEl.textContent = `min ${formatPrice(min)} · max ${formatPrice(max)}`;
      const published = list.filter(r => String(r.stato_annuncio || '').toLowerCase() === 'pubblicato').length;
      const drafts = list.filter(r => String(r.stato_annuncio || '').toLowerCase() === 'bozza').length;
      if (statPublishedEl) statPublishedEl.textContent = String(published);
      if (statDraftsEl) statDraftsEl.textContent = `bozze: ${drafts}`;
      const noPhotos = availableItems.filter(r => !Array.isArray(r.photos) || r.photos.length === 0).length;
      if (statNoPhotosEl) statNoPhotosEl.textContent = String(noPhotos);
      
      // Calcolo Categorie
      catStats.innerHTML = '';
      if(cats.length === 0) {
        catStats.innerHTML = '<div class="hint">Nessuna categoria definita.</div>';
      } else {
        cats.forEach(c => {
          const availableCount = availableItems.filter(r => r.categoryId === c.id).length;
          const soldCount = soldItems.filter(r => r.categoryId === c.id).length;
          const div = document.createElement('div');
          div.className = 'card';
          div.style.padding = '12px';
          div.style.cursor = 'pointer';
          div.onclick = () => {
             listQ.value = '';
             listCategory.value = c.id;
             listStato.value = '';
             renderList();
             switchSection('list');
          };
          div.innerHTML = `
             <div class="label" style="font-size:0.8rem">${c.name}</div>
             <div class="value" style="font-size:1.2rem">${availableCount}</div>
             <div class="sub-value">Vendute: ${soldCount}</div>
          `;
          catStats.appendChild(div);
        });
      }

      // Render Logs
      const logs = db.logs || [];
      activityLog.innerHTML = logs.length 
        ? logs.map(l => `<div class="log-item">[${new Date(l.timestamp).toLocaleTimeString()}] <strong>${l.user}:</strong> ${l.action}</div>`).join('')
        : '<div class="hint">Nessuna attività recente.</div>';
    }

    // --- Categorie ---
    function renderCategories() {
      const db = window.RoulotteStore.getDB();
      const cats = db.categories || [];
      const items = db.roulottes || [];
      const soldItems = items.filter(r => r.stato === 'Venduto');
      const availableItems = items.filter(r => r.stato !== 'Venduto');
      
      // Select nel form Nuova
      const currentSel = categoryIdEl.value;
      categoryIdEl.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        categoryIdEl.appendChild(opt);
      });
      if(currentSel) categoryIdEl.value = currentSel;

      if (listCategory) {
        const currentListSel = listCategory.value;
        listCategory.innerHTML = '<option value="">Tutte</option>';
        cats.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          listCategory.appendChild(opt);
        });
        if (currentListSel) listCategory.value = currentListSel;
      }

      if (categoriesGrid) {
        categoriesGrid.innerHTML = '';
        if (cats.length === 0) {
          categoriesGrid.innerHTML = '<div class="hint">Nessuna categoria creata.</div>';
        } else {
          cats.forEach(c => {
            const availableCount = availableItems.filter(r => r.categoryId === c.id).length;
            const soldCount = soldItems.filter(r => r.categoryId === c.id).length;
            const div = document.createElement('div');
            div.className = 'card';
            div.style.padding = '12px';
            div.style.cursor = 'pointer';
            div.onclick = () => {
              listQ.value = '';
              listCategory.value = c.id;
              listStato.value = '';
              renderList();
              switchSection('list');
            };
            div.innerHTML = `
              <div class="label" style="font-size:0.8rem">${c.name}</div>
              <div class="value" style="font-size:1.2rem">${availableCount}</div>
              <div class="sub-value">Vendute: ${soldCount}</div>
            `;
            categoriesGrid.appendChild(div);
          });
        }
      }

      // Lista gestione
      catList.innerHTML = '';
      if(cats.length === 0) {
        catList.innerHTML = '<div class="hint">Nessuna categoria creata.</div>';
        return;
      }
      cats.forEach(c => {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.innerHTML = `
          <span style="font-weight:800">${c.name}</span>
          <div class="tree-actions">
            <button class="btn btn-danger" style="padding:4px 8px;font-size:0.8rem" onclick="deleteCat('${c.id}')">Elimina</button>
          </div>
        `;
        catList.appendChild(div);
      });
    }

    window.deleteCat = function(id) {
       if(confirm('Eliminare questa categoria?')) {
         window.RoulotteStore.deleteCategory(id);
         refreshAll();
       }
    };

    addCatBtn.addEventListener('click', () => {
      const name = newCatName.value.trim();
      if(name) {
        window.RoulotteStore.addCategory(name);
        newCatName.value = '';
        refreshAll();
      }
    });

    // --- Generazione Automatica Descrizione ---
    window.generateDescription = function() {
      let statusEl = document.getElementById('descStatus');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'descStatus';
        statusEl.style.fontSize = '.85rem';
        statusEl.style.color = 'var(--muted)';
        statusEl.style.margin = '6px 0';
        editor.parentElement.insertBefore(statusEl, editor);
      }
      statusEl.textContent = 'Generazione descrizione in corso…';
      try {
      const parts = [];
      const marca = marcaEl.value.trim();
      const modello = modelloEl.value.trim();
      const anno = annoEl.value.trim();
      const versione = versioneEl.value.trim();
      const tipologiaMezzo = tipologiaMezzoEl.value;

      const title = [marca, modello].filter(Boolean).join(' ');
      if (title) parts.push(`<b>${title}</b>${versione ? ` ${versione}` : ''}${anno ? ` del ${anno}` : ''}.`);

      const db = window.RoulotteStore.getDB();
      const cats = db.categories || [];
      const categoryName = cats.find(c => c.id === categoryIdEl.value)?.name || '';

      const meta = [];
      if (statoEl.value) meta.push(`<b>Stato:</b> ${statoEl.value}`);
      if (categoryName) meta.push(`<b>Categoria:</b> ${categoryName}`);
      if (tipologiaMezzo) meta.push(`<b>Tipologia:</b> ${tipologiaMezzo}`);
      if (prontaConsegnaEl.checked) meta.push(`<b>Disponibilità:</b> Pronta consegna`);
      const permuta = getRadioValue('permuta');
      if (permuta) meta.push(`<b>Permuta:</b> ${permuta}`);
      if (meta.length) parts.push(`<p>${meta.join(' • ')}</p>`);

      const tech = [];
      const lunghezzaTot = Number(lunghezzaEl.value);
      const lunghezzaInt = Number(lunghezzaInternaEl.value);
      const larghezza = Number(larghezzaEl.value);
      const altezza = Number(altezzaEl.value);
      const postiLetto = Number(postiEl.value);
      const massa = Number(massaEl.value);
      const pesoVuoto = Number(pesoVuotoEl.value);
      if (Number.isFinite(lunghezzaTot) && lunghezzaTot > 0) tech.push(`Lunghezza totale: ${lunghezzaTot} m`);
      if (Number.isFinite(lunghezzaInt) && lunghezzaInt > 0) tech.push(`Lunghezza interna: ${lunghezzaInt} m`);
      if (Number.isFinite(larghezza) && larghezza > 0) tech.push(`Larghezza: ${larghezza} m`);
      if (Number.isFinite(altezza) && altezza > 0) tech.push(`Altezza: ${altezza} m`);
      if (Number.isFinite(postiLetto) && postiLetto > 0) tech.push(`Posti letto: ${postiLetto}`);
      if (Number.isFinite(massa) && massa > 0) tech.push(`Massa complessiva: ${massa} kg`);
      if (Number.isFinite(pesoVuoto) && pesoVuoto > 0) tech.push(`Peso a vuoto: ${pesoVuoto} kg`);

      if (tech.length > 0) parts.push("<ul class=\"spec-list\">" + tech.map(t => `<li>${t}</li>`).join('') + "</ul>");
      if (documentiEl.value) parts.push(`<p><b>Documenti:</b> ${documentiEl.value}.</p>`);
      if (targataEl.value) parts.push(`<p><b>Targata:</b> ${targataEl.value}.</p>`);
      if (librettoCircolazioneEl.value) parts.push(`<p><b>Libretto:</b> ${librettoCircolazioneEl.value}.</p>`);
      if (omologataCircolazioneEl.value) parts.push(`<p><b>Omologata circolazione:</b> ${omologataCircolazioneEl.value}.</p>`);
      if (numeroAssiEl.value) parts.push(`<p><b>Assi:</b> ${numeroAssiEl.value}.</p>`);
      if (timoneEl.value) parts.push(`<p><b>Timone:</b> ${timoneEl.value}.</p>`);
      if (frenoRepulsioneEl.value) parts.push(`<p><b>Freno a repulsione:</b> ${frenoRepulsioneEl.value}.</p>`);

      const letto = [];
      const disposizioneLetti = getCheckedValues('disposizioneLetti');
      if (disposizioneLetti.length) letto.push(`Disposizione letti: ${disposizioneLetti.join(', ')}`);
      if (lettoFissoEl.value) letto.push(`Letto fisso: ${lettoFissoEl.value}`);
      const idealePer = getCheckedValues('idealePer');
      if (idealePer.length) letto.push(`Ideale per: ${idealePer.join(', ')}`);
      if (letto.length) parts.push("<ul class=\"spec-list\">" + letto.map(t => `<li>${t}</li>`).join('') + "</ul>");

      const interna = [];
      if (tipologiaEl.value) interna.push(`Tipologia interna: ${tipologiaEl.value}`);
      if (tipoDinetteEl.value) interna.push(`Dinette: ${tipoDinetteEl.value}`);
      if (cucinaEl.value) interna.push(`Cucina: ${cucinaEl.value}`);
      if (bagnoEl.value) interna.push(`Bagno: ${bagnoEl.value}`);
      if (docciaSeparataEl.value) interna.push(`Doccia separata: ${docciaSeparataEl.value}`);
      if (armadiEl.value) interna.push(`Armadi: ${armadiEl.value}`);
      if (gavoniInterniEl.value) interna.push(`Gavoni interni: ${gavoniInterniEl.value}`);
      if (interna.length) parts.push("<ul class=\"spec-list\">" + interna.map(t => `<li>${t}</li>`).join('') + "</ul>");

      const statoMezzo = [];
      if (condizioneGeneraleEl.value) statoMezzo.push(`Condizione: ${condizioneGeneraleEl.value}`);
      if (statoInterniEl.value) statoMezzo.push(`Stato interni: ${statoInterniEl.value}`);
      if (statoEsterniEl.value) statoMezzo.push(`Stato esterni: ${statoEsterniEl.value}`);
      if (infiltrazioniEl.value) statoMezzo.push(`Infiltrazioni: ${infiltrazioniEl.value}`);
      if (odoriEl.value) statoMezzo.push(`Odori/muffe: ${odoriEl.value}`);
      if (provenienzaEl.value) statoMezzo.push(`Provenienza: ${provenienzaEl.value}`);
      if (statoMezzo.length) parts.push("<ul class=\"spec-list\">" + statoMezzo.map(t => `<li>${t}</li>`).join('') + "</ul>");

      const impianti = [];
      if (presa220EsternaEl.value) impianti.push(`Presa 220V esterna: ${presa220EsternaEl.value}`);
      if (impianto12VEl.value) impianti.push(`Impianto 12V: ${impianto12VEl.value}`);
      if (batteriaServiziEl.value) impianti.push(`Batteria servizi: ${batteriaServiziEl.value}`);
      if (illuminazioneLedEl.value) impianti.push(`Illuminazione LED: ${illuminazioneLedEl.value}`);
      if (impiantoGasEl.value) impianti.push(`Impianto gas: ${impiantoGasEl.value}`);
      if (numeroBomboleEl.value) impianti.push(`Bombole: ${numeroBomboleEl.value}`);
      if (scadenzaImpiantoGasEl.value) impianti.push(`Scadenza impianto gas: ${scadenzaImpiantoGasEl.value}`);
      if (serbatoioAcquaPulitaEl.value) impianti.push(`Serbatoio acqua pulita: ${serbatoioAcquaPulitaEl.value}`);
      if (serbatoioAcqueGrigieEl.value) impianti.push(`Serbatoio acque grigie: ${serbatoioAcqueGrigieEl.value}`);
      if (riscaldamentoEl.value) impianti.push(`Riscaldamento: ${riscaldamentoEl.value}`);
      if (tipoRiscaldamentoEl.value) impianti.push(`Tipo riscaldamento: ${tipoRiscaldamentoEl.value}`);
      if (climatizzatoreEl.value) impianti.push(`Climatizzatore: ${climatizzatoreEl.value}`);
      if (predisposizioneClimaEl.value) impianti.push(`Predisposizione clima: ${predisposizioneClimaEl.value}`);
      if (verandaTendalinoEl.value) impianti.push(`Veranda/tendalino: ${verandaTendalinoEl.value}`);
      if (portabiciEl.value) impianti.push(`Portabici: ${portabiciEl.value}`);
      if (impianti.length) parts.push("<ul class=\"spec-list\">" + impianti.map(t => `<li>${t}</li>`).join('') + "</ul>");

      const html = parts.filter(Boolean).join('<br>');
      editor.innerHTML = html;
      noteEl.value = html;
      saveDraft();
      statusEl.textContent = 'Descrizione generata';
      } catch (err) {
        statusEl.textContent = 'Errore durante la generazione della descrizione';
        try {
          const token = window.RoulotteStore.getAuthToken();
          fetch(apiUrl('/api/admin/log'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' },
            body: JSON.stringify({ action: 'DESC_GENERATION_ERROR', details: { message: String(err && err.message ? err.message : err) } })
          }).catch(() => {});
        } catch {}
      }
    };

    // Trigger auto-gen on change (opzionale, meglio manuale o al primo inserimento)
    [
      marcaEl, modelloEl, versioneEl, annoEl, statoEl, categoryIdEl, prezzoEl,
      tipologiaMezzoEl, prontaConsegnaEl,
      condizioneGeneraleEl, statoInterniEl, statoEsterniEl, infiltrazioniEl, odoriEl, provenienzaEl,
      targataEl, librettoCircolazioneEl, omologataCircolazioneEl, numeroTelaioEl, numeroAssiEl, timoneEl, frenoRepulsioneEl, pesoVuotoEl,
      lunghezzaEl, lunghezzaInternaEl, larghezzaEl, altezzaEl, postiEl, massaEl, documentiEl, tipologiaEl, lettoFissoEl,
      tipoDinetteEl, cucinaEl, bagnoEl, docciaSeparataEl, armadiEl, gavoniInterniEl,
      presa220EsternaEl, impianto12VEl, batteriaServiziEl, illuminazioneLedEl, impiantoGasEl, numeroBomboleEl, scadenzaImpiantoGasEl,
      serbatoioAcquaPulitaEl, serbatoioAcqueGrigieEl, riscaldamentoEl, tipoRiscaldamentoEl, climatizzatoreEl, predisposizioneClimaEl,
      verandaTendalinoEl, portabiciEl,
      contattoTelefonoEl, contattoWhatsappEl, contattoEmailEl, localitaEl, orariContattoEl, videoUrlEl, planimetriaUrlEl
    ].forEach(el => {
      if (!el) return;
      el.addEventListener('change', () => {
        if(!editor.innerHTML.trim()) generateDescription();
        saveDraft();
      });
    });
    document.querySelectorAll('input[type="radio"][name="permuta"]').forEach(el => {
      el.addEventListener('change', () => {
        if(!editor.innerHTML.trim()) generateDescription();
        saveDraft();
      });
    });
    document.querySelectorAll('input[type="checkbox"][name="disposizioneLetti"], input[type="checkbox"][name="idealePer"]').forEach(el => {
      el.addEventListener('change', () => {
        if(!editor.innerHTML.trim()) generateDescription();
        saveDraft();
      });
    });

    [marcaEl, modelloEl, prezzoEl, annoEl, tipologiaMezzoEl].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        setInvalidControl(el, false);
        updateNewFormChecklistUi();
      });
    });
    if (statoEl && statoAnnuncioEl) {
      statoEl.addEventListener('change', () => {
        if (String(statoEl.value || '') === 'Venduto') statoAnnuncioEl.value = 'venduto';
        else if (String(statoAnnuncioEl.value || '') === 'venduto') statoAnnuncioEl.value = 'bozza';
        updateNewFormChecklistUi();
      });
    }
    if (statoAnnuncioEl && statoEl) {
      statoAnnuncioEl.addEventListener('change', () => {
        if (String(statoAnnuncioEl.value || '') === 'venduto') statoEl.value = 'Venduto';
        updateNewFormChecklistUi();
      });
    } else if (statoAnnuncioEl) statoAnnuncioEl.addEventListener('change', updateNewFormChecklistUi);
    updateNewFormChecklistUi();
    updateNoteStats();

    function applyLastTemplate() {
      let raw = '';
      try { raw = String(localStorage.getItem('last_roulotte_template') || ''); } catch {}
      if (!raw) { showToast('warning', 'Nessun modello', 'Nessuna scheda precedente salvata.'); return; }
      let tmpl = null;
      try { tmpl = JSON.parse(raw); } catch {}
      if (!tmpl || typeof tmpl !== 'object') { showToast('warning', 'Modello non valido', 'Impossibile leggere la scheda precedente.'); return; }

      const setValIfEmpty = (el, v) => {
        if (!el) return false;
        const cur = String(el.value ?? '').trim();
        const next = String(v ?? '').trim();
        if (!next || cur) return false;
        el.value = next;
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        return true;
      };
      const setSelectIfEmpty = (el, v) => {
        if (!el) return false;
        const cur = String(el.value ?? '').trim();
        const next = String(v ?? '').trim();
        if (!next || cur) return false;
        const ok = Array.from(el.querySelectorAll('option')).some(o => String(o.value || '') === next);
        if (!ok) return false;
        el.value = next;
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        return true;
      };

      let applied = 0;
      applied += setValIfEmpty(marcaEl, tmpl.marca) ? 1 : 0;
      applied += setValIfEmpty(modelloEl, tmpl.modello) ? 1 : 0;
      applied += setValIfEmpty(versioneEl, tmpl.versione) ? 1 : 0;
      applied += setSelectIfEmpty(statoEl, tmpl.stato) ? 1 : 0;
      applied += setSelectIfEmpty(statoAnnuncioEl, tmpl.stato_annuncio) ? 1 : 0;
      applied += setSelectIfEmpty(categoryIdEl, tmpl.categoryId) ? 1 : 0;
      applied += setValIfEmpty(prezzoEl, tmpl.prezzo) ? 1 : 0;
      applied += setValIfEmpty(annoEl, tmpl.anno) ? 1 : 0;
      applied += setSelectIfEmpty(tipologiaMezzoEl, tmpl.tipologiaMezzo) ? 1 : 0;
      if (prontaConsegnaEl && tmpl.disponibilitaProntaConsegna === true && !prontaConsegnaEl.checked) { prontaConsegnaEl.checked = true; applied++; }
      if (!getRadioValue('permuta') && tmpl.permuta) { setRadioValue('permuta', tmpl.permuta); applied++; }
      applied += setSelectIfEmpty(condizioneGeneraleEl, tmpl.condizioneGenerale) ? 1 : 0;
      applied += setSelectIfEmpty(statoInterniEl, tmpl.statoInterni) ? 1 : 0;
      applied += setSelectIfEmpty(statoEsterniEl, tmpl.statoEsterni) ? 1 : 0;
      applied += setSelectIfEmpty(infiltrazioniEl, tmpl.infiltrazioni) ? 1 : 0;
      applied += setSelectIfEmpty(odoriEl, tmpl.odori) ? 1 : 0;
      applied += setSelectIfEmpty(provenienzaEl, tmpl.provenienza) ? 1 : 0;
      applied += setSelectIfEmpty(targataEl, tmpl.targata) ? 1 : 0;
      applied += setSelectIfEmpty(librettoCircolazioneEl, tmpl.librettoCircolazione) ? 1 : 0;
      applied += setSelectIfEmpty(omologataCircolazioneEl, tmpl.omologataCircolazione) ? 1 : 0;
      applied += setValIfEmpty(numeroTelaioEl, tmpl.numeroTelaio) ? 1 : 0;
      applied += setSelectIfEmpty(numeroAssiEl, tmpl.numeroAssi) ? 1 : 0;
      applied += setSelectIfEmpty(timoneEl, tmpl.timone) ? 1 : 0;
      applied += setSelectIfEmpty(frenoRepulsioneEl, tmpl.frenoRepulsione) ? 1 : 0;
      applied += setValIfEmpty(pesoVuotoEl, tmpl.pesoVuoto) ? 1 : 0;
      applied += setValIfEmpty(lunghezzaEl, tmpl.lunghezzaTotale) ? 1 : 0;
      applied += setValIfEmpty(lunghezzaInternaEl, tmpl.lunghezzaInterna) ? 1 : 0;
      applied += setValIfEmpty(larghezzaEl, tmpl.larghezza) ? 1 : 0;
      applied += setValIfEmpty(altezzaEl, tmpl.altezza) ? 1 : 0;
      applied += setValIfEmpty(postiEl, tmpl.postiLetto) ? 1 : 0;
      applied += setValIfEmpty(massaEl, tmpl.massa) ? 1 : 0;
      applied += setSelectIfEmpty(documentiEl, tmpl.documenti) ? 1 : 0;
      applied += setSelectIfEmpty(tipologiaEl, tmpl.tipologia) ? 1 : 0;
      if ((!getCheckedValues('disposizioneLetti').length) && Array.isArray(tmpl.disposizioneLetti)) { setCheckedValues('disposizioneLetti', tmpl.disposizioneLetti); applied++; }
      applied += setSelectIfEmpty(lettoFissoEl, tmpl.lettoFisso) ? 1 : 0;
      if ((!getCheckedValues('idealePer').length) && Array.isArray(tmpl.idealePer)) { setCheckedValues('idealePer', tmpl.idealePer); applied++; }
      applied += setSelectIfEmpty(tipoDinetteEl, tmpl.tipoDinette) ? 1 : 0;
      applied += setSelectIfEmpty(cucinaEl, tmpl.cucina) ? 1 : 0;
      applied += setSelectIfEmpty(bagnoEl, tmpl.bagno) ? 1 : 0;
      applied += setSelectIfEmpty(docciaSeparataEl, tmpl.docciaSeparata) ? 1 : 0;
      applied += setSelectIfEmpty(armadiEl, tmpl.armadi) ? 1 : 0;
      applied += setSelectIfEmpty(gavoniInterniEl, tmpl.gavoniInterni) ? 1 : 0;
      applied += setSelectIfEmpty(presa220EsternaEl, tmpl.presa220Esterna) ? 1 : 0;
      applied += setSelectIfEmpty(impianto12VEl, tmpl.impianto12V) ? 1 : 0;
      applied += setSelectIfEmpty(batteriaServiziEl, tmpl.batteriaServizi) ? 1 : 0;
      applied += setSelectIfEmpty(illuminazioneLedEl, tmpl.illuminazioneLed) ? 1 : 0;
      applied += setSelectIfEmpty(impiantoGasEl, tmpl.impiantoGas) ? 1 : 0;
      applied += setValIfEmpty(numeroBomboleEl, tmpl.numeroBombole) ? 1 : 0;
      applied += setValIfEmpty(scadenzaImpiantoGasEl, tmpl.scadenzaImpiantoGas) ? 1 : 0;
      applied += setSelectIfEmpty(serbatoioAcquaPulitaEl, tmpl.serbatoioAcquaPulita) ? 1 : 0;
      applied += setSelectIfEmpty(serbatoioAcqueGrigieEl, tmpl.serbatoioAcqueGrigie) ? 1 : 0;
      applied += setSelectIfEmpty(riscaldamentoEl, tmpl.riscaldamento) ? 1 : 0;
      applied += setSelectIfEmpty(tipoRiscaldamentoEl, tmpl.tipoRiscaldamento) ? 1 : 0;
      applied += setSelectIfEmpty(climatizzatoreEl, tmpl.climatizzatore) ? 1 : 0;
      applied += setSelectIfEmpty(predisposizioneClimaEl, tmpl.predisposizioneClima) ? 1 : 0;
      applied += setSelectIfEmpty(verandaTendalinoEl, tmpl.verandaTendalino) ? 1 : 0;
      applied += setSelectIfEmpty(portabiciEl, tmpl.portabici) ? 1 : 0;
      applied += setValIfEmpty(contattoTelefonoEl, tmpl.contattoTelefono) ? 1 : 0;
      applied += setValIfEmpty(contattoWhatsappEl, tmpl.contattoWhatsapp) ? 1 : 0;
      applied += setValIfEmpty(contattoEmailEl, tmpl.contattoEmail) ? 1 : 0;
      applied += setValIfEmpty(localitaEl, tmpl.localita) ? 1 : 0;
      applied += setValIfEmpty(orariContattoEl, tmpl.orariContatto) ? 1 : 0;
      applied += setValIfEmpty(videoUrlEl, tmpl.videoUrl) ? 1 : 0;
      applied += setValIfEmpty(planimetriaUrlEl, tmpl.planimetriaUrl) ? 1 : 0;

      updateNewFormChecklistUi();
      updateNoteStats();
      try { saveDraft(); } catch {}
      showToast('success', 'Modello applicato', `Copiati ${applied} campi dalla scheda precedente.`);
    }

    if (copyLastBtn) copyLastBtn.addEventListener('click', applyLastTemplate);

    function resetAiUi() {
      aiPendingSuggestions = [];
      if (aiApplyBtn) aiApplyBtn.disabled = true;
      if (aiSuggestionsEl) aiSuggestionsEl.textContent = 'Nessuna analisi eseguita.';
    }
    if (aiAnalyzeBtn) aiAnalyzeBtn.addEventListener('click', () => {
      const text = aiInput ? String(aiInput.value || '') : '';
      aiPendingSuggestions = buildAiSuggestionsFromText(text);
      renderAiSuggestions(aiPendingSuggestions);
      showToast(aiPendingSuggestions.length ? 'success' : 'warning', 'Assistente AI', aiPendingSuggestions.length ? 'Suggerimenti pronti.' : 'Nessun suggerimento trovato.');
    });
    if (aiApplyBtn) aiApplyBtn.addEventListener('click', () => {
      const n = applyAiSuggestions(aiPendingSuggestions);
      showToast(n ? 'success' : 'warning', 'Assistente AI', n ? `Applicati ${n} suggerimenti.` : 'Nessun suggerimento applicato.');
    });
    if (aiClearBtn) aiClearBtn.addEventListener('click', () => {
      if (aiInput) aiInput.value = '';
      resetAiUi();
    });

    // --- Editor WYSIWYG Semplice ---
    window.formatDoc = function(cmd, value=null) {
      document.execCommand(cmd, false, value);
      editor.focus();
      saveDraft();
    };
    
    // Sync editor -> textarea e autosave
    editor.addEventListener('input', () => {
      noteEl.value = editor.innerHTML;
      saveDraft();
      updateNoteStats();
    });
    const descAiBtn = document.getElementById('descAiBtn');
    const descModeEl = document.getElementById('descMode');
    const descAiModeEl = document.getElementById('descAiMode');
    const descUndoBtn = document.getElementById('descUndoBtn');
    const descSuggestBtn = document.getElementById('descSuggestBtn');
    let descUndoStack = [];
    let localSummarizer = null;
    async function ensureLocalSummarizer() {
      if (localSummarizer) return localSummarizer;
      const t = window.transformers;
      if (!t || !t.pipeline) return null;
      localSummarizer = await t.pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
      return localSummarizer;
    }
    if (descAiBtn) {
      descAiBtn.addEventListener('click', async () => {
        try {
          const token = window.RoulotteStore.getAuthToken();
          if (!token) { logout(); return; }
          const mode = String(descModeEl && descModeEl.value || 'rewrite');
          const plain = String(editor.innerText || '').trim();
          if (!plain) { showToast('warning', 'AI', 'Aggiungi testo prima di applicare.'); return; }
          descAiBtn.disabled = true;
          const facts = {
            marca: marcaEl?.value || '',
            modello: modelloEl?.value || '',
            versione: versioneEl?.value || '',
            anno: annoEl?.value || '',
            prezzo: prezzoEl?.value || '',
            tipologiaMezzo: tipologiaMezzoEl?.value || '',
            stato: statoEl?.value || '',
            categoryId: categoryIdEl?.value || '',
            lunghezza: lunghezzaEl?.value || '',
            lunghezzaInterna: lunghezzaInternaEl?.value || '',
            larghezza: larghezzaEl?.value || '',
            altezza: altezzaEl?.value || '',
            posti: postiEl?.value || '',
            massa: massaEl?.value || '',
            documenti: documentiEl?.value || '',
            tipologia: tipologiaEl?.value || '',
            lettoFisso: lettoFissoEl?.value || '',
            climatizzatore: climatizzatoreEl?.value || '',
            verandaTendalino: verandaTendalinoEl?.value || '',
            portabici: portabiciEl?.value || '',
            localita: localitaEl?.value || '',
          };
          let out = '';
          const useLocal = String(descAiModeEl && descAiModeEl.value || 'local') === 'local';
          if (useLocal) {
            const pipe = await ensureLocalSummarizer();
            if (!pipe) { showToast('error', 'AI', 'AI locale non disponibile.'); return; }
            const prefix = Object.entries(facts).filter(([k,v]) => String(v||'').trim()).map(([k,v]) => `${k}: ${v}`).join('; ');
            const input = prefix ? (prefix + '. ' + plain) : plain;
            const res = await pipe(input, { max_length: 180, min_length: 80, do_sample: false });
            const text = Array.isArray(res) ? String(res[0]?.summary_text || '') : String(res?.summary_text || '');
            if (mode === 'bullets') {
              const lines = text.split(/[.;]\s+/).map(s => s.trim()).filter(Boolean);
              out = '<ul class="spec-list">' + lines.map(s => '<li>' + s + '</li>').join('') + '</ul>';
            } else {
              out = text.split(/\n+/).map(s => s.trim()).filter(Boolean).join('<br>');
            }
          } else {
            const r = await fetch(apiUrl('/api/ai/text/rewrite'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ text: plain, mode, facts, lang: 'it', html: true })
            });
            if (!r.ok) {
              const t = await r.text().catch(() => '');
              showToast('error', 'AI', t || ('HTTP ' + r.status));
              return;
            }
            const j = await r.json().catch(() => null);
            out = String(j && j.text || '').trim();
          }
          if (!out) { showToast('warning', 'AI', 'Risposta vuota.'); return; }
          descUndoStack.push(editor.innerHTML);
          if (descUndoBtn) descUndoBtn.disabled = false;
          editor.innerHTML = out;
          noteEl.value = editor.innerHTML;
          saveDraft();
          showToast('success', 'AI', 'Testo aggiornato.');
        } catch (e) {
          const msg = String(e && e.message ? e.message : e);
          showToast('error', 'AI', msg);
        } finally {
          descAiBtn.disabled = false;
        }
      });
    }
    if (descUndoBtn) {
      descUndoBtn.addEventListener('click', () => {
        const last = descUndoStack.pop();
        if (!last) return;
        editor.innerHTML = last;
        noteEl.value = editor.innerHTML;
        saveDraft();
        if (descUndoStack.length === 0) descUndoBtn.disabled = true;
      });
    }
    if (descSuggestBtn) {
      descSuggestBtn.addEventListener('click', async () => {
        try {
          const token = window.RoulotteStore.getAuthToken();
          if (!token) { logout(); return; }
          const plain = String(editor.innerText || '').trim();
          if (!plain) { showToast('warning', 'AI', 'Aggiungi testo prima di suggerire.'); return; }
          descSuggestBtn.disabled = true;
          const r = await fetch(apiUrl('/api/ai/text/extract'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ text: plain })
          });
          if (!r.ok) {
            const t = await r.text().catch(() => '');
            showToast('error', 'AI', t || ('HTTP ' + r.status));
            return;
          }
          const j = await r.json().catch(() => null);
          const arr = (j && Array.isArray(j.suggestions)) ? j.suggestions : [];
          if (!arr.length) { showToast('warning', 'AI', 'Nessun suggerimento trovato.'); return; }
          const applied = applyAiSuggestions(arr);
          renderAiSuggestions(arr);
          updateNewFormChecklistUi();
          showToast(applied ? 'success' : 'info', 'AI', applied ? 'Campi aggiornati.' : 'Suggerimenti mostrati.');
        } catch (e) {
          const msg = String(e && e.message ? e.message : e);
          showToast('error', 'AI', msg);
        } finally {
          descSuggestBtn.disabled = false;
        }
      });
    }

    // --- Autosave Form (LocalStorage temporaneo) ---
    function saveDraft() {
      const draft = {
        marca: marcaEl.value,
        modello: modelloEl.value,
        versione: versioneEl.value,
        stato: statoEl.value,
        stato_annuncio: statoAnnuncioEl ? statoAnnuncioEl.value : '',
        categoryId: categoryIdEl.value,
        prezzo: prezzoEl.value,
        anno: annoEl.value,
        tipologiaMezzo: tipologiaMezzoEl.value,
        prontaConsegna: !!prontaConsegnaEl.checked,
        permuta: getRadioValue('permuta'),

        condizioneGenerale: condizioneGeneraleEl.value,
        statoInterni: statoInterniEl.value,
        statoEsterni: statoEsterniEl.value,
        infiltrazioni: infiltrazioniEl.value,
        odori: odoriEl.value,
        provenienza: provenienzaEl.value,

        targata: targataEl.value,
        librettoCircolazione: librettoCircolazioneEl.value,
        omologataCircolazione: omologataCircolazioneEl.value,
        numeroTelaio: numeroTelaioEl.value,
        numeroAssi: numeroAssiEl.value,
        timone: timoneEl.value,
        frenoRepulsione: frenoRepulsioneEl.value,
        pesoVuoto: pesoVuotoEl.value,

        lunghezzaTotale: lunghezzaEl.value,
        lunghezzaInterna: lunghezzaInternaEl.value,
        larghezza: larghezzaEl.value,
        altezza: altezzaEl.value,
        posti: postiEl.value,
        massa: massaEl.value,
        documenti: documentiEl.value,
        tipologia: tipologiaEl.value,
        disposizioneLetti: getCheckedValues('disposizioneLetti'),
        lettoFisso: lettoFissoEl.value,
        idealePer: getCheckedValues('idealePer'),

        tipoDinette: tipoDinetteEl.value,
        cucina: cucinaEl.value,
        bagno: bagnoEl.value,
        docciaSeparata: docciaSeparataEl.value,
        armadi: armadiEl.value,
        gavoniInterni: gavoniInterniEl.value,

        presa220Esterna: presa220EsternaEl.value,
        impianto12V: impianto12VEl.value,
        batteriaServizi: batteriaServiziEl.value,
        illuminazioneLed: illuminazioneLedEl.value,
        impiantoGas: impiantoGasEl.value,
        numeroBombole: numeroBomboleEl.value,
        scadenzaImpiantoGas: scadenzaImpiantoGasEl.value,
        serbatoioAcquaPulita: serbatoioAcquaPulitaEl.value,
        serbatoioAcqueGrigie: serbatoioAcqueGrigieEl.value,
        riscaldamento: riscaldamentoEl.value,
        tipoRiscaldamento: tipoRiscaldamentoEl.value,
        climatizzatore: climatizzatoreEl.value,
        predisposizioneClima: predisposizioneClimaEl.value,
        verandaTendalino: verandaTendalinoEl.value,
        portabici: portabiciEl.value,

        contattoTelefono: contattoTelefonoEl.value,
        contattoWhatsapp: contattoWhatsappEl.value,
        contattoEmail: contattoEmailEl.value,
        localita: localitaEl.value,
        orariContatto: orariContattoEl.value,
        videoUrl: videoUrlEl.value,
        planimetriaUrl: planimetriaUrlEl.value,

        note: editor.innerHTML
      };
      sessionStorage.setItem('roulotte_draft', JSON.stringify(draft));
    }

    function loadDraft() {
      const raw = sessionStorage.getItem('roulotte_draft');
      if(raw) {
        try {
          const d = JSON.parse(raw);
          if(d.marca) marcaEl.value = d.marca;
          if(d.modello) modelloEl.value = d.modello;
          if(d.versione !== undefined) versioneEl.value = d.versione ?? '';
          if(d.stato) statoEl.value = d.stato;
          if(d.stato_annuncio !== undefined && statoAnnuncioEl) statoAnnuncioEl.value = String(d.stato_annuncio ?? 'bozza');
          if(d.categoryId) categoryIdEl.value = d.categoryId;
          if(d.prezzo) prezzoEl.value = d.prezzo;
          if(d.anno) annoEl.value = d.anno;
          if(d.tipologiaMezzo !== undefined) tipologiaMezzoEl.value = d.tipologiaMezzo ?? '';
          if(d.prontaConsegna !== undefined) prontaConsegnaEl.checked = !!d.prontaConsegna;
          if(d.permuta !== undefined) setRadioValue('permuta', d.permuta ?? '');

          if(d.condizioneGenerale !== undefined) condizioneGeneraleEl.value = d.condizioneGenerale ?? '';
          if(d.statoInterni !== undefined) statoInterniEl.value = d.statoInterni ?? '';
          if(d.statoEsterni !== undefined) statoEsterniEl.value = d.statoEsterni ?? '';
          if(d.infiltrazioni !== undefined) infiltrazioniEl.value = d.infiltrazioni ?? '';
          if(d.odori !== undefined) odoriEl.value = d.odori ?? '';
          if(d.provenienza !== undefined) provenienzaEl.value = d.provenienza ?? '';

          if(d.targata !== undefined) targataEl.value = d.targata ?? '';
          if(d.librettoCircolazione !== undefined) librettoCircolazioneEl.value = d.librettoCircolazione ?? '';
          if(d.omologataCircolazione !== undefined) omologataCircolazioneEl.value = d.omologataCircolazione ?? '';
          if(d.numeroTelaio !== undefined) numeroTelaioEl.value = d.numeroTelaio ?? '';
          if(d.numeroAssi !== undefined) numeroAssiEl.value = d.numeroAssi ?? '';
          if(d.timone !== undefined) timoneEl.value = d.timone ?? '';
          if(d.frenoRepulsione !== undefined) frenoRepulsioneEl.value = d.frenoRepulsione ?? '';
          if(d.pesoVuoto !== undefined) pesoVuotoEl.value = d.pesoVuoto ?? '';

          if(d.lunghezzaTotale !== undefined) lunghezzaEl.value = d.lunghezzaTotale ?? '';
          if(d.lunghezzaInterna !== undefined) lunghezzaInternaEl.value = d.lunghezzaInterna ?? '';
          if(d.larghezza !== undefined) larghezzaEl.value = d.larghezza ?? '';
          if(d.altezza !== undefined) altezzaEl.value = d.altezza ?? '';
          if(d.posti !== undefined) postiEl.value = d.posti ?? '';
          if(d.massa !== undefined) massaEl.value = d.massa ?? '';
          if(d.documenti !== undefined) documentiEl.value = d.documenti ?? '';
          if(d.tipologia !== undefined) tipologiaEl.value = d.tipologia ?? '';
          if(d.disposizioneLetti !== undefined) setCheckedValues('disposizioneLetti', d.disposizioneLetti);
          if(d.lettoFisso !== undefined) lettoFissoEl.value = d.lettoFisso ?? '';
          if(d.idealePer !== undefined) setCheckedValues('idealePer', d.idealePer);

          if(d.tipoDinette !== undefined) tipoDinetteEl.value = d.tipoDinette ?? '';
          if(d.cucina !== undefined) cucinaEl.value = d.cucina ?? '';
          if(d.bagno !== undefined) bagnoEl.value = d.bagno ?? '';
          if(d.docciaSeparata !== undefined) docciaSeparataEl.value = d.docciaSeparata ?? '';
          if(d.armadi !== undefined) armadiEl.value = d.armadi ?? '';
          if(d.gavoniInterni !== undefined) gavoniInterniEl.value = d.gavoniInterni ?? '';

          if(d.presa220Esterna !== undefined) presa220EsternaEl.value = d.presa220Esterna ?? '';
          if(d.impianto12V !== undefined) impianto12VEl.value = d.impianto12V ?? '';
          if(d.batteriaServizi !== undefined) batteriaServiziEl.value = d.batteriaServizi ?? '';
          if(d.illuminazioneLed !== undefined) illuminazioneLedEl.value = d.illuminazioneLed ?? '';
          if(d.impiantoGas !== undefined) impiantoGasEl.value = d.impiantoGas ?? '';
          if(d.numeroBombole !== undefined) numeroBomboleEl.value = d.numeroBombole ?? '';
          if(d.scadenzaImpiantoGas !== undefined) scadenzaImpiantoGasEl.value = d.scadenzaImpiantoGas ?? '';
          if(d.serbatoioAcquaPulita !== undefined) serbatoioAcquaPulitaEl.value = d.serbatoioAcquaPulita ?? '';
          if(d.serbatoioAcqueGrigie !== undefined) serbatoioAcqueGrigieEl.value = d.serbatoioAcqueGrigie ?? '';
          if(d.riscaldamento !== undefined) riscaldamentoEl.value = d.riscaldamento ?? '';
          if(d.tipoRiscaldamento !== undefined) tipoRiscaldamentoEl.value = d.tipoRiscaldamento ?? '';
          if(d.climatizzatore !== undefined) climatizzatoreEl.value = d.climatizzatore ?? '';
          if(d.predisposizioneClima !== undefined) predisposizioneClimaEl.value = d.predisposizioneClima ?? '';
          if(d.verandaTendalino !== undefined) verandaTendalinoEl.value = d.verandaTendalino ?? '';
          if(d.portabici !== undefined) portabiciEl.value = d.portabici ?? '';

          if(d.contattoTelefono !== undefined) contattoTelefonoEl.value = d.contattoTelefono ?? '';
          if(d.contattoWhatsapp !== undefined) contattoWhatsappEl.value = d.contattoWhatsapp ?? '';
          if(d.contattoEmail !== undefined) contattoEmailEl.value = d.contattoEmail ?? '';
          if(d.localita !== undefined) localitaEl.value = d.localita ?? '';
          if(d.orariContatto !== undefined) orariContattoEl.value = d.orariContatto ?? '';
          if(d.videoUrl !== undefined) videoUrlEl.value = d.videoUrl ?? '';
          if(d.planimetriaUrl !== undefined) planimetriaUrlEl.value = d.planimetriaUrl ?? '';
          if(d.note) {
            editor.innerHTML = d.note;
            noteEl.value = d.note;
          }
        } catch {}
      }
      updateNewFormChecklistUi();
      updateNoteStats();
    }

    // --- Upload Drag&Drop + Resize ---
    // Gestione Drag
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });
    
    dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
    dropzone.addEventListener('click', (e) => {
      // Evita doppio click se si clicca direttamente sull'input (raro ma possibile se non è hidden)
      if (e.target !== photosInput) {
        photosInput.click();
      }
    });
    try { photosInput.setAttribute('accept','image/jpeg,image/png,image/webp'); photosInput.setAttribute('multiple',''); } catch {}
    photosInput.addEventListener('change', () => handleFiles(photosInput.files));
    function canUseWebp() {
      try {
        const c = document.createElement('canvas');
        return c.toDataURL('image/webp').startsWith('data:image/webp');
      } catch { return false; }
    }
    const USE_WEBP = canUseWebp();
    function dataURLToFile(name, dataURL) {
      const parts = String(dataURL || '').split(',');
      if (parts.length < 2) return null;
      const meta = parts[0];
      const b64 = parts[1];
      const mime = (meta.match(/data:(.*);base64/) || [null, 'application/octet-stream'])[1];
      try {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: mime });
        try { return new File([blob], name, { type: mime }); } catch { return blob; }
      } catch { return null; }
    }
    async function processImageFromBlob(blob) {
      let bmp = null;
      try { bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch {}
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = URL.createObjectURL(blob);
      });
      const w = bmp ? bmp.width : img.naturalWidth || img.width;
      const h = bmp ? bmp.height : img.naturalHeight || img.height;
      const sizes = [{w:320,h:320,q:0.82},{w:1024,h:1024,q:0.82}];
      const out = {};
      for (const s of sizes) {
        const ratio = Math.min(s.w / w, s.h / h, 1);
        const tw = Math.round(w * ratio);
        const th = Math.round(h * ratio);
        const c = document.createElement('canvas');
        c.width = tw; c.height = th;
        const ctx = c.getContext('2d');
        if (bmp) ctx.drawImage(bmp, 0, 0, tw, th);
        else ctx.drawImage(img, 0, 0, tw, th);
        const type = USE_WEBP ? 'image/webp' : 'image/jpeg';
        const url = c.toDataURL(type, s.q);
        if (s.w === 320) out.thumb = url;
        else out.src = url;
        out.type = type;
      }
      const ext = out.type === 'image/webp' ? 'webp' : 'jpg';
      const name = 'photo_' + Date.now() + '.' + ext;
      const fileObj = dataURLToFile(name, out.src);
      if (fileObj) { out.file = fileObj; out.name = name; }
      const pC = document.createElement('canvas');
      const pr = Math.min(24 / w, 24 / h, 1);
      pC.width = Math.round(w * pr);
      pC.height = Math.round(h * pr);
      const pctx = pC.getContext('2d');
      if (bmp) pctx.drawImage(bmp, 0, 0, pC.width, pC.height);
      else pctx.drawImage(img, 0, 0, pC.width, pC.height);
      const placeholder = pC.toDataURL('image/jpeg', 0.6);
      return { src: out.src, thumb: out.thumb, placeholder, w, h, type: out.type };
    }
    dropzone.addEventListener('paste', (e) => {
      const files = [];
      if (e.clipboardData && e.clipboardData.items) {
        for (const it of e.clipboardData.items) {
          if (it.type && it.type.startsWith('image/')) files.push(it.getAsFile());
        }
      }
      if (files.length) handleFiles(files);
    });
    if (addPhotoUrlBtn && photoUrlInput) addPhotoUrlBtn.addEventListener('click', async () => {
      const url = photoUrlInput.value.trim();
      if (!url) return;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) {
          showToast('error', 'URL non valido', 'Il link non sembra un’immagine.');
          return;
        }
        const obj = await processImageFromBlob(blob);
        if (!obj.file) {
          const ext = obj.type === 'image/webp' ? 'webp' : 'jpg';
          obj.name = 'photo_' + Date.now() + '.' + ext;
          const f = dataURLToFile(obj.name, obj.src);
          if (f) obj.file = f;
        }
        draftPhotos.push(obj);
        markNewFormDirty();
        photoUrlInput.value = '';
        renderPhotos();
        showToast('success', 'Foto aggiunta', 'Immagine inserita da URL.');
      } catch {
        showToast('error', 'Errore URL', 'Impossibile scaricare o processare l’immagine.');
      }
    });
    if (photoUrlInput && addPhotoUrlBtn) {
      photoUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          try { addPhotoUrlBtn.click(); } catch {}
        }
      });
    }
    function getPhotoAltBase() {
      const marca = String(marcaEl && marcaEl.value ? marcaEl.value : '').trim();
      const modello = String(modelloEl && modelloEl.value ? modelloEl.value : '').trim();
      const anno = String(annoEl && annoEl.value ? annoEl.value : '').trim();
      const parts = [marca, modello, anno].filter(Boolean);
      return parts.length ? parts.join(' ') : 'Roulotte';
    }
    if (autoAltBtn) {
      autoAltBtn.addEventListener('click', (e) => {
        const force = !!(e && e.shiftKey);
        const base = getPhotoAltBase();
        if (!draftPhotos || !draftPhotos.length) return;
        let changed = 0;
        draftPhotos = draftPhotos.map((ph, idx) => {
          const cur = String((ph && ph.alt) ? ph.alt : '').trim();
          if (!force && cur) return ph;
          changed++;
          return { ...ph, alt: `${base} - Foto ${idx + 1}` };
        });
        renderPhotos();
        if (changed) showToast('success', 'ALT aggiornati', `Aggiornate ${changed} descrizioni foto.`);
      });
    }

    async function processVideoFromBlob(file) {
      if (file.size > (8 * 1024 * 1024)) {
        photoHint.textContent = 'Video troppo pesante. Usa un URL (YouTube/Vimeo) o un file < 8MB.';
        showToast('warning', 'Video troppo pesante', 'Usa un URL oppure un file sotto 8MB.');
        return null;
      }
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      await new Promise((resolve) => {
        video.addEventListener('loadeddata', resolve, { once: true });
        video.addEventListener('error', resolve, { once: true });
      });
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      const c = document.createElement('canvas');
      const maxW = 1024, maxH = 1024;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      c.width = Math.round(w * ratio);
      c.height = Math.round(h * ratio);
      const ctx = c.getContext('2d');
      try { ctx.drawImage(video, 0, 0, c.width, c.height); } catch {}
      const poster = c.toDataURL('image/jpeg', 0.82);
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      URL.revokeObjectURL(url);
      return { videoUrl: String(dataUrl || ''), poster };
    }
    async function handleFiles(files) {
      const fileList = Array.from(files || []);
      const toTake = fileList;
      const before = draftPhotos.length;
      photoHint.textContent = 'Elaborazione…';
      if (toTake.length > 0) showToast('info', 'Elaborazione file', `Sto preparando ${toTake.length} file…`, { timeoutMs: 1400 });

      for (const f of toTake) {
        try {
          if (f.type.startsWith('image/')) {
            const obj = await processImageFromBlob(f);
            if (!obj.file) {
              const ext = obj.type === 'image/webp' ? 'webp' : 'jpg';
              obj.name = (f.name && String(f.name).trim()) ? f.name : ('photo_' + Date.now() + '.' + ext);
              const f2 = dataURLToFile(obj.name, obj.src);
              if (f2) obj.file = f2;
            }
            draftPhotos.push(obj);
          } else if (f.type.startsWith('video/')) {
            const v = await processVideoFromBlob(f);
            if (v && v.videoUrl) {
              videoUrlEl.value = v.videoUrl;
              if (v.poster) {
                draftPhotos.push({ src: v.poster, thumb: v.poster, placeholder: v.poster, type: 'image/jpeg', alt: 'Poster video' });
              }
            }
          }
        } catch(e) {
          photoHint.textContent = 'Errore elaborazione file.';
          showToast('error', 'Errore file', 'Almeno un file non è stato elaborato correttamente.');
        }
      }
      photosInput.value = '';
      if (draftPhotos.length !== before) markNewFormDirty();
      renderPhotos();
      photoHint.textContent = '';
      const added = Math.max(0, draftPhotos.length - before);
      if (added > 0) showToast('success', 'Foto aggiunte', `Aggiunte ${added} foto. Totale: ${draftPhotos.length}.`);
    }

    function renderPhotos() {
      photosPreview.innerHTML = '';
      if (draftPhotos.length === 0) {
        photosPreview.innerHTML = '<div class="hint" style="grid-column:1/-1">Nessuna foto.</div>';
        updateNewFormChecklistUi();
        return;
      }
      draftPhotos.forEach((ph, idx) => {
        const box = document.createElement('div');
        box.className = 'photo';
        box.draggable = true;
        box.dataset.index = String(idx);
        const img = document.createElement('img');
        img.src = ph.thumb || ph.src || '';
        img.alt = ph.alt || '';
        if (idx === 0) {
          const badge = document.createElement('div');
          badge.textContent = 'Copertina';
          badge.style.position = 'absolute';
          badge.style.left = '6px';
          badge.style.top = '6px';
          badge.style.background = 'rgba(37,99,235,.85)';
          badge.style.color = '#fff';
          badge.style.fontWeight = '900';
          badge.style.fontSize = '.78rem';
          badge.style.padding = '4px 6px';
          badge.style.borderRadius = '8px';
          box.appendChild(badge);
        }
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.textContent = '×';
        rm.title = 'Rimuovi';
        rm.addEventListener('click', (e) => {
          e.stopPropagation();
          draftPhotos = draftPhotos.filter((_, i) => i !== idx);
          markNewFormDirty();
          renderPhotos();
        });
        box.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(idx)); });
        box.addEventListener('dragover', (e) => { e.preventDefault(); });
        box.addEventListener('drop', (e) => {
          e.preventDefault();
          const from = Number(e.dataTransfer.getData('text/plain'));
          const to = Number(box.dataset.index || '0');
          if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
          const arr = [...draftPhotos];
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          draftPhotos = arr;
          markNewFormDirty();
          renderPhotos();
        });
        box.appendChild(img);
        box.appendChild(rm);
        photosPreview.appendChild(box);
        const caption = document.createElement('input');
        caption.type = 'text';
        caption.placeholder = 'Didascalia/alt';
        caption.value = ph.alt || '';
        caption.style.marginTop = '6px';
        caption.addEventListener('input', () => {
          draftPhotos[idx] = { ...draftPhotos[idx], alt: caption.value };
          markNewFormDirty();
        });
        const setCover = document.createElement('button');
        setCover.type = 'button';
        setCover.textContent = idx === 0 ? 'Copertina ✓' : 'Imposta copertina';
        setCover.className = 'btn';
        setCover.style.marginTop = '6px';
        setCover.addEventListener('click', () => {
          const arr = [...draftPhotos];
          const [item] = arr.splice(idx, 1);
          arr.unshift(item);
          draftPhotos = arr;
          renderPhotos();
        });
        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.textContent = 'Su';
        upBtn.className = 'btn';
        upBtn.style.marginTop = '6px';
        upBtn.addEventListener('click', () => {
          if (idx <= 0) return;
          const arr = [...draftPhotos];
          const [item] = arr.splice(idx, 1);
          arr.splice(idx - 1, 0, item);
          draftPhotos = arr;
          renderPhotos();
        });
        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.textContent = 'Giù';
        downBtn.className = 'btn';
        downBtn.style.marginTop = '6px';
        downBtn.addEventListener('click', () => {
          if (idx >= draftPhotos.length - 1) return;
          const arr = [...draftPhotos];
          const [item] = arr.splice(idx, 1);
          arr.splice(idx + 1, 0, item);
          draftPhotos = arr;
          renderPhotos();
        });
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.textContent = 'AI Migliora';
        aiBtn.className = 'btn btn-primary';
        aiBtn.style.marginTop = '6px';
        aiBtn.addEventListener('click', async () => {
          const token = window.RoulotteStore.getAuthToken();
          if (!token) { logout(); return; }
          const ph = draftPhotos[idx] || null;
          let src = ph && (ph.file || ph.blob) ? null : (ph && (ph.src || ph.url_full || ph.thumb) ? String(ph.src || ph.url_full || ph.thumb) : '');
          let blob = null;
          if (ph && ph.file) blob = ph.file;
          else if (src) {
            try {
              const r = await fetch(String(src));
              blob = await r.blob();
            } catch {}
          }
          if (!blob) {
            showToast('warning', 'Foto', 'Impossibile leggere la foto.');
            return;
          }
          try {
            aiBtn.disabled = true;
            aiBtn.textContent = 'AI…';
            const fd = new FormData();
            const type = String(blob.type || 'image/png');
            const name = 'photo_' + Date.now() + (type.includes('jpeg') ? '.jpg' : type.includes('webp') ? '.webp' : '.png');
            fd.append('file', blob, name);
            const res = await fetch(apiUrl('/api/ai/photo/upscale'), {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + token },
              body: fd
            });
            if (!res.ok) {
              let detail = '';
              const ct = String(res.headers.get('content-type') || '');
              if (ct.includes('application/json')) {
                const j = await res.json().catch(() => null);
                if (j && typeof j === 'object') {
                  const e = String(j.error || '').trim();
                  const d = String(j.detail || '').trim();
                  if (e) detail = e + (d ? (': ' + d) : '');
                }
              } else {
                const t = await res.text().catch(() => '');
                detail = String(t || '').trim().slice(0, 220);
              }
              if (!detail) detail = 'HTTP ' + res.status;
              throw new Error(detail);
            }
            const outBlob = await res.blob();
            const processed = await processImageFromBlob(outBlob);
            draftPhotos[idx] = { ...processed, alt: ph && ph.alt ? ph.alt : (processed.alt || '') };
            markNewFormDirty();
            renderPhotos();
            showToast('success', 'Foto', 'Foto migliorata.');
          } catch (e) {
            const msg = String(e && e.message ? e.message : e).trim();
            showToast('error', 'Foto', msg || 'AI foto non disponibile o errore.');
          } finally {
            aiBtn.disabled = false;
            aiBtn.textContent = 'AI Migliora';
          }
        });
        const wrap = document.createElement('div');
        wrap.style.display = 'grid';
        wrap.style.gridTemplateRows = '1fr auto auto auto auto auto';
        wrap.appendChild(box);
        wrap.appendChild(caption);
        wrap.appendChild(setCover);
        wrap.appendChild(aiBtn);
        wrap.appendChild(upBtn);
        wrap.appendChild(downBtn);
        photosPreview.appendChild(wrap);
      });
      updateNewFormChecklistUi();
    }
    if (clearPhotosBtn) clearPhotosBtn.addEventListener('click', () => {
      draftPhotos = [];
      markNewFormDirty();
      renderPhotos();
    });

    // --- Form Submit ---
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tokenCheck = window.RoulotteStore.getAuthToken();
      if (!tokenCheck) {
        formMsg.hidden = false;
        formMsg.textContent = 'Sessione scaduta. Accedi di nuovo.';
        showToast('error', 'Sessione scaduta', 'Accedi di nuovo per continuare.');
        logout();
        return;
      }
      const submitBtn = newForm.querySelector('button[type="submit"]');
      const prevSubmitText = submitBtn ? String(submitBtn.textContent || '') : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvataggio…'; }
      const marca = String(marcaEl.value || '').trim();
      const modello = String(modelloEl.value || '').trim();
      const prezzo = Number(prezzoEl.value);
      const anno = Number(annoEl.value);
      const tipologiaMezzo = String(tipologiaMezzoEl && tipologiaMezzoEl.value ? tipologiaMezzoEl.value : '').trim();
      const statoAnnuncio = String((statoAnnuncioEl && statoAnnuncioEl.value) ? statoAnnuncioEl.value : 'bozza');

      const missing = [];
      if (!marca) { missing.push('Marca'); setInvalidControl(marcaEl, true); }
      if (!modello) { missing.push('Modello'); setInvalidControl(modelloEl, true); }
      if (!Number.isFinite(prezzo) || prezzo <= 0) { missing.push('Prezzo'); setInvalidControl(prezzoEl, true); }
      if (!Number.isFinite(anno) || anno < 1970 || anno > 2100) { missing.push('Anno'); setInvalidControl(annoEl, true); }
      if (!tipologiaMezzo) { missing.push('Tipologia'); setInvalidControl(tipologiaMezzoEl, true); }
      if (statoAnnuncio !== 'bozza' && (!Array.isArray(draftPhotos) || draftPhotos.length === 0)) missing.push('Foto (per pubblicare)');
      if (missing.length) {
        const msg = 'Compila: ' + missing.join(', ') + '.';
        formMsg.hidden = false;
        formMsg.textContent = msg;
        showToast('error', 'Dati mancanti', msg);
        if (!marca) { try { marcaEl.focus(); } catch {} }
        else if (!modello) { try { modelloEl.focus(); } catch {} }
        else if (!Number.isFinite(prezzo) || prezzo <= 0) { try { prezzoEl.focus(); } catch {} }
        else if (!Number.isFinite(anno) || anno < 1970 || anno > 2100) { try { annoEl.focus(); } catch {} }
        else if (!tipologiaMezzo) { try { tipologiaMezzoEl.focus(); } catch {} }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevSubmitText || 'Salva scheda'; }
        updateNewFormChecklistUi();
        return;
      }

      const payload = { 
        marca, 
        modello, 
        versione: toNullIfEmpty(versioneEl.value),
        stato: statoEl.value, 
        stato_annuncio: String((statoAnnuncioEl && statoAnnuncioEl.value) ? statoAnnuncioEl.value : 'bozza'),
        categoryId: categoryIdEl.value,
        prezzo, 
        anno, 
        tipologiaMezzo: toNullIfEmpty(tipologiaMezzoEl.value),
        disponibilitaProntaConsegna: !!prontaConsegnaEl.checked,
        permuta: toNullIfEmpty(getRadioValue('permuta')),

        condizioneGenerale: toNullIfEmpty(condizioneGeneraleEl.value),
        statoInterni: toNullIfEmpty(statoInterniEl.value),
        statoEsterni: toNullIfEmpty(statoEsterniEl.value),
        infiltrazioni: toNullIfEmpty(infiltrazioniEl.value),
        odori: toNullIfEmpty(odoriEl.value),
        provenienza: toNullIfEmpty(provenienzaEl.value),

        targata: toNullIfEmpty(targataEl.value),
        librettoCircolazione: toNullIfEmpty(librettoCircolazioneEl.value),
        omologataCircolazione: toNullIfEmpty(omologataCircolazioneEl.value),
        numeroTelaio: toNullIfEmpty(numeroTelaioEl.value),
        numeroAssi: toNullIfEmpty(numeroAssiEl.value),
        timone: toNullIfEmpty(timoneEl.value),
        frenoRepulsione: toNullIfEmpty(frenoRepulsioneEl.value),
        pesoVuoto: toNullIfEmptyNumber(pesoVuotoEl.value),

        lunghezzaTotale: toNullIfEmptyNumber(lunghezzaEl.value),
        lunghezzaInterna: toNullIfEmptyNumber(lunghezzaInternaEl.value),
        larghezza: toNullIfEmptyNumber(larghezzaEl.value),
        altezza: toNullIfEmptyNumber(altezzaEl.value),
        postiLetto: toNullIfEmptyNumber(postiEl.value),
        massa: toNullIfEmptyNumber(massaEl.value),
        documenti: toNullIfEmpty(documentiEl.value),
        tipologia: toNullIfEmpty(tipologiaEl.value),
        disposizioneLetti: getCheckedValues('disposizioneLetti'),
        lettoFisso: toNullIfEmpty(lettoFissoEl.value),
        idealePer: getCheckedValues('idealePer'),

        tipoDinette: toNullIfEmpty(tipoDinetteEl.value),
        cucina: toNullIfEmpty(cucinaEl.value),
        bagno: toNullIfEmpty(bagnoEl.value),
        docciaSeparata: toNullIfEmpty(docciaSeparataEl.value),
        armadi: toNullIfEmpty(armadiEl.value),
        gavoniInterni: toNullIfEmpty(gavoniInterniEl.value),

        presa220Esterna: toNullIfEmpty(presa220EsternaEl.value),
        impianto12V: toNullIfEmpty(impianto12VEl.value),
        batteriaServizi: toNullIfEmpty(batteriaServiziEl.value),
        illuminazioneLed: toNullIfEmpty(illuminazioneLedEl.value),
        impiantoGas: toNullIfEmpty(impiantoGasEl.value),
        numeroBombole: toNullIfEmptyNumber(numeroBomboleEl.value),
        scadenzaImpiantoGas: toNullIfEmpty(scadenzaImpiantoGasEl.value),
        serbatoioAcquaPulita: toNullIfEmpty(serbatoioAcquaPulitaEl.value),
        serbatoioAcqueGrigie: toNullIfEmpty(serbatoioAcqueGrigieEl.value),
        riscaldamento: toNullIfEmpty(riscaldamentoEl.value),
        tipoRiscaldamento: toNullIfEmpty(tipoRiscaldamentoEl.value),
        climatizzatore: toNullIfEmpty(climatizzatoreEl.value),
        predisposizioneClima: toNullIfEmpty(predisposizioneClimaEl.value),
        verandaTendalino: toNullIfEmpty(verandaTendalinoEl.value),
        portabici: toNullIfEmpty(portabiciEl.value),

        contattoTelefono: toNullIfEmpty(contattoTelefonoEl.value),
        contattoWhatsapp: toNullIfEmpty(contattoWhatsappEl.value),
        contattoEmail: toNullIfEmpty(contattoEmailEl.value),
        localita: toNullIfEmpty(localitaEl.value),
        orariContatto: toNullIfEmpty(orariContattoEl.value),
        videoUrl: toNullIfEmpty(videoUrlEl.value),
        planimetriaUrl: toNullIfEmpty(planimetriaUrlEl.value),

        photos: draftPhotos, 
        note: noteEl.value 
      };
      
      const editId = editIdEl.value;
      if (editId) payload.updatedAt = draftEditingUpdatedAt || null;
      
      // Prepare existing photos list for server sync (URLs only)
      const existingPhotos = draftPhotos
        .filter(p => !p.file && (p.src || p.url_full || typeof p === 'string'))
        .map(p => (typeof p === 'string' ? p : (p.url_full || p.src)));
        
      payload.existing_photos = JSON.stringify(existingPhotos);

      // Prepare new photos for upload
      const newFiles = draftPhotos.filter(p => p.file);

      // Validation for new files
      const maxSize = 10 * 1024 * 1024;
      const allowed = ['image/jpeg','image/png','image/webp'];
      for (const ph of newFiles) {
        const t = String(ph.file.type || '');
        const s = Number(ph.file.size || 0);
        if (!allowed.includes(t)) {
          formMsg.hidden = false;
          formMsg.textContent = 'Formato non supportato. Usa JPG, PNG o WEBP.';
          showToast('error', 'Formato non supportato', 'Usa JPG, PNG o WEBP.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevSubmitText || 'Salva scheda'; }
          return;
        }
        if (s > maxSize) {
          formMsg.hidden = false;
          formMsg.textContent = 'File troppo grande. Max 10MB per foto.';
          showToast('error', 'File troppo grande', 'Max 10MB per foto.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevSubmitText || 'Salva scheda'; }
          return;
        }
      }

      const progEl = document.getElementById('uploadProg');
      if (progEl) { progEl.value = 0; progEl.style.display = ''; }
      formMsg.hidden = true;
      showToast('info', editId ? 'Salvataggio modifica' : 'Creazione scheda', newFiles.length ? 'Salvataggio e upload foto in corso…' : 'Salvataggio in corso…', { timeoutMs: 1600 });

      try {
        const onProgress = function(p){ if (progEl) progEl.value = p; };
        
        if (editId) {
          payload.id = editId;
          await window.RoulotteStore.updateRoulotte(payload, newFiles, onProgress);
        } else {
          await window.RoulotteStore.addRoulotte(payload, newFiles, onProgress);
        }

        if (progEl) { progEl.style.display = 'none'; progEl.value = 0; }
        
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(editId ? 'Modifica completata' : 'Creazione completata', { body: 'Operazione eseguita con successo.' });
            } else if (Notification.permission !== 'denied') {
               Notification.requestPermission().then(p => {
                 if (p === 'granted') new Notification(editId ? 'Modifica completata' : 'Creazione completata', { body: 'Operazione eseguita con successo.' });
               });
            }
          }
        } catch {}

        try {
          const tmpl = { ...payload };
          delete tmpl.id;
          delete tmpl.photos;
          delete tmpl.existing_photos;
          delete tmpl.updatedAt;
          localStorage.setItem('last_roulotte_template', JSON.stringify(tmpl));
        } catch {}

        clearForm();
        refreshAll();
        switchSection('list');
        showToast('success', editId ? 'Modifica salvata' : 'Scheda creata', newFiles.length ? 'Operazione completata (foto incluse).' : 'Operazione completata.');

      } catch (err) {
        if (progEl) { progEl.style.display = 'none'; progEl.value = 0; }
        formMsg.hidden = false;
        const msg = String((err && err.message) ? err.message : 'Errore durante il salvataggio. Riprova.');
        if (msg.includes('CONFLICT')) {
          formMsg.textContent = 'Conflitto dati rilevato: la scheda è stata aggiornata da un altro dispositivo. Ricarico i dati…';
          showToast('warning', 'Conflitto dati', 'La scheda è stata aggiornata altrove. Ricarico…', { timeoutMs: 4200 });
          try { await window.RoulotteStore.reloadRoulottes(); } catch {}
          try { refreshAll(); } catch {}
          if (editIdEl && editIdEl.value) {
            try { window.editItem(editIdEl.value); } catch {}
          }
        } else {
          formMsg.textContent = msg;
          showToast('error', 'Errore salvataggio', msg);
        }
        console.error(err);
        if (msg.includes('UNAUTHORIZED') || msg.includes('401')) { logout(); }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevSubmitText || 'Salva scheda'; }
      }
    });

    function clearForm() {
      newForm.reset();
      editIdEl.value = '';
      draftEditingUpdatedAt = '';
      formTitle.textContent = 'Crea nuova scheda';
      clearFormBtn.textContent = 'Nuova Scheda';
      editor.innerHTML = '';
      draftPhotos = [];
      renderPhotos();
      sessionStorage.removeItem('roulotte_draft');
      try {
        if (annoEl && !String(annoEl.value || '').trim()) annoEl.value = String(new Date().getFullYear());
        if (statoAnnuncioEl) statoAnnuncioEl.value = 'bozza';
      } catch {}
      updateNewFormChecklistUi();
      updateNoteStats();
      setNewFormDirty(false);
    }
    clearFormBtn.addEventListener('click', () => {
       const inEdit = !!(editIdEl && String(editIdEl.value || '').trim());
       if (newFormDirty) {
         const msg = inEdit
           ? 'Hai modifiche non salvate. Vuoi davvero annullare la modifica?'
           : 'Hai modifiche non salvate. Vuoi davvero creare una nuova scheda?';
         if (!confirm(msg)) return;
       }
       clearForm();
       switchSection('new');
    });
    goListBtn.addEventListener('click', () => { switchSection('list'); renderList(); });
    if (saveAndPublishBtn && newForm) {
      saveAndPublishBtn.addEventListener('click', () => {
        if (statoAnnuncioEl) {
          if (statoEl && String(statoEl.value || '') === 'Venduto') statoAnnuncioEl.value = 'venduto';
          else statoAnnuncioEl.value = 'pubblicato';
        }
        updateNewFormChecklistUi();
        try {
          if (typeof newForm.requestSubmit === 'function') newForm.requestSubmit();
          else {
            const b = newForm.querySelector('button[type="submit"]');
            if (b) b.click();
          }
        } catch {}
      });
    }

    // --- Settings: Security ---
    securityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = newAuthUser.value.trim();
      const p = newAuthPass.value;
      if(u && p) {
        window.RoulotteStore.updateAdmin(u, p);
        secMsg.hidden = false;
        secMsg.textContent = 'Credenziali aggiornate con successo.';
        setTimeout(() => secMsg.hidden = true, 3000);
        newAuthUser.value = '';
        newAuthPass.value = '';
        try { showToast('success', 'Sicurezza', 'Credenziali aggiornate.', { timeoutMs: 1800 }); } catch {}
      }
    });

    if (adminUsersRefreshBtn) {
      adminUsersRefreshBtn.addEventListener('click', async () => {
        try { await ensureAdminUsersPanel(); } catch {}
      });
    }
    if (adminResetUserForm) {
      adminResetUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setAdminResetUserMsg('', true);
        const code = String(adminResetCode && adminResetCode.value || '').trim();
        const username = String(adminResetUsername && adminResetUsername.value || '').trim();
        const password = String(adminResetPassword && adminResetPassword.value || '');
        if (!code || !username || !password) {
          setAdminResetUserMsg('Compila codice reset, username e password.', false);
          return;
        }
        const submitBtn = adminResetUserForm.querySelector('button[type="submit"]');
        try {
          if (submitBtn) submitBtn.disabled = true;
          const r = await fetch(apiUrl('/api/auth/reset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Reset': code },
            body: JSON.stringify({ username, password })
          });
          if (r.status === 401) { setAdminResetUserMsg('Codice reset non valido.', false); return; }
          if (!r.ok) { setAdminResetUserMsg('Errore durante l’operazione.', false); return; }
          if (adminResetUsername) adminResetUsername.value = '';
          if (adminResetPassword) adminResetPassword.value = '';
          setAdminResetUserMsg('Operazione completata.', true);
          try { await ensureAdminUsersPanel(); } catch {}
        } catch {
          setAdminResetUserMsg('Errore di rete durante l’operazione.', false);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
    if (adminUsersCreateForm) {
      adminUsersCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = window.RoulotteStore.getAuthToken();
        if (!token) { logout(); return; }
        const username = String(adminNewUsername && adminNewUsername.value || '').trim();
        const password = String(adminNewPassword && adminNewPassword.value || '');
        if (!username || !password) { setAdminUsersMsg('Compila username e password.', false); return; }
        try {
          const r = await fetch(apiUrl('/api/admin/users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ username, password })
          });
          if (r.status === 401) { logout(); return; }
          if (r.status === 403) { setAdminUsersMsg('Non autorizzato.', false); try { showToast('error', 'Utenti', 'Non autorizzato.', { timeoutMs: 2200 }); } catch {} return; }
          if (r.status === 409) { setAdminUsersMsg('Username già esistente.', false); try { showToast('warning', 'Utenti', 'Username già esistente.', { timeoutMs: 2200 }); } catch {} return; }
          if (!r.ok) { setAdminUsersMsg('Errore durante la creazione utente.', false); try { showToast('error', 'Utenti', 'Errore creazione.', { timeoutMs: 2200 }); } catch {} return; }
          if (adminNewUsername) adminNewUsername.value = '';
          if (adminNewPassword) adminNewPassword.value = '';
          setAdminUsersMsg('Utente creato con successo.', true);
          try { showToast('success', 'Utenti', 'Utente creato.', { timeoutMs: 1600 }); } catch {}
          await loadAdminUsers();
        } catch {
          setAdminUsersMsg('Errore di rete durante la creazione utente.', false);
          try { showToast('error', 'Utenti', 'Errore di rete.', { timeoutMs: 2200 }); } catch {}
        }
      });
    }
    if (adminUsersList) {
      adminUsersList.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-user-action]') : null;
        if (!btn) return;
        e.preventDefault();
        const action = String(btn.getAttribute('data-user-action') || '').trim();
        const username = String(btn.getAttribute('data-user') || '').trim();
        if (!action || !username) return;
        const token = window.RoulotteStore.getAuthToken();
        if (!token) { logout(); return; }

        if (action === 'delete') {
          const ok = confirm(`Eliminare l'utente "${username}"?`);
          if (!ok) return;
          try {
            const r = await fetch(apiUrl('/api/admin/users/' + encodeURIComponent(username)), {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (r.status === 401) { logout(); return; }
            if (r.status === 403) { setAdminUsersMsg('Non autorizzato.', false); try { showToast('error', 'Utenti', 'Non autorizzato.', { timeoutMs: 2200 }); } catch {} return; }
            if (r.status === 404) { setAdminUsersMsg('Utente non trovato.', false); try { showToast('warning', 'Utenti', 'Utente non trovato.', { timeoutMs: 2200 }); } catch {} return; }
            if (!r.ok) { setAdminUsersMsg('Errore durante eliminazione utente.', false); try { showToast('error', 'Utenti', 'Errore eliminazione.', { timeoutMs: 2200 }); } catch {} return; }
            setAdminUsersMsg('Utente eliminato.', true);
            try { showToast('success', 'Utenti', 'Utente eliminato.', { timeoutMs: 1600 }); } catch {}
            await loadAdminUsers();
          } catch {
            setAdminUsersMsg('Errore di rete durante eliminazione utente.', false);
            try { showToast('error', 'Utenti', 'Errore di rete.', { timeoutMs: 2200 }); } catch {}
          }
          return;
        }

        if (action === 'setpass') {
          const input = adminUsersList.querySelector(`input[data-user-pass="${CSS.escape(username)}"]`);
          const password = String(input && input.value || '');
          if (!password) { setAdminUsersMsg('Inserisci una nuova password.', false); return; }
          try {
            const r = await fetch(apiUrl('/api/admin/users/' + encodeURIComponent(username) + '/password'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ password })
            });
            if (r.status === 401) { logout(); return; }
            if (r.status === 403) { setAdminUsersMsg('Non autorizzato.', false); try { showToast('error', 'Utenti', 'Non autorizzato.', { timeoutMs: 2200 }); } catch {} return; }
            if (r.status === 404) { setAdminUsersMsg('Utente non trovato.', false); try { showToast('warning', 'Utenti', 'Utente non trovato.', { timeoutMs: 2200 }); } catch {} return; }
            if (!r.ok) { setAdminUsersMsg('Errore durante cambio password.', false); try { showToast('error', 'Utenti', 'Errore cambio password.', { timeoutMs: 2200 }); } catch {} return; }
            if (input) input.value = '';
            setAdminUsersMsg('Password aggiornata.', true);
            try { showToast('success', 'Utenti', 'Password aggiornata.', { timeoutMs: 1600 }); } catch {}
            await loadAdminUsers();
          } catch {
            setAdminUsersMsg('Errore di rete durante cambio password.', false);
            try { showToast('error', 'Utenti', 'Errore di rete.', { timeoutMs: 2200 }); } catch {}
          }
          return;
        }
      });
    }

    let centralSettingsPanel = null;

    const CS_MODE_STORAGE_KEY = 'roulotte_cs_mode';
    const CS_MODE_BASIC = 'basic';
    const CS_MODE_ADVANCED = 'advanced';

    const CS_BASIC_KEYS = new Set([
      'sito.brand.name',
      'sito.brand.tagline',
      'sito.brand.logo_url',
      'sito.brand.favicon_url',
      'sito.seo.default_title',
      'sito.seo.default_description',
      'sito.seo.og_image_url',
      'sito.seo.twitter_card',
      'sito.social.instagram_url',
      'sito.social.facebook_url',
      'sito.social.youtube_url',
      'sito.social.tiktok_url',
      'sito.legal.company_name',
      'sito.legal.vat_number',
      'sito.legal.address',
      'annunci.pubblicazione.enabled',
      'annunci.pubblicazione.default_visibility',
      'annunci.pubblicazione.require_photos_for_publish',
      'annunci.pubblicazione.require_price_for_publish',
      'annunci.listing.default_sort',
      'annunci.listing.page_size',
      'annunci.homepage.featured_enabled',
      'annunci.homepage.max_items',
      'annunci.labels.badge_text',
      'annunci.labels.contact_phone',
      'annunci.labels.contact_whatsapp',
      'annunci.labels.contact_email',
      'regole_tecniche.integrazioni.ai.enabled',
      'regole_tecniche.integrazioni.ai.provider',
      'regole_tecniche.integrazioni.ai.base_url',
      'regole_tecniche.integrazioni.ai.api_key',
      'regole_tecniche.integrazioni.ai.model',
      'regole_tecniche.integrazioni.ai.temperature',
      'regole_tecniche.integrazioni.photo_ai.upscale_url',
      'regole_tecniche.upload.photo_max_bytes',
      'regole_tecniche.upload.photo_max_count_per_annuncio',
      'regole_tecniche.upload.photo_allowed_mimetypes',
      'regole_tecniche.cache.asset_max_age_seconds',
      'regole_tecniche.public.posthog_host',
      'regole_tecniche.public.posthog_key',
      'regole_tecniche.public.google_client_id',
      'regole_tecniche.integrazioni.render.deploy_hook_url',
      'regole_tecniche.integrazioni.render.api_key',
      'regole_tecniche.integrazioni.render.service_id',
    ]);

    const CS_KEY_META = new Map([
      ['annunci.pubblicazione.enabled', {
        label: 'Pubblicazione annunci: attiva',
        help: 'Se disattivi, il sito non mostra la lista pubblica degli annunci.',
        group_basic: 'Pubblicazione'
      }],
      ['annunci.pubblicazione.default_visibility', {
        label: 'Stato predefinito nuovi annunci',
        help: 'Stato usato quando crei una scheda senza scegliere “Pubblicazione”.',
        group_basic: 'Pubblicazione',
        options: [
          { value: 'bozza', label: 'Bozza' },
          { value: 'verifica', label: 'Verifica' },
          { value: 'pubblicato', label: 'Pubblicato' },
          { value: 'venduto', label: 'Venduto' },
        ]
      }],
      ['annunci.pubblicazione.require_photos_for_publish', {
        label: 'Richiedi foto per pubblicare',
        help: 'Blocca la pubblicazione se la scheda non ha almeno una foto.',
        group_basic: 'Pubblicazione'
      }],
      ['annunci.pubblicazione.require_price_for_publish', {
        label: 'Richiedi prezzo per pubblicare',
        help: 'Blocca la pubblicazione se il prezzo non è impostato.',
        group_basic: 'Pubblicazione'
      }],
      ['annunci.listing.default_sort', {
        label: 'Ordinamento predefinito lista',
        help: 'Ordine con cui vengono mostrati gli annunci nella lista pubblica.',
        group_basic: 'Lista annunci',
        options: [
          { value: 'newest', label: 'Più recenti' },
          { value: 'priceAsc', label: 'Prezzo crescente' },
          { value: 'priceDesc', label: 'Prezzo decrescente' },
          { value: 'yearDesc', label: 'Anno decrescente' },
          { value: 'yearAsc', label: 'Anno crescente' },
        ]
      }],
      ['annunci.listing.page_size', {
        label: 'Annunci per pagina',
        help: 'Quanti annunci mostrare in una pagina della lista pubblica.',
        placeholder: 'Es. 24',
        min: 1,
        max: 200,
        step: 1,
        inputmode: 'numeric',
        group_basic: 'Lista annunci'
      }],
      ['annunci.homepage.featured_enabled', {
        label: 'Homepage: evidenza attiva',
        help: 'Mostra una sezione “in evidenza” in homepage (se configurata).',
        group_basic: 'Homepage'
      }],
      ['annunci.homepage.max_items', {
        label: 'Homepage: massimo elementi',
        help: 'Numero massimo di annunci da mostrare nella sezione in homepage.',
        placeholder: 'Es. 6',
        min: 0,
        max: 50,
        step: 1,
        inputmode: 'numeric',
        group_basic: 'Homepage'
      }],
      ['annunci.labels.badge_text', {
        label: 'Etichetta contatto (testo)',
        help: 'Testo breve che appare vicino ai contatti, es. “Contattaci”.',
        placeholder: 'Es. Contattaci',
        group_basic: 'Contatti'
      }],
      ['annunci.labels.contact_phone', {
        label: 'Telefono contatto',
        help: 'Numero visibile nel sito. Usa formato internazionale se possibile.',
        placeholder: 'Es. +39 333 123 4567',
        format: 'tel',
        group_basic: 'Contatti'
      }],
      ['annunci.labels.contact_email', {
        label: 'Email contatto',
        help: 'Indirizzo visibile nel sito per richieste e informazioni.',
        placeholder: 'Es. info@tuodominio.it',
        format: 'email',
        group_basic: 'Contatti'
      }],
      ['annunci.labels.contact_whatsapp', {
        label: 'WhatsApp contatto',
        help: 'Numero WhatsApp visibile nel sito (formato internazionale consigliato).',
        placeholder: 'Es. +39 333 123 4567',
        format: 'tel',
        group_basic: 'Contatti'
      }],
      ['sito.brand.name', {
        label: 'Nome sito',
        help: 'Nome mostrato come titolo e usato come fallback nei meta.',
        placeholder: 'Es. Roulotte online',
        group_basic: 'Brand'
      }],
      ['sito.brand.tagline', {
        label: 'Tagline sito',
        help: 'Testo breve opzionale per descrivere il sito.',
        placeholder: 'Es. Vendita e trasporto roulotte',
        group_basic: 'Brand'
      }],
      ['sito.brand.logo_url', {
        label: 'Logo (URL)',
        help: 'URL immagine logo (se vuoi sostituire l’icona di default).',
        placeholder: 'https://…/logo.png',
        format: 'url',
        group_basic: 'Brand'
      }],
      ['sito.brand.favicon_url', {
        label: 'Favicon (URL)',
        help: 'URL immagine favicon (opzionale).',
        placeholder: 'https://…/favicon.ico',
        format: 'url',
        group_basic: 'Brand'
      }],
      ['sito.seo.default_title', {
        label: 'SEO: titolo predefinito',
        help: 'Titolo usato come base per le pagine (se impostato).',
        placeholder: 'Es. Roulotte online',
        group_basic: 'SEO'
      }],
      ['sito.seo.default_description', {
        label: 'SEO: descrizione predefinita',
        help: 'Descrizione usata come fallback nei meta.',
        placeholder: 'Descrizione breve del sito…',
        group_basic: 'SEO'
      }],
      ['sito.seo.og_image_url', {
        label: 'SEO: immagine Open Graph (URL)',
        help: 'Immagine predefinita per anteprime social (opzionale).',
        placeholder: 'https://…/og-image.jpg',
        format: 'url',
        group_basic: 'SEO'
      }],
      ['sito.seo.twitter_card', {
        label: 'SEO: Twitter card',
        help: 'Formato anteprima Twitter/X (se vuoi forzarlo).',
        group_basic: 'SEO',
        options: [
          { value: '', label: 'Auto' },
          { value: 'summary', label: 'Summary' },
          { value: 'summary_large_image', label: 'Summary large image' },
        ]
      }],
      ['sito.social.instagram_url', {
        label: 'Instagram (URL)',
        help: 'Link al profilo Instagram (opzionale).',
        placeholder: 'https://instagram.com/…',
        format: 'url',
        group_basic: 'Social'
      }],
      ['sito.social.facebook_url', {
        label: 'Facebook (URL)',
        help: 'Link alla pagina Facebook (opzionale).',
        placeholder: 'https://facebook.com/…',
        format: 'url',
        group_basic: 'Social'
      }],
      ['sito.social.youtube_url', {
        label: 'YouTube (URL)',
        help: 'Link al canale YouTube (opzionale).',
        placeholder: 'https://youtube.com/…',
        format: 'url',
        group_basic: 'Social'
      }],
      ['sito.social.tiktok_url', {
        label: 'TikTok (URL)',
        help: 'Link al profilo TikTok (opzionale).',
        placeholder: 'https://tiktok.com/@…',
        format: 'url',
        group_basic: 'Social'
      }],
      ['sito.legal.company_name', {
        label: 'Ragione sociale',
        help: 'Nome azienda (opzionale, per footer o pagine legali).',
        placeholder: 'Es. Azienda S.r.l.',
        group_basic: 'Dati aziendali'
      }],
      ['sito.legal.vat_number', {
        label: 'Partita IVA',
        help: 'Partita IVA (opzionale).',
        placeholder: 'Es. IT12345678901',
        group_basic: 'Dati aziendali'
      }],
      ['sito.legal.address', {
        label: 'Indirizzo',
        help: 'Indirizzo aziendale (opzionale).',
        placeholder: 'Es. Via Roma 1, 00100 Roma (RM)',
        group_basic: 'Dati aziendali'
      }],
      ['regole_tecniche.integrazioni.ai.enabled', {
        label: 'AI: attiva',
        help: 'Attiva l’AI server-side per analisi e riscrittura testi in admin.',
        group_basic: 'Integrazioni'
      }],
      ['regole_tecniche.integrazioni.ai.provider', {
        label: 'AI: provider',
        help: 'Provider compatibile OpenAI (OpenAI oppure OpenRouter).',
        group_basic: 'Integrazioni',
        options: [
          { value: 'openrouter', label: 'OpenRouter' },
          { value: 'openai', label: 'OpenAI / compatibile' },
        ]
      }],
      ['regole_tecniche.integrazioni.ai.base_url', {
        label: 'AI: base URL',
        help: 'Per OpenRouter usa https://openrouter.ai/api/v1. Per OpenAI lascia vuoto.',
        group_basic: 'Integrazioni',
        placeholder: 'https://openrouter.ai/api/v1'
      }],
      ['regole_tecniche.integrazioni.ai.api_key', {
        label: 'AI: API key',
        help: 'Chiave segreta usata dal backend per chiamare il provider.',
        group_basic: 'Integrazioni',
        placeholder: 'sk-…'
      }],
      ['regole_tecniche.integrazioni.ai.model', {
        label: 'AI: modello',
        help: 'Nome modello (OpenRouter es. meta-llama/…:free oppure openrouter/auto).',
        group_basic: 'Integrazioni',
        placeholder: 'meta-llama/…:free'
      }],
      ['regole_tecniche.integrazioni.ai.temperature', {
        label: 'AI: temperature',
        help: '0 = più precisa, 1 = più creativa.',
        group_basic: 'Integrazioni',
        placeholder: '0.2',
        min: 0,
        max: 2,
        step: 0.1,
        inputmode: 'decimal'
      }],
      ['regole_tecniche.integrazioni.photo_ai.upscale_url', {
        label: 'Foto AI: URL upscale',
        help: 'Endpoint del servizio foto AI (es. http://127.0.0.1:7861/upscale).',
        group_basic: 'Integrazioni',
        placeholder: 'http://127.0.0.1:7861/upscale'
      }],
      ['regole_tecniche.upload.photo_max_bytes', {
        label: 'Dimensione massima foto',
        help: 'Blocca il caricamento di foto oltre questa dimensione.',
        placeholder: 'Es. 10485760 (10 MB)',
        group_basic: 'Foto',
        unit: 'bytes'
      }],
      ['regole_tecniche.upload.photo_max_count_per_annuncio', {
        label: 'Numero massimo foto per annuncio',
        help: 'Limite per evitare schede troppo pesanti e lente.',
        placeholder: 'Es. 12',
        min: 1,
        max: 100,
        step: 1,
        inputmode: 'numeric',
        group_basic: 'Foto'
      }],
      ['regole_tecniche.upload.photo_allowed_mimetypes', {
        label: 'Formati foto consentiti',
        help: 'Lista separata da virgola. Se lasci vuoto, l’upload può fallire.',
        placeholder: 'Es. image/jpeg, image/png, image/webp',
        group_basic: 'Foto'
      }],
      ['regole_tecniche.cache.asset_max_age_seconds', {
        label: 'Cache di immagini e file (durata)',
        help: 'Quanto a lungo il browser mantiene i file statici prima di richiederli di nuovo.',
        placeholder: 'Es. 86400 (1 giorno)',
        min: 0,
        step: 1,
        inputmode: 'numeric',
        group_basic: 'Cache',
        unit: 'seconds'
      }],
      ['regole_tecniche.public.posthog_host', {
        label: 'PostHog: server',
        help: 'Indirizzo del server di tracciamento (es. PostHog Cloud o self-hosted).',
        placeholder: 'Es. https://app.posthog.com',
        format: 'url',
        group_basic: 'Tracking'
      }],
      ['regole_tecniche.public.posthog_key', {
        label: 'PostHog: chiave progetto',
        help: 'Abilita il tracciamento visitatori. Se lasci vuoto, il tracciamento resta disattivo.',
        placeholder: 'Es. phc_…',
        group_basic: 'Tracking'
      }],
      ['regole_tecniche.public.google_client_id', {
        label: 'Google: Client ID',
        help: 'Identificatore OAuth del progetto Google (usato solo se l’integrazione è attiva).',
        placeholder: 'Es. 123…apps.googleusercontent.com',
        group_basic: 'Tracking'
      }],
      ['regole_tecniche.integrazioni.render.deploy_hook_url', {
        label: 'Render: Deploy Hook URL',
        help: 'URL https di api.render.com per avviare il deploy. Usalo in alternativa ad API key + Service ID.',
        placeholder: 'https://api.render.com/deploy/srv-…',
        format: 'url',
        group_basic: 'Deploy'
      }],
      ['regole_tecniche.integrazioni.render.api_key', {
        label: 'Render: API key',
        help: 'Chiave API di Render per avviare il deploy via API.',
        placeholder: 'rvk-…',
        group_basic: 'Deploy'
      }],
      ['regole_tecniche.integrazioni.render.service_id', {
        label: 'Render: Service ID',
        help: 'ID del servizio web su Render (usato insieme alla API key).',
        placeholder: 'srv-…',
        group_basic: 'Deploy'
      }],
    ]);

    function csGetDefaultMode() {
      try {
        const v = String(localStorage.getItem(CS_MODE_STORAGE_KEY) || '').trim();
        if (v === CS_MODE_ADVANCED) return CS_MODE_ADVANCED;
      } catch {}
      return CS_MODE_BASIC;
    }

    function csGetDeep(obj, path) {
      if (!obj || typeof obj !== 'object') return undefined;
      const parts = String(path || '').split('.').filter(Boolean);
      if (!parts.length) return undefined;
      let cur = obj;
      for (const k of parts) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[k];
      }
      return cur;
    }

    function csGroupLabel(groupKey) {
      const k = String(groupKey || '').trim();
      if (k === 'sito') return 'Sito';
      if (k === 'trasporto') return 'Trasporto';
      if (k === 'annunci') return 'Annunci';
      if (k === 'regole_tecniche') return 'Regole tecniche';
      return k || 'Altro';
    }

    function csSectionKey(key) {
      const parts = String(key || '').split('.').filter(Boolean);
      if (parts.length < 2) return String(key || '');
      return parts.slice(0, 2).join('.');
    }

    function csSectionLabel(sectionKey) {
      const k = String(sectionKey || '').trim();
      if (k === 'sito.brand') return 'Brand';
      if (k === 'sito.seo') return 'SEO e social preview';
      if (k === 'sito.social') return 'Social';
      if (k === 'sito.legal') return 'Dati aziendali';
      if (k === 'regole_tecniche.upload') return 'Foto e caricamenti';
      if (k === 'regole_tecniche.cache') return 'Cache';
      if (k === 'regole_tecniche.public') return 'Dati pubblici e tracking';
      if (k === 'regole_tecniche.integrazioni') return 'Integrazioni (tecnico)';
      if (k === 'regole_tecniche.sicurezza') return 'Sicurezza (tecnico)';
      if (k === 'trasporto.routing') return 'Percorsi e routing (tecnico)';
      if (k === 'trasporto.pricing') return 'Prezzi trasporto (tecnico)';
      if (k === 'annunci.pubblicazione') return 'Pubblicazione annunci';
      if (k === 'annunci.homepage') return 'Homepage';
      if (k === 'annunci.listing') return 'Lista annunci';
      if (k === 'annunci.labels') return 'Etichette contatto';
      return k;
    }

    function csIsHiddenSection(sectionKey) {
      const k = String(sectionKey || '');
      return (
        k === 'regole_tecniche.integrazioni' ||
        k === 'regole_tecniche.sicurezza' ||
        k === 'trasporto.routing' ||
        k === 'trasporto.pricing'
      );
    }

    function csFormatBytes(n) {
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0) return '';
      const mb = v / (1024 * 1024);
      if (mb < 1024) return mb.toFixed(mb >= 10 ? 0 : 1) + ' MB';
      const gb = mb / 1024;
      return gb.toFixed(gb >= 10 ? 0 : 1) + ' GB';
    }

    function csFormatSeconds(n) {
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0) return '';
      if (v < 60) return `${Math.round(v)} s`;
      const m = v / 60;
      if (m < 60) return `${Math.round(m)} min`;
      const h = m / 60;
      if (h < 24) return `${Math.round(h)} h`;
      const d = h / 24;
      return `${Math.round(d)} gg`;
    }

    function csGetKeyMeta(key) {
      const k = String(key || '').trim();
      return CS_KEY_META.get(k) || null;
    }

    function csKeyLabel(key) {
      const meta = csGetKeyMeta(key);
      if (meta && meta.label) return String(meta.label);
      const parts = String(key || '').split('.').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : String(key || '');
    }

    function csKeyHelp(key, type, isSecret) {
      const meta = csGetKeyMeta(key);
      const bits = [];
      if (meta && meta.help) bits.push(String(meta.help));
      const suffix = (isSecret ? 'Segreto' : 'Pubblico') + ' · ' + String(type || 'string');
      bits.push(suffix);
      return bits.join(' ');
    }

    function csValueToInputString(type, value) {
      if (value === undefined || value === null) return '';
      if (type === 'string[]') {
        if (!Array.isArray(value)) return '';
        return value.map(x => String(x ?? '').trim()).filter(Boolean).join(', ');
      }
      if (type === 'boolean') return value === true ? 'true' : value === false ? 'false' : '';
      return String(value);
    }

    function csParseInputValue(type, el) {
      if (!el) return undefined;
      if (type === 'boolean') {
        const v = String(el.value || '');
        if (v === '') return '';
        if (v === 'true') return true;
        if (v === 'false') return false;
        return undefined;
      }
      if (type === 'number') {
        const raw = String(el.value || '').trim();
        if (!raw) return '';
        const n = Number(raw);
        if (!Number.isFinite(n)) return undefined;
        return n;
      }
      if (type === 'string[]') {
        const raw = String(el.value || '').trim();
        if (!raw) return '';
        return raw.split(',').map(x => String(x ?? '').trim()).filter(Boolean);
      }
      return String(el.value ?? '');
    }

    function csCanonical(type, value) {
      if (value === undefined) return '__undefined__';
      if (value === '') return '__empty__';
      if (type === 'string[]') {
        const arr = Array.isArray(value) ? value.map(x => String(x ?? '').trim()).filter(Boolean) : [];
        return 'list:' + JSON.stringify(arr);
      }
      if (type === 'number') return 'num:' + String(value);
      if (type === 'boolean') return 'bool:' + String(value);
      return 'str:' + String(value);
    }

    function csSetMsg(text, ok) {
      if (!centralSettingsPanel || !centralSettingsPanel.msgEl) return;
      const t = String(text || '').trim();
      if (!t) {
        centralSettingsPanel.msgEl.hidden = true;
        centralSettingsPanel.msgEl.textContent = '';
        return;
      }
      centralSettingsPanel.msgEl.hidden = false;
      centralSettingsPanel.msgEl.className = ok ? 'error ok' : 'error';
      centralSettingsPanel.msgEl.textContent = t;
    }

    function csEnsurePanelUi() {
      if (centralSettingsPanel) return centralSettingsPanel;
      const grid = document.querySelector('#settings .grid');
      if (!grid) return null;

      const card = document.createElement('div');
      card.className = 'card span-12';
      card.classList.add('cs-panel');

      const header = document.createElement('div');
      header.classList.add('cs-panel-head');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'flex-start';
      header.style.gap = '12px';
      header.style.flexWrap = 'wrap';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.classList.add('cs-title');
      title.style.fontWeight = '900';
      title.style.fontSize = '1.05rem';
      title.textContent = 'Configurazione centrale';
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.style.marginTop = '6px';
      hint.textContent = 'Gestisci i parametri del sito (trasporto, annunci, regole tecniche).';
      const modeBadge = document.createElement('span');
      modeBadge.className = 'cs-mode-badge';
      modeBadge.style.marginTop = '6px';
      left.appendChild(title);
      left.appendChild(hint);
      left.appendChild(modeBadge);

      const actions = document.createElement('div');
      actions.className = 'row-actions';
      actions.style.justifyContent = 'flex-start';
      actions.style.alignItems = 'center';
      actions.style.flexWrap = 'wrap';

      const modeWrap = document.createElement('div');
      modeWrap.style.display = 'flex';
      modeWrap.style.alignItems = 'center';
      modeWrap.style.gap = '8px';

      const modeLabel = document.createElement('div');
      modeLabel.className = 'hint';
      modeLabel.style.margin = '0';
      modeLabel.textContent = 'Modalità';

      const modeSel = document.createElement('select');
      modeSel.className = 'btn';
      modeSel.style.padding = '8px 10px';
      modeSel.innerHTML = '<option value="basic">Base (consigliata)</option><option value="advanced">Avanzata (tecnica)</option>';
      modeSel.value = csGetDefaultMode();

      modeWrap.appendChild(modeLabel);
      modeWrap.appendChild(modeSel);

      const reloadBtn = document.createElement('button');
      reloadBtn.className = 'btn';
      reloadBtn.type = 'button';
      reloadBtn.textContent = 'Ricarica';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.type = 'button';
      saveBtn.textContent = 'Salva';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn';
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Annulla modifiche';
      
      const changesEl = document.createElement('div');
      changesEl.className = 'hint cs-changes';
      changesEl.style.marginTop = '6px';
      changesEl.textContent = 'Nessuna modifica';

      actions.appendChild(modeWrap);
      actions.appendChild(changesEl);
      actions.appendChild(reloadBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);

      header.appendChild(left);
      header.appendChild(actions);

      const meta = document.createElement('div');
      meta.className = 'hint';
      meta.style.marginTop = '8px';

      const msg = document.createElement('div');
      msg.className = 'error';
      msg.hidden = true;
      msg.style.marginTop = '10px';

      const groups = document.createElement('div');
      groups.classList.add('cs-groups');
      groups.style.marginTop = '12px';
      groups.style.display = 'grid';
      groups.style.gap = '10px';

      card.appendChild(header);
      card.appendChild(meta);
      card.appendChild(msg);
      card.appendChild(groups);

      grid.insertBefore(card, grid.firstChild);

      centralSettingsPanel = {
        card,
        metaEl: meta,
        msgEl: msg,
        groupsEl: groups,
        modeEl: modeSel,
        mode: modeSel.value === CS_MODE_ADVANCED ? CS_MODE_ADVANCED : CS_MODE_BASIC,
        reloadBtn,
        saveBtn,
        changesEl,
        modeBadgeEl: modeBadge,
        titleEl: title,
        cancelBtn,
        loaded: false,
        role: '',
        defs: [],
        settings: {},
        secretsSet: new Set(),
        snapshot: new Map(),
      };

      modeSel.addEventListener('change', () => {
        const p = centralSettingsPanel;
        if (!p) return;
        const v = modeSel.value === CS_MODE_ADVANCED ? CS_MODE_ADVANCED : CS_MODE_BASIC;
        p.mode = v;
        try { localStorage.setItem(CS_MODE_STORAGE_KEY, v); } catch {}
        try { csRenderPanel(); } catch {}
        try { csSetModeBadge(); } catch {}
      });
      return centralSettingsPanel;
    }

    function csSetModeBadge() {
      const p = centralSettingsPanel;
      if (!p || !p.modeBadgeEl) return;
      const adv = String(p.mode || CS_MODE_BASIC) === CS_MODE_ADVANCED;
      p.modeBadgeEl.textContent = adv ? 'Modalità: Avanzata' : 'Modalità: Base';
      p.modeBadgeEl.classList.toggle('is-adv', adv);
      if (p.card) p.card.classList.toggle('is-adv', adv);
      if (p.titleEl) p.titleEl.classList.toggle('is-adv', adv);
    }

    function csUpdateChangesCount() {
      const p = centralSettingsPanel;
      if (!p || !p.changesEl || !p.card) return;
      const inputs = Array.from(p.card.querySelectorAll('[data-cs-key]'));
      let changed = 0;
      for (const el of inputs) {
        if (!el || el.disabled) continue;
        const key = String(el.getAttribute('data-cs-key') || '').trim();
        const type = String(el.getAttribute('data-cs-type') || 'string').trim();
        const isSecret = String(el.getAttribute('data-cs-secret') || '') === '1';
        if (!key) continue;
        if (isSecret) {
          const raw = String(el.value || '').trim();
          const isDirty = !!raw;
          if (isDirty) changed++;
          el.classList.toggle('is-dirty', isDirty);
          continue;
        }
        const val = csParseInputValue(type, el);
        if (val === undefined) continue;
        const snap = p.snapshot.get(key) || '__undefined__';
        const can = csCanonical(type, val);
        const isDirty = can !== snap;
        if (isDirty) changed++;
        el.classList.toggle('is-dirty', isDirty);
      }
      p.changesEl.textContent = changed ? ('Modifiche: ' + changed) : 'Nessuna modifica';
      p.changesEl.classList.toggle('is-dirty', changed > 0);
      if (p.saveBtn) p.saveBtn.disabled = changed === 0;
      if (p.saveBtn) p.saveBtn.classList.toggle('pulse', changed > 0);
      const groups = Array.from(p.card.querySelectorAll('.cs-group'));
      groups.forEach(g => {
        const has = !!g.querySelector('[data-cs-key].is-dirty');
        g.classList.toggle('has-dirty', has);
      });
      const subs = Array.from(p.card.querySelectorAll('.cs-subgroup'));
      subs.forEach(g => {
        const has = !!g.querySelector('[data-cs-key].is-dirty');
        g.classList.toggle('has-dirty', has);
      });
    }

    function csCancelChanges() {
      const p = centralSettingsPanel;
      if (!p || !p.card) return;
      const inputs = Array.from(p.card.querySelectorAll('[data-cs-key]'));
      for (const el of inputs) {
        const key = String(el.getAttribute('data-cs-key') || '').trim();
        const type = String(el.getAttribute('data-cs-type') || 'string').trim();
        const isSecret = String(el.getAttribute('data-cs-secret') || '') === '1';
        if (!key) continue;
        if (isSecret) {
          el.value = '';
          el.classList.remove('is-dirty');
          continue;
        }
        const v = csGetDeep(p.settings, key);
        el.value = csValueToInputString(type, v);
        el.classList.remove('is-dirty');
      }
      csUpdateChangesCount();
      csSetMsg('Modifiche annullate.', true);
      try { showToast('info', 'Impostazioni', 'Modifiche annullate.', { timeoutMs: 1600 }); } catch {}
    }
    function csBuildInput(def, p, isSuperuser) {
      const key = String(def && def.key || '').trim();
      const type = String(def && def.type || 'string').trim();
      const isSecret = def && def.is_secret === true;
      const meta = csGetKeyMeta(key);

      let input = null;
      if (type === 'boolean') {
        const sel = document.createElement('select');
        sel.innerHTML = '<option value="">Non impostato</option><option value="true">Sì</option><option value="false">No</option>';
        input = sel;
      } else if (type === 'string[]') {
        const ta = document.createElement('textarea');
        ta.rows = 2;
        ta.placeholder = meta && meta.placeholder ? String(meta.placeholder) : 'Valori separati da virgola';
        input = ta;
      } else if (type === 'string' && meta && Array.isArray(meta.options) && meta.options.length) {
        const sel = document.createElement('select');
        sel.innerHTML = '<option value="">Non impostato</option>' + meta.options.map(o => {
          const v = String(o && o.value !== undefined ? o.value : '');
          const l = String(o && o.label !== undefined ? o.label : v);
          return `<option value="${v.replace(/"/g, '&quot;')}">${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
        }).join('');
        input = sel;
      } else {
        const inp = document.createElement('input');
        if (type === 'number') {
          inp.type = 'number';
          inp.step = meta && meta.step !== undefined ? String(meta.step) : 'any';
        } else {
          if (isSecret) inp.type = 'password';
          else if (meta && meta.format === 'email') inp.type = 'email';
          else if (meta && meta.format === 'url') inp.type = 'url';
          else if (meta && meta.format === 'tel') inp.type = 'tel';
          else inp.type = 'text';
        }
        if (meta && meta.placeholder) inp.placeholder = String(meta.placeholder);
        if (meta && meta.min !== undefined) inp.min = String(meta.min);
        if (meta && meta.max !== undefined) inp.max = String(meta.max);
        if (meta && meta.inputmode) inp.inputMode = String(meta.inputmode);
        input = inp;
      }

      input.classList.add('cs-input');
      input.setAttribute('data-cs-key', key);
      input.setAttribute('data-cs-type', type);
      input.setAttribute('data-cs-secret', isSecret ? '1' : '0');

      const right = document.createElement('div');
      right.className = 'field';
      right.classList.add('cs-input-wrap');
      right.style.display = 'grid';
      right.style.gap = '4px';
      right.appendChild(input);

      const extra = document.createElement('div');
      extra.className = 'hint';
      extra.style.marginTop = '2px';
      extra.hidden = true;
      right.appendChild(extra);

      const setExtra = () => {
        const raw = String(input.value || '').trim();
        if (!raw) { extra.hidden = true; extra.textContent = ''; return; }
        if (meta && meta.unit === 'bytes' && type === 'number') {
          const pretty = csFormatBytes(Number(raw));
          if (pretty) { extra.hidden = false; extra.textContent = `≈ ${pretty}`; return; }
        }
        if (meta && meta.unit === 'seconds' && type === 'number') {
          const pretty = csFormatSeconds(Number(raw));
          if (pretty) { extra.hidden = false; extra.textContent = `≈ ${pretty}`; return; }
        }
        extra.hidden = true;
        extra.textContent = '';
      };

      input.addEventListener('input', setExtra);
      input.addEventListener('change', setExtra);
      input.addEventListener('input', () => { try { csUpdateChangesCount(); } catch {} });
      input.addEventListener('change', () => { try { csUpdateChangesCount(); } catch {} });

      if (isSecret && !isSuperuser) {
        input.disabled = true;
        if (input && input.tagName === 'INPUT') {
          input.placeholder = p && p.secretsSet && p.secretsSet.has(key) ? 'Impostato (nascosto)' : 'Non impostato';
        } else if (input && input.tagName === 'SELECT') {
          input.innerHTML = `<option value="">${(p && p.secretsSet && p.secretsSet.has(key)) ? 'Impostato (nascosto)' : 'Non impostato'}</option>`;
        }
      } else {
        const v = csGetDeep(p.settings, key);
        input.value = csValueToInputString(type, v);
        setExtra();
      }

      return { right, input, setExtra, type, isSecret, key };
    }

    function csRenderPanel() {
      const p = centralSettingsPanel;
      if (!p) return;

      const defs = Array.isArray(p.defs) ? p.defs : [];
      const allowedPrefixes = ['sito.', 'trasporto.', 'annunci.', 'regole_tecniche.'];
      const allVisible = defs
        .filter(d => d && typeof d === 'object' && allowedPrefixes.some(pref => String(d.key || '').startsWith(pref)))
        .sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')));

      p.groupsEl.innerHTML = '';
      p.snapshot.clear();

      const isSuperuser = String(p.role || '') === 'superuser';
      const mode = String(p.mode || CS_MODE_BASIC);
      if (p.metaEl) {
        p.metaEl.textContent = mode === CS_MODE_ADVANCED
          ? 'Modalità avanzata: modifica solo se sai cosa stai facendo. Le impostazioni tecniche possono cambiare il comportamento del sito.'
          : 'Modalità base: impostazioni consigliate per un uso normale.';
      }
      if (mode === CS_MODE_BASIC) {
        const defsBasic = allVisible.filter(d => CS_BASIC_KEYS.has(String(d.key || '').trim()));
        const byBasicGroup = new Map();
        for (const def of defsBasic) {
          const key = String(def.key || '').trim();
          const meta = csGetKeyMeta(key);
          const g = meta && meta.group_basic ? String(meta.group_basic) : 'Altro';
          if (!byBasicGroup.has(g)) byBasicGroup.set(g, []);
          byBasicGroup.get(g).push(def);
        }

        for (const [g, defsInGroup] of Array.from(byBasicGroup.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
          const details = document.createElement('details');
          details.classList.add('cs-group');
          details.open = true;
          details.style.border = '1px solid var(--border)';
          details.style.borderRadius = '14px';
          details.style.padding = '10px 12px';
          details.style.background = 'rgba(255,255,255,.35)';

          const summary = document.createElement('summary');
          summary.classList.add('cs-group-summary');
          summary.style.cursor = 'pointer';
          summary.style.fontWeight = '900';
          summary.textContent = g;
          details.appendChild(summary);

          const body = document.createElement('div');
          body.classList.add('cs-group-body');
          body.style.marginTop = '10px';
          body.style.display = 'grid';
          body.style.gap = '10px';

          for (const def of defsInGroup.sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))) {
            const key = String(def.key || '').trim();
            const type = String(def.type || 'string').trim();
            const isSecret = def.is_secret === true;

            const row = document.createElement('div');
            row.classList.add('cs-row');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = 'minmax(260px, 2fr) minmax(240px, 1fr)';
            row.style.gap = '10px';
            row.style.alignItems = 'end';

            const left = document.createElement('div');
            left.className = 'field';
            left.classList.add('cs-row-left');

            const label = document.createElement('label');
            label.textContent = csKeyLabel(key);
            left.appendChild(label);

            const help = document.createElement('div');
            help.className = 'hint';
            help.classList.add('cs-help');
            help.style.marginTop = '4px';
            help.textContent = csKeyHelp(key, type, isSecret);
            left.appendChild(help);

            const keyHint = document.createElement('div');
            keyHint.className = 'hint';
            keyHint.classList.add('cs-key');
            keyHint.style.marginTop = '2px';
            keyHint.textContent = `Chiave: ${key}`;
            left.appendChild(keyHint);

            const built = csBuildInput(def, p, isSuperuser);
            built.right.classList.add('cs-row-right');

            const currentValueForSnap = built.isSecret ? '' : csGetDeep(p.settings, key);
            p.snapshot.set(key, csCanonical(type, currentValueForSnap));

            row.appendChild(left);
            row.appendChild(built.right);
            body.appendChild(row);
          }

          details.appendChild(body);
          p.groupsEl.appendChild(details);
        }
        return;
      }

      const byGroup = new Map();
      for (const def of allVisible) {
        const key = String(def.key || '');
        const groupKey = key.split('.')[0] || '';
        if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
        byGroup.get(groupKey).push(def);
      }

      for (const [groupKey, defsInGroup] of Array.from(byGroup.entries()).sort((a, b) => String(a[0] || '').localeCompare(String(b[0] || '')))) {
        const details = document.createElement('details');
        details.classList.add('cs-group');
        details.open = true;
        details.style.border = '1px solid var(--border)';
        details.style.borderRadius = '14px';
        details.style.padding = '10px 12px';
        details.style.background = 'rgba(255,255,255,.35)';

        const summary = document.createElement('summary');
        summary.classList.add('cs-group-summary');
        summary.style.cursor = 'pointer';
        summary.style.fontWeight = '900';
        summary.textContent = csGroupLabel(groupKey);
        details.appendChild(summary);

        const sections = new Map();
        for (const def of defsInGroup) {
          const k = String(def && def.key || '').trim();
          const sec = csSectionKey(k);
          if (!sections.has(sec)) sections.set(sec, []);
          sections.get(sec).push(def);
        }

        const body = document.createElement('div');
        body.classList.add('cs-group-body');
        body.style.marginTop = '10px';
        body.style.display = 'grid';
        body.style.gap = '10px';

        for (const [secKey, defsInSection] of Array.from(sections.entries()).sort((a, b) => String(a[0] || '').localeCompare(String(b[0] || '')))) {
          const secDetails = document.createElement('details');
          secDetails.classList.add('cs-subgroup');
          secDetails.open = !csIsHiddenSection(secKey);
          secDetails.style.border = '1px solid var(--border)';
          secDetails.style.borderRadius = '12px';
          secDetails.style.padding = '10px 12px';
          secDetails.style.background = 'rgba(255,255,255,.25)';

          const secSummary = document.createElement('summary');
          secSummary.classList.add('cs-subgroup-summary');
          secSummary.style.cursor = 'pointer';
          secSummary.style.fontWeight = '900';
          secSummary.textContent = csSectionLabel(secKey);
          secDetails.appendChild(secSummary);

          const secBody = document.createElement('div');
          secBody.classList.add('cs-subgroup-body');
          secBody.style.marginTop = '10px';
          secBody.style.display = 'grid';
          secBody.style.gap = '10px';

          for (const def of defsInSection.sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))) {
            const key = String(def.key || '').trim();
            const type = String(def.type || 'string').trim();
            const isSecret = def.is_secret === true;

            const row = document.createElement('div');
            row.classList.add('cs-row');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = 'minmax(260px, 2fr) minmax(240px, 1fr)';
            row.style.gap = '10px';
            row.style.alignItems = 'end';

            const left = document.createElement('div');
            left.className = 'field';
            left.classList.add('cs-row-left');

            const label = document.createElement('label');
            label.textContent = csKeyLabel(key);
            left.appendChild(label);

            const help = document.createElement('div');
            help.className = 'hint';
            help.classList.add('cs-help');
            help.style.marginTop = '4px';
            help.textContent = csKeyHelp(key, type, isSecret);
            left.appendChild(help);

            const keyHint = document.createElement('div');
            keyHint.className = 'hint';
            keyHint.classList.add('cs-key');
            keyHint.style.marginTop = '2px';
            keyHint.textContent = `Chiave: ${key}`;
            left.appendChild(keyHint);

            const built = csBuildInput(def, p, isSuperuser);
            built.right.classList.add('cs-row-right');

            const currentValueForSnap = built.isSecret ? '' : csGetDeep(p.settings, key);
            p.snapshot.set(key, csCanonical(type, currentValueForSnap));

            row.appendChild(left);
            row.appendChild(built.right);
            secBody.appendChild(row);
          }

          secDetails.appendChild(secBody);
          body.appendChild(secDetails);
        }

        details.appendChild(body);
        p.groupsEl.appendChild(details);
      }
      try { csUpdateChangesCount(); } catch {}
      try { csSetModeBadge(); } catch {}
    }

    async function csLoadSettings() {
      const p = csEnsurePanelUi();
      if (!p) return;
      csSetMsg('', true);
      p.metaEl.textContent = 'Caricamento…';
      p.reloadBtn.disabled = true;
      p.saveBtn.disabled = true;

      try {
        try { adminWhoami = await fetchWhoami(); } catch { adminWhoami = { user: '', role: '' }; }
        p.role = String(adminWhoami && adminWhoami.role || '');

        const token = window.RoulotteStore.getAuthToken();
        if (!token) { logout(); return; }
        const includeSecrets = String(p.role || '') === 'superuser';
        const r = await fetch(apiUrl('/api/settings' + (includeSecrets ? '?include_secrets=1' : '')), { headers: { 'Authorization': 'Bearer ' + token } });
        if (r.status === 401) { logout(); return; }
        if (r.status === 403) { csSetMsg('Non autorizzato.', false); return; }
        if (r.status === 404) { csSetMsg('Funzione non disponibile: backend non aggiornato (endpoint /api/settings mancante). Avvia un deploy su Render e riprova.', false); return; }
        if (!r.ok) { csSetMsg('Errore durante il caricamento delle impostazioni.', false); return; }
        const j = await r.json().catch(() => ({}));
        p.defs = Array.isArray(j && j.defs) ? j.defs : [];
        p.settings = (j && j.settings && typeof j.settings === 'object') ? j.settings : {};
        const secretsArr = Array.isArray(j && j.secrets_set) ? j.secrets_set : [];
        p.secretsSet = new Set(secretsArr.map(x => String(x || '').trim()).filter(Boolean));
        const updatedAt = String(j && j.updated_at || '').trim();
        const roleLabel = p.role ? `Ruolo: ${p.role}` : 'Ruolo: —';
        const updatedLabel = updatedAt ? `Ultimo aggiornamento: ${updatedAt}` : 'Ultimo aggiornamento: —';
        p.metaEl.textContent = `${roleLabel} · ${updatedLabel}`;
        csRenderPanel();
        p.loaded = true;
        try { csSetModeBadge(); } catch {}
        try { csUpdateChangesCount(); } catch {}
      } catch {
        csSetMsg('Errore di rete durante il caricamento delle impostazioni.', false);
        if (p.metaEl) p.metaEl.textContent = '';
      } finally {
        p.reloadBtn.disabled = false;
        p.saveBtn.disabled = false;
      }
    }

    async function csSaveSettings() {
      const p = csEnsurePanelUi();
      if (!p) return;
      csSetMsg('', true);
      p.saveBtn.disabled = true;
      try {
        const token = window.RoulotteStore.getAuthToken();
        if (!token) { logout(); return; }

        const inputs = Array.from(p.card.querySelectorAll('[data-cs-key]'));
        const payload = {};
        const errors = [];
        for (const el of inputs) {
          const key = String(el.getAttribute('data-cs-key') || '').trim();
          const type = String(el.getAttribute('data-cs-type') || 'string').trim();
          const isSecret = String(el.getAttribute('data-cs-secret') || '') === '1';
          if (!key) continue;
          if (el.disabled) continue;

          const value = csParseInputValue(type, el);
          if (value === undefined) { errors.push(key); continue; }
          if (isSecret) {
            const raw = String(el.value || '').trim();
            if (!raw) continue;
          }

          const snap = p.snapshot.get(key) || '__undefined__';
          const can = csCanonical(type, isSecret ? '' : value);
          if (!isSecret && can === snap) continue;
          if (isSecret) payload[key] = String(el.value || '');
          else payload[key] = value;
        }

        if (errors.length) {
          csSetMsg('Valori non validi: ' + errors.join(', '), false);
          return;
        }

        const keys = Object.keys(payload);
        if (!keys.length) {
          csSetMsg('Nessuna modifica da salvare.', true);
          return;
        }

        const r = await fetch(apiUrl('/api/settings'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ settings: payload })
        });
        if (r.status === 401) { logout(); return; }
        if (r.status === 404) { csSetMsg('Funzione non disponibile: backend non aggiornato (endpoint /api/settings mancante). Avvia un deploy su Render e riprova.', false); return; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (j && j.errors && typeof j.errors === 'object') {
            const pairs = Object.entries(j.errors).map(([k, v]) => `${k}: ${v}`);
            csSetMsg('Errore validazione: ' + pairs.join(' · '), false);
            return;
          }
          csSetMsg('Errore durante il salvataggio.', false);
          return;
        }
        csSetMsg('Impostazioni salvate.', true);
        try { showToast('success', 'Impostazioni', 'Impostazioni salvate.', { timeoutMs: 1800 }); } catch {}
        await csLoadSettings();
      } catch {
        csSetMsg('Errore di rete durante il salvataggio.', false);
        try { showToast('error', 'Impostazioni', 'Errore di rete durante il salvataggio.', { timeoutMs: 2600 }); } catch {}
      } finally {
        p.saveBtn.disabled = false;
      }
    }

    async function ensureCentralSettingsPanel() {
      const p = csEnsurePanelUi();
      if (!p) return;
      if (!p.reloadBtn._csBound) {
        p.reloadBtn._csBound = true;
        p.reloadBtn.addEventListener('click', () => { csLoadSettings(); });
      }
      if (!p.saveBtn._csBound) {
        p.saveBtn._csBound = true;
        p.saveBtn.addEventListener('click', () => { csSaveSettings(); });
      }
      if (p.cancelBtn && !p.cancelBtn._csBound) {
        p.cancelBtn._csBound = true;
        p.cancelBtn.addEventListener('click', () => { csCancelChanges(); });
      }
      if (!p.loaded) await csLoadSettings();
    }
    (function(){
      const settingsSection = document.getElementById('settings');
      if (settingsSection) {
        const deployWrap = document.createElement('div');
        deployWrap.style.marginTop = '10px';
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Aggiorna sito (Render)';
        const msg = document.createElement('div');
        msg.className = 'hint';
        msg.style.marginTop = '6px';
        msg.hidden = true;
        btn.addEventListener('click', async () => {
          msg.hidden = false;
          msg.style.color = 'var(--muted)';
          msg.textContent = 'Richiesta di aggiornamento inviata…';
          btn.disabled = true;
          try {
            const token = window.RoulotteStore.getAuthToken();
            const r = await fetch(apiUrl('/api/deploy/trigger'), { method: 'POST', headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
            if (r.ok) {
              msg.textContent = 'Aggiornamento avviato su Render. Il sito sarà aggiornato in pochi minuti.';
              msg.style.color = 'var(--success)';
            } else {
              msg.style.color = 'var(--danger)';
              try {
                const j = await r.json();
                let base = 'Errore aggiornamento: ' + (j && j.error ? j.error : r.status);
                const detail = j && j.detail ? String(j.detail) : '';
                if (detail) base += ' (' + detail.slice(0, 220) + ')';
                const needOneOf = j && Array.isArray(j.need_one_of) ? j.need_one_of : null;
                if (j && j.error === 'RENDER_CONFIG' && needOneOf) {
                  base = 'Errore aggiornamento: RENDER_CONFIG — imposta Deploy Hook URL oppure API key + Service ID';
                  const haveObj = j && j.have && typeof j.have === 'object' ? j.have : null;
                  if (haveObj) {
                    const have = Object.entries(haveObj).filter(e => e && e[1]).map(e => String(e[0] || '')).filter(Boolean);
                    if (have.length) base += ' (configurato: ' + have.join(', ') + ')';
                  }
                } else {
                  const missingObj = j && j.missing && typeof j.missing === 'object' ? j.missing : null;
                  if (missingObj) {
                    const missing = Object.entries(missingObj).filter(e => e && e[1]).map(e => String(e[0] || '')).filter(Boolean);
                    if (missing.length) base += ' — manca: ' + missing.join(', ');
                  }
                }
                msg.textContent = base;
              } catch {
                msg.textContent = 'Errore aggiornamento.';
              }
            }
          } catch {
            msg.style.color = 'var(--danger)';
            msg.textContent = 'Errore di rete.';
          } finally {
            setTimeout(() => btn.disabled = false, 2000);
          }
        });
        const exportBtn2 = document.createElement('button');
        exportBtn2.className = 'btn';
        exportBtn2.textContent = 'Esporta dati (JSON)';
        exportBtn2.style.marginLeft = '8px';
        exportBtn2.addEventListener('click', async () => {
          try {
            const token = window.RoulotteStore.getAuthToken();
            const r = await fetch(apiUrl('/api/export'), { headers: { 'Authorization': token ? ('Bearer ' + token) : '' } });
            if (!r.ok) { alert('Errore esportazione: ' + r.status); return; }
            const data = await r.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'roulotte_export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch {
            alert('Errore di rete durante esportazione.');
          }
        });
        deployWrap.appendChild(btn);
        deployWrap.appendChild(exportBtn2);
        deployWrap.appendChild(msg);
        settingsSection.appendChild(deployWrap);
      }
    })();

    // --- Elenco ---
    function statusClass(stato) {
      if (stato === 'Da sistemare') return 'status warn';
      if (stato === 'Buono') return 'status ok';
      if (stato === 'Venduto') return 'status danger';
      return 'status ok';
    }

    function updateShareSelectionUi() {
      if (shareSelCountEl) {
        const n = selectedShareIds.size;
        shareSelCountEl.textContent = n ? (n + ' selezionate') : 'Nessuna selezione';
      }
      if (shareCreateBtn) shareCreateBtn.disabled = selectedShareIds.size === 0;
      if (shareClearSelBtn) shareClearSelBtn.disabled = selectedShareIds.size === 0;
    }

    function renderList() {
      const db = window.RoulotteStore.getDB();
      const items = db.roulottes || [];
      const categoriesById = Object.fromEntries((db.categories || []).map(c => [c.id, c.name]));
      const q = normalize(listQ.value);
      const category = listCategory ? listCategory.value : '';
      const stato = listStato.value;
      const annuncio = listAnnuncio ? String(listAnnuncio.value || '').trim() : '';
      
      const filtered = items.filter(r => {
          const hay = [r.id, r.marca, r.modello, r.anno, r.stato].map(normalize).join(' ');
          return q ? hay.includes(q) : true;
        })
        .filter(r => (category ? r.categoryId === category : true))
        .filter(r => (stato ? r.stato === stato : true))
        .filter(r => (annuncio ? String(r.stato_annuncio || '').trim().toLowerCase() === annuncio.toLowerCase() : true))
        .filter(r => (listFilterMissingPhotos ? !(Array.isArray(r.photos) && r.photos.length) : true))
        .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

      listMeta.textContent = `${filtered.length} risultati su ${items.length}`;
      tableBody.innerHTML = '';
      updateShareSelectionUi();
      
      filtered.forEach(r => {
        const safeId = escapeHtmlText(String(r.id || ''));
        const safeBrand = escapeHtmlText(String(r.marca || ''));
        const safeModel = escapeHtmlText(String(r.modello || ''));
        const safeTitle = escapeHtmlText(`${String(r.marca || '')} ${String(r.modello || '')}`.trim() || '—');
        const categoryLabel = escapeHtmlText(String(categoriesById[r.categoryId] || '—'));
        const safeYear = escapeHtmlText(String(r.anno || '—'));
        const safeState = escapeHtmlText(String(r.stato || '—'));
        const safeAnnuncio = escapeHtmlText(String(r.stato_annuncio || '—'));
        const firstPhoto = Array.isArray(r.photos) ? r.photos[0] : null;
        const thumbUrl = (firstPhoto && typeof firstPhoto === 'object')
          ? String(firstPhoto.thumb || firstPhoto.url_thumb || firstPhoto.urlThumb || firstPhoto.src || firstPhoto.url_full || firstPhoto.urlFull || '')
          : '';
        const safeThumbUrl = escapeHtmlText(thumbUrl);
        const tr = document.createElement('tr');
        const isChecked = selectedShareIds.has(String(r.id || '').trim());
        tr.innerHTML = `
          <td style="width:52px">
            <input class="share-select" type="checkbox" data-id="${safeId}" ${isChecked ? 'checked' : ''} aria-label="Seleziona ${safeId}" />
          </td>
          <td style="width:74px">
            ${thumbUrl ? `<img class="list-thumb action-btn" data-action="view" data-id="${safeId}" src="${safeThumbUrl}" alt="${safeTitle}" loading="lazy" />` : `<div class="list-thumb list-thumb-empty">—</div>`}
          </td>
          <td>
            <div class="action-btn list-cell" data-action="view" data-id="${safeId}" title="Apri scheda" style="cursor:pointer;display:grid;gap:2px">
              <div class="list-row">
                <div class="list-title">${safeTitle}</div>
                <div class="list-id">${safeId}</div>
              </div>
              <div class="list-meta">${categoryLabel}</div>
            </div>
          </td>
          <td>${safeYear}</td>
          <td>${formatPrice(r.prezzo)}</td>
          <td><span class="${statusClass(String(r.stato || ''))}">${safeState}</span></td>
          <td>${safeAnnuncio}</td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn action-btn" style="padding:6px 10px;font-size:0.8rem" data-action="view" data-id="${safeId}">Dettaglio</button>
              <button class="btn action-btn" style="padding:6px 10px;font-size:0.8rem" data-action="edit" data-id="${safeId}">Modifica</button>
              <button class="btn action-btn" style="padding:6px 10px;font-size:0.8rem" data-action="duplicate" data-id="${safeId}">Duplica</button>
              <button class="btn action-btn" style="padding:6px 10px;font-size:0.8rem" data-action="sold" data-id="${safeId}">Venduto</button>
              <button class="btn btn-danger action-btn" style="padding:6px 10px;font-size:0.8rem" data-action="delete" data-id="${safeId}">Elimina</button>
            </div>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }
    if (listReset) listReset.addEventListener('click', () => { listFilterMissingPhotos = false; });

    function renderCharts() {
      const db = window.RoulotteStore.getDB();
      const items = (db.roulottes || []).filter(r => r.stato !== 'Venduto');
      const cats = db.categories || [];
      const byCat = new Map(cats.map(c => [c.id, { name: c.name, value: 0 }]));
      items.forEach(r => {
        const id = r.categoryId || '';
        const rec = byCat.get(id);
        if (rec) rec.value += (Number(r.prezzo) || 0);
      });
      const maxVal = Math.max(1, ...Array.from(byCat.values()).map(x => x.value));
      const wrapCat = document.getElementById('chartPriceByCat');
      if (wrapCat) {
        wrapCat.innerHTML = '';
        byCat.forEach(({ name, value }) => {
          const barWrap = document.createElement('div');
          barWrap.style.display = 'grid';
          barWrap.style.gridTemplateColumns = '180px 1fr auto';
          barWrap.style.gap = '10px';
          const label = document.createElement('div');
          label.textContent = name || '—';
          const bar = document.createElement('div');
          bar.style.height = '12px';
          bar.style.alignSelf = 'center';
          bar.style.background = 'linear-gradient(90deg, var(--primary), var(--accent))';
          bar.style.width = `${Math.round((value / maxVal) * 100)}%`;
          const val = document.createElement('div');
          val.textContent = formatPrice(value);
          wrapCat.appendChild(barWrap);
          barWrap.appendChild(label);
          barWrap.appendChild(bar);
          barWrap.appendChild(val);
        });
      }
      const byYear = new Map();
      items.forEach(r => {
        const y = Number(r.anno || 0);
        if (!Number.isFinite(y) || !y) return;
        byYear.set(y, (byYear.get(y) || 0) + 1);
      });
      const years = Array.from(byYear.keys()).sort((a,b)=>a-b);
      const maxCount = Math.max(1, ...Array.from(byYear.values()));
      const wrapYear = document.getElementById('chartYearHistogram');
      if (wrapYear) {
        wrapYear.innerHTML = '';
        years.forEach(y => {
          const barWrap = document.createElement('div');
          barWrap.style.display = 'grid';
          barWrap.style.gridTemplateColumns = '120px 1fr auto';
          barWrap.style.gap = '10px';
          const label = document.createElement('div');
          label.textContent = String(y);
          const bar = document.createElement('div');
          bar.style.height = '12px';
          bar.style.alignSelf = 'center';
          bar.style.background = 'linear-gradient(90deg, var(--success), var(--primary))';
          bar.style.width = `${Math.round((byYear.get(y) / maxCount) * 100)}%`;
          const val = document.createElement('div');
          val.textContent = String(byYear.get(y));
          wrapYear.appendChild(barWrap);
          barWrap.appendChild(label);
          barWrap.appendChild(bar);
          barWrap.appendChild(val);
        });
      }
      const bands = [
        { key: '<10k', test: (p) => p < 10000 },
        { key: '10–20k', test: (p) => p >= 10000 && p < 20000 },
        { key: '20–30k', test: (p) => p >= 20000 && p < 30000 },
        { key: '>30k', test: (p) => p >= 30000 },
      ];
      const bandCounts = bands.map(b => ({ key: b.key, count: items.filter(r => b.test(Number(r.prezzo) || 0)).length }));
      const maxBand = Math.max(1, ...bandCounts.map(x => x.count));
      const wrapBands = document.getElementById('chartPriceBands');
      if (wrapBands) {
        wrapBands.innerHTML = '';
        bandCounts.forEach(({ key, count }) => {
          const barWrap = document.createElement('div');
          barWrap.style.display = 'grid';
          barWrap.style.gridTemplateColumns = '120px 1fr auto';
          barWrap.style.gap = '10px';
          const label = document.createElement('div');
          label.textContent = key;
          const bar = document.createElement('div');
          bar.style.height = '12px';
          bar.style.alignSelf = 'center';
          bar.style.background = 'linear-gradient(90deg, var(--accent), var(--primary))';
          bar.style.width = `${Math.round((count / maxBand) * 100)}%`;
          const val = document.createElement('div');
          val.textContent = String(count);
          wrapBands.appendChild(barWrap);
          barWrap.appendChild(label);
          barWrap.appendChild(bar);
          barWrap.appendChild(val);
        });
      }
    }
    function renderQualityIssues() {
      const db = window.RoulotteStore.getDB();
      const items = db.roulottes || [];
      function score(r) {
        let s = 0;
        if (Array.isArray(r.photos) && r.photos.length) s += 30;
        const descLen = String(r.note || '').replace(/<[^>]*>/g,' ').trim().length;
        if (descLen > 60) s += 25;
        if (String(r.contattoTelefono||'').trim() || String(r.contattoEmail||'').trim()) s += 20;
        if (String(r.marca||'').trim()) s += 5;
        if (String(r.modello||'').trim()) s += 5;
        if (Number(r.prezzo)) s += 5;
        if (Number(r.anno)) s += 5;
        if (String(r.stato_annuncio||'').trim().toLowerCase() === 'pubblicato') s += 5;
        return s;
      }
      function missingList(r) {
        const m = [];
        if (!Array.isArray(r.photos) || !r.photos.length) m.push('foto');
        const descLen = String(r.note || '').replace(/<[^>]*>/g,' ').trim().length;
        if (descLen <= 60) m.push('descrizione');
        if (!String(r.contattoTelefono||'').trim() && !String(r.contattoEmail||'').trim()) m.push('contatti');
        if (!String(r.marca||'').trim()) m.push('marca');
        if (!String(r.modello||'').trim()) m.push('modello');
        if (!Number(r.prezzo)) m.push('prezzo');
        if (!Number(r.anno)) m.push('anno');
        return m;
      }
      const ranked = items
        .filter(r => r.stato !== 'Venduto')
        .map(r => ({ r, s: score(r) }))
        .sort((a,b) => a.s - b.s)
        .slice(0, 5);
      const wrap = document.getElementById('qualityIssuesList');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!ranked.length) {
        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = 'Tutte le schede sono in buono stato.';
        wrap.appendChild(hint);
        return;
      }
      ranked.forEach(({ r, s }) => {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr auto';
        row.style.gap = '10px';
        const left = document.createElement('div');
        left.innerHTML = `<strong>${r.marca||''} ${r.modello||''}</strong> • ${r.id} • punteggio ${s}/100<br/><span class="hint">Mancano: ${missingList(r).join(', ')}</span>`;
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn';
        btnEdit.textContent = 'Modifica';
        btnEdit.addEventListener('click', () => { if (typeof window.editItem === 'function') window.editItem(r.id); });
        const btnView = document.createElement('button');
        btnView.className = 'btn';
        btnView.textContent = 'Dettaglio';
        btnView.addEventListener('click', () => { if (typeof window.viewItem === 'function') window.viewItem(r.id); });
        actions.appendChild(btnEdit);
        actions.appendChild(btnView);
        row.appendChild(left);
        row.appendChild(actions);
        wrap.appendChild(row);
      });
    }

    function setDetailInfoRow(label, value) {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '140px 1fr';
      row.style.gap = '10px';
      const k = document.createElement('div');
      k.style.color = 'var(--muted)';
      k.style.fontWeight = '700';
      k.textContent = label;
      const v = document.createElement('div');
      v.style.color = 'var(--text)';
      v.textContent = value;
      row.appendChild(k);
      row.appendChild(v);
      detailInfo.appendChild(row);
    }

    function renderDetail(id) {
      const db = window.RoulotteStore.getDB();
      const r = (db.roulottes || []).find(x => x.id === id);
      if (!r) return;
      currentDetailId = id;

      const cats = db.categories || [];
      const categoryName = cats.find(c => c.id === r.categoryId)?.name || '—';

      detailTitle.textContent = `${r.marca || ''} ${r.modello || ''}`.trim() || 'Dettaglio';
      detailMeta.textContent = `${r.id || ''}${r.anno ? ` • Anno ${r.anno}` : ''} • ${categoryName} • ${formatPrice(r.prezzo)}`;
      if (detailSoldBtn) {
        detailSoldBtn.disabled = r.stato === 'Venduto';
        detailSoldBtn.textContent = r.stato === 'Venduto' ? 'Già venduto' : 'Segna venduto';
      }

      detailInfo.innerHTML = '';
      setDetailInfoRow('Stato', r.stato || '—');
      setDetailInfoRow('Tipologia', r.tipologiaMezzo || '—');
      setDetailInfoRow('Versione', r.versione || '—');
      setDetailInfoRow('Pronta consegna', boolLabel(r.disponibilitaProntaConsegna));
      setDetailInfoRow('Permuta', boolLabel(r.permuta));

      const dims = [];
      if (r.lunghezzaTotale) dims.push(`Lunghezza totale ${r.lunghezzaTotale} m`);
      if (r.lunghezzaInterna) dims.push(`Lunghezza interna ${r.lunghezzaInterna} m`);
      if (r.larghezza) dims.push(`Larghezza ${r.larghezza} m`);
      if (r.altezza) dims.push(`Altezza ${r.altezza} m`);
      if (dims.length) setDetailInfoRow('Dimensioni', dims.join(' • '));

      if (r.postiLetto || r.posti) setDetailInfoRow('Posti letto', String(r.postiLetto ?? r.posti));
      if (r.massa) setDetailInfoRow('Massa', `${r.massa} kg`);
      if (r.pesoVuoto) setDetailInfoRow('Peso a vuoto', `${r.pesoVuoto} kg`);

      if (r.documenti) setDetailInfoRow('Documenti', String(r.documenti));
      if (r.tipologia) setDetailInfoRow('Tipologia interna', String(r.tipologia));
      if (Array.isArray(r.disposizioneLetti) && r.disposizioneLetti.length) setDetailInfoRow('Disposizione letti', r.disposizioneLetti.join(', '));
      if (Array.isArray(r.idealePer) && r.idealePer.length) setDetailInfoRow('Ideale per', r.idealePer.join(', '));

      if (r.localita) setDetailInfoRow('Località', r.localita);
      if (r.contattoTelefono) setDetailInfoRow('Telefono', r.contattoTelefono);
      if (r.contattoWhatsapp) setDetailInfoRow('WhatsApp', r.contattoWhatsapp);
      if (r.contattoEmail) setDetailInfoRow('Email', r.contattoEmail);

      detailNote.innerHTML = r.note ? r.note : '<div class="hint">Nessuna descrizione.</div>';

      detailPhotos.innerHTML = '';
      if (Array.isArray(r.photos) && r.photos.length) {
        r.photos.forEach(item => {
          const box = document.createElement('div');
          box.className = 'photo';
          const img = document.createElement('img');
          img.src = (typeof item === 'object') ? (item.thumb || item.src || '') : item;
          box.appendChild(img);
          detailPhotos.appendChild(box);
        });
      } else {
        detailPhotos.innerHTML = '<div class="hint" style="grid-column:1/-1">Nessuna foto.</div>';
      }
    }

    window.editItem = function(id) {
       const safeId = String(id || '').trim();
       if (!safeId) return;

       Promise.resolve()
         .then(async () => {
           if (window.RoulotteStore && typeof window.RoulotteStore.reloadRoulottes === 'function') {
             await window.RoulotteStore.reloadRoulottes();
           }
         })
         .then(() => {
           const db = window.RoulotteStore.getDB();
           const r = (db.roulottes || []).find(x => x && x.id === safeId);
           if (!r) {
             alert('Elemento non trovato nel database server.');
             return;
           }

           draftEditingUpdatedAt = r.updatedAt || r.updated_at || '';
           sessionStorage.setItem('roulotte_draft', JSON.stringify(r));
           loadDraft();
           
           if (r.photos && Array.isArray(r.photos)) {
               draftPhotos = r.photos.map(p => {
                   if (typeof p === 'string') return { src: p, thumb: p, type: 'image/jpeg' };
                   return p;
               });
               renderPhotos();
           } else {
               draftPhotos = [];
               renderPhotos();
           }

           switchSection('new');
           formTitle.textContent = `Modifica ${r.id}`;
           editIdEl.value = r.id;
           clearFormBtn.textContent = 'Annulla Modifica';
           setNewFormDirty(false);
         })
         .catch((e) => {
           alert('Errore durante la modifica: ' + (e && e.message ? e.message : String(e)));
           console.error(e);
         });
    };

    window.duplicateItem = function(id) {
      window.editItem(id);
      const srcId = editIdEl.value;
      editIdEl.value = '';
      draftEditingUpdatedAt = '';
      formTitle.textContent = `Duplica ${srcId}`;
      clearFormBtn.textContent = 'Nuova Scheda';
      setNewFormDirty(false);
    };

    window.deleteItem = async function(id) {
       if(confirm('Sei sicuro di voler eliminare definitivamente questa scheda?')) {
         try {
           await window.RoulotteStore.deleteRoulotte(id);
           refreshAll();
           if (currentDetailId === id) {
             switchSection('list');
             currentDetailId = null;
           }
         } catch (e) {
           const msg = e && e.message ? String(e.message) : 'Errore';
           alert('Errore durante l\'eliminazione: ' + msg);
           if (msg.includes('UNAUTHORIZED') || msg.includes('401')) { logout(); }
         }
       }
    };

    window.markSold = async function(id) {
      const safeId = String(id || '').trim();
      if (!safeId) return;
      if (!confirm('Impostare lo stato su "Venduto"?')) return;
      try {
        const db = window.RoulotteStore.getDB();
        const r = (db.roulottes || []).find(x => x.id === safeId);
        await window.RoulotteStore.updateRoulotte({ id: safeId, stato: 'Venduto', stato_annuncio: 'venduto', updatedAt: (r && (r.updatedAt || r.updated_at)) ? (r.updatedAt || r.updated_at) : null });
        refreshAll();
        if (currentDetailId === safeId) renderDetail(safeId);
      } catch (e) {
        alert('Errore aggiornamento stato: ' + e.message);
      }
    };

    // Ensure functions are global for onclick handlers
    window.viewItem = window.viewItem || function(id) {
      console.log('viewItem called with id:', id);
      renderDetail(id);
      switchSection('detail');
    };

    window.openPublic = window.openPublic || function(id) {
      const safeId = String(id || '').trim();
      if (!safeId) return;
      const url = new URL('index.html', window.location.href);
      url.searchParams.set('id', safeId);
      window.open(url.toString(), '_blank', 'noopener');
    };


    if (detailBackBtn) {
      detailBackBtn.addEventListener('click', () => {
        switchSection('list');
        renderList();
      });
    }

    // Event listeners for detail buttons with robust error handling
    if (detailEditBtn) {
      detailEditBtn.addEventListener('click', () => {
        console.log('detailEditBtn clicked. currentDetailId:', currentDetailId);
        if (currentDetailId) {
          try {
             editItem(currentDetailId);
          } catch (e) {
             alert('Errore apertura modifica: ' + e.message);
             console.error(e);
          }
        } else {
           alert('Nessun elemento selezionato.');
        }
      });
    }
    if (detailOpenPublicBtn) {
      detailOpenPublicBtn.addEventListener('click', () => {
        if (currentDetailId) openPublic(currentDetailId);
      });
    }
    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); try{a.remove();}catch{} }, 100);
    }
    if (detailExportSubitoBtn) {
      detailExportSubitoBtn.addEventListener('click', async () => {
        try {
          const token = window.RoulotteStore.getAuthToken();
          if (!token || !currentDetailId) return;
          const r = await fetch(apiUrl('/api/export/subito/' + encodeURIComponent(currentDetailId)), {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'text/csv' }
          });
          const t = await r.text();
          const blob = new Blob([t], { type: 'text/csv;charset=utf-8' });
          downloadBlob(blob, 'subito_' + currentDetailId + '.csv');
          showToast('success', 'Esporta', 'Pacchetto Subito.csv scaricato.');
        } catch (e) {
          showToast('error', 'Esporta', String(e && e.message ? e.message : e));
        }
      });
    }
    if (detailExportFbBtn) {
      detailExportFbBtn.addEventListener('click', async () => {
        try {
          const token = window.RoulotteStore.getAuthToken();
          if (!token || !currentDetailId) return;
          const r = await fetch(apiUrl('/api/export/marketplace/' + encodeURIComponent(currentDetailId)), {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
          });
          const j = await r.json();
          const blob = new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' });
          downloadBlob(blob, 'marketplace_' + currentDetailId + '.json');
          showToast('success', 'Esporta', 'Pacchetto Marketplace.json scaricato.');
        } catch (e) {
          showToast('error', 'Esporta', String(e && e.message ? e.message : e));
        }
      });
    }
    function buildBookmarkletPayload(r) {
      const tmp = document.createElement('div');
      tmp.innerHTML = String(r.note || r.descrizione || '');
      const plain = tmp.textContent || tmp.innerText || '';
      const cats = window.RoulotteStore.getDB().categories || [];
      const categoryName = (cats.find(c => c.id === r.categoryId)?.name) || (r.tipologiaMezzo || r.tipologia || '');
      return {
        title: String((r.marca || '') + ' ' + (r.modello || '')).trim(),
        description: String(plain || '').trim(),
        price: Number.isFinite(Number(r.prezzo)) ? Number(r.prezzo) : '',
        condition: String(r.stato || '').trim(),
        category: String(categoryName || '').trim(),
        location: String(r.localita || '').trim(),
        email: String(r.contattoEmail || '').trim(),
        phone: String(r.contattoTelefono || r.contattoWhatsapp || '').trim()
      };
    }
    function makeBookmarkletScript(payload) {
      const dataStr = JSON.stringify(payload);
      const src =
`(function(){
  try{
    var data=${dataStr};
    function txt(s){return String(s||'').trim();}
    function inputs(){return Array.from(document.querySelectorAll('input,textarea,select')); }
    function match(el, keys){
      var t=(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.name||'')+' '+(el.id||'');
      var label=''; if(el.id){ var lab=document.querySelector('label[for=\"'+el.id+'\"]'); if(lab) label=lab.textContent||''; }
      t=(t+' '+label).toLowerCase();
      return keys.some(function(k){ return t.includes(k); });
    }
    function setVal(el,v){
      if(!el) return;
      if(el.tagName==='SELECT'){
        var opt=Array.from(el.options).find(function(o){ return (o.textContent||'').toLowerCase().includes(String(v).toLowerCase()); });
        if(opt){ el.value=opt.value; el.dispatchEvent(new Event('change',{bubbles:true})); }
      } else {
        el.value=String(v==null?'':v);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    var all=inputs();
    setVal(all.find(function(e){return match(e,['titolo','title','annuncio']);}), txt(data.title));
    setVal(all.find(function(e){return match(e,['descrizione','description','testo']);}), txt(data.description));
    setVal(all.find(function(e){return match(e,['prezzo','price','€']);}), String(data.price||''));
    setVal(all.find(function(e){return match(e,['categoria','category']);}), txt(data.category||'')); 
    setVal(all.find(function(e){return match(e,['condizione','stato','condition']);}), txt(data.condition||'')); 
    setVal(all.find(function(e){return match(e,['comune','città','località','city']);}), txt(data.location||'')); 
    setVal(all.find(function(e){return match(e,['email']);}), txt(data.email||'')); 
    setVal(all.find(function(e){return match(e,['telefono','phone','whatsapp']);}), txt(data.phone||'')); 
    alert('Precompilazione completata. Controlla i campi e carica le immagini.');
  }catch(e){ alert('Errore bookmarklet: '+(e&&e.message?e.message:e)); }
})();`;
      const href = 'javascript:' + encodeURIComponent(src);
      return href;
    }
    function presentBookmarklet(href, label) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      link.className = 'btn';
      link.style.marginLeft = '6px';
      link.title = 'Trascina nei Preferiti oppure clicca qui su Subito/Marketplace';
      document.querySelector('.top-actions')?.appendChild(link);
      try {
        navigator.clipboard.writeText(href).then(()=> {
          showToast('success','Bookmarklet','Copiato negli appunti. Trascina nei Preferiti.');
        }).catch(()=> {
          showToast('info','Bookmarklet','Aggiunto un link nella barra in alto. Trascinalo nei Preferiti.');
        });
      } catch {
        showToast('info','Bookmarklet','Aggiunto un link nella barra in alto. Trascinalo nei Preferiti.');
      }
    }
    if (detailBmSubitoBtn) {
      detailBmSubitoBtn.addEventListener('click', () => {
        const db = window.RoulotteStore.getDB();
        const r = (db.roulottes || []).find(x => String(x.id||'') === String(currentDetailId||''));
        if (!r) { showToast('error','Bookmarklet','Nessuna scheda trovata.'); return; }
        const payload = buildBookmarkletPayload(r);
        const href = makeBookmarkletScript(payload);
        presentBookmarklet(href,'Bookmarklet Subito');
      });
    }
    if (detailBmFbBtn) {
      detailBmFbBtn.addEventListener('click', () => {
        const db = window.RoulotteStore.getDB();
        const r = (db.roulottes || []).find(x => String(x.id||'') === String(currentDetailId||''));
        if (!r) { showToast('error','Bookmarklet','Nessuna scheda trovata.'); return; }
        const payload = buildBookmarkletPayload(r);
        const href = makeBookmarkletScript(payload);
        presentBookmarklet(href,'Bookmarklet Marketplace');
      });
    }
    async function refreshAutoFeedStatus() {
      try {
        const token = window.RoulotteStore.getAuthToken();
        const r = await fetch(apiUrl('/api/export/status'), {
          headers: { 'Accept': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' }
        });
        const j = await r.json().catch(()=>null);
        const ok = j && j.ok;
        const at = j && j.at ? j.at : '';
        const files = j && j.files ? j.files : {};
        const elStatus = document.getElementById('autoFeedStatus');
        const elSub = document.getElementById('autoFeedSubitoUrl');
        const elMk = document.getElementById('autoFeedMarketplaceUrl');
        if (elStatus) elStatus.textContent = (ok ? 'OK' : 'Errore') + (at ? (' • ' + at) : '');
        if (elSub && files && files.subito_csv_url) { elSub.href = files.subito_csv_url; elSub.textContent = files.subito_csv_url; }
        if (elMk && files && files.marketplace_json_url) { elMk.href = files.marketplace_json_url; elMk.textContent = files.marketplace_json_url; }
      } catch {}
    }
    const autoFeedStatusBtn = document.getElementById('autoFeedStatusBtn');
    if (autoFeedStatusBtn) {
      autoFeedStatusBtn.addEventListener('click', refreshAutoFeedStatus);
      refreshAutoFeedStatus();
    }
    if (detailDuplicateBtn) {
      detailDuplicateBtn.addEventListener('click', () => {
        if (currentDetailId) {
           try {
             duplicateItem(currentDetailId);
           } catch(e) {
             alert('Errore duplicazione: ' + e.message);
           }
        }
      });
    }
    if (detailSoldBtn) {
      detailSoldBtn.addEventListener('click', () => {
        console.log('detailSoldBtn clicked. currentDetailId:', currentDetailId);
        if (currentDetailId) {
          markSold(currentDetailId).catch(err => {
             console.error('Error in markSold wrapper:', err);
             alert('Errore: ' + err.message);
          });
        } else {
          alert('Nessun elemento selezionato.');
        }
      });
    }



    let listTimer = null;
    listQ.addEventListener('input', () => { clearTimeout(listTimer); listTimer = setTimeout(renderList, 150); });
    listStato.addEventListener('change', renderList);
    if (listCategory) listCategory.addEventListener('change', renderList);
    if (listAnnuncio) listAnnuncio.addEventListener('change', renderList);
    listReset.addEventListener('click', () => { listQ.value=''; if (listCategory) listCategory.value=''; listStato.value=''; if (listAnnuncio) listAnnuncio.value=''; renderList(); });

    if (tableBody) {
      tableBody.addEventListener('change', (e) => {
        const el = e && e.target ? e.target : null;
        if (!el || !el.classList || !el.classList.contains('share-select')) return;
        const id = String(el.getAttribute('data-id') || '').trim();
        if (!id) return;
        if (el.checked) selectedShareIds.add(id);
        else selectedShareIds.delete(id);
        updateShareSelectionUi();
      });
    }

    if (shareClearSelBtn) {
      shareClearSelBtn.addEventListener('click', () => {
        selectedShareIds.clear();
        updateShareSelectionUi();
        renderList();
        showToast('info', 'Selezione', 'Selezione pulita.');
      });
    }

    if (shareCreateBtn) {
      shareCreateBtn.addEventListener('click', async () => {
        const ids = Array.from(selectedShareIds);
        if (!ids.length) return;
        const title = String(shareTitleEl && shareTitleEl.value || '').trim().slice(0, 140);
        const expiresInDays = Number(shareExpiresEl && shareExpiresEl.value || 7);
        const token = window.RoulotteStore.getAuthToken();
        if (!token) {
          showToast('error', 'Accesso richiesto', 'Effettua il login per creare link di condivisione.');
          return;
        }
        shareCreateBtn.disabled = true;
        const toast = showToast('info', 'Condivisione', 'Creazione link in corso…', { persist: true });
        try {
          const r = await fetch(apiUrl('/api/share-links'), {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ ids, title, expiresInDays })
          });
          const j = await r.json().catch(() => null);
          if (!r.ok) {
            const code = j && j.error ? String(j.error) : String(r.status);
            if (code === 'UNAUTHORIZED' || r.status === 401) throw new Error('UNAUTHORIZED');
            throw new Error(code);
          }
          const url = j && j.url ? String(j.url) : '';
          if (!url) throw new Error('SERVER_ERROR');
          const ok = await copyText(url);
          if (ok) showToast('success', 'Link copiato', url, { timeoutMs: 3800 });
          else showToast('success', 'Link creato', url, { timeoutMs: 5200 });
        } catch (e) {
          const msg = String(e && e.message ? e.message : e);
          if (msg === 'UNAUTHORIZED') showToast('error', 'Non autorizzato', 'Sessione scaduta. Effettua di nuovo il login.');
          else if (msg === 'DB_UNAVAILABLE') showToast('error', 'Database non disponibile', 'Riprova più tardi.');
          else showToast('error', 'Errore', 'Impossibile creare il link.');
        } finally {
          try { if (toast && toast.close) toast.close(); } catch {}
          shareCreateBtn.disabled = selectedShareIds.size === 0;
        }
      });
    }

    // --- Export/Import/Wipe ---
    exportBtn.addEventListener('click', () => {
      const db = window.RoulotteStore.getDB();
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      try { showToast('success', 'Export', 'Backup JSON scaricato.', { timeoutMs: 1600 }); } catch {}
    });

    importBtn.addEventListener('click', async () => {
      const file = (importInput.files || [])[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        window.RoulotteStore.replaceAll(obj);
        importInput.value = '';
        refreshAll();
        try { showToast('success', 'Import', 'Import completato.', { timeoutMs: 1800 }); } catch {}
      } catch { try { showToast('error', 'Import', 'File non valido.', { timeoutMs: 2200 }); } catch {} }
    });

    function setSyncStatus(text, ok) {
      if (!syncMsg) return;
      syncMsg.hidden = false;
      syncMsg.textContent = text;
      if (ok) {
        syncMsg.style.background = 'rgba(16,185,129,.16)';
        syncMsg.style.borderColor = 'rgba(16,185,129,.35)';
        syncMsg.style.color = '#a7f3d0';
      } else {
        syncMsg.style.background = 'rgba(220,38,38,.14)';
        syncMsg.style.borderColor = 'rgba(220,38,38,.35)';
        syncMsg.style.color = 'var(--text)';
      }
    }

    if (syncNowBtn) syncNowBtn.addEventListener('click', async () => {
      try {
        setSyncStatus('Sincronizzazione in corso…', true);
        const res = await window.RoulotteStore.syncNow();
        if (res && res.ok) {
          refreshAll();
          setSyncStatus(`Sync OK (${res.mode})`, true);
          try { showToast('success', 'Sync', `Sync OK (${res.mode})`, { timeoutMs: 1600 }); } catch {}
        } else {
          setSyncStatus('Server non disponibile', false);
          try { showToast('error', 'Sync', 'Server non disponibile.', { timeoutMs: 2200 }); } catch {}
        }
      } catch {
        setSyncStatus('Sync fallita', false);
        try { showToast('error', 'Sync', 'Sync fallita.', { timeoutMs: 2200 }); } catch {}
      }
    });

    if (pullServerBtn) pullServerBtn.addEventListener('click', async () => {
      try {
        setSyncStatus('Scaricamento in corso…', true);
        const res = await window.RoulotteStore.pullFromServer();
        if (res && res.ok) {
          refreshAll();
          setSyncStatus('Scaricato dal server', true);
          try { showToast('success', 'Sync', 'Scaricato dal server.', { timeoutMs: 1600 }); } catch {}
        } else {
          setSyncStatus('Nessun database sul server', false);
          try { showToast('warning', 'Sync', 'Nessun database sul server.', { timeoutMs: 2200 }); } catch {}
        }
      } catch {
        setSyncStatus('Scaricamento fallito', false);
        try { showToast('error', 'Sync', 'Scaricamento fallito.', { timeoutMs: 2200 }); } catch {}
      }
    });

    if (pushServerBtn) pushServerBtn.addEventListener('click', async () => {
      try {
        setSyncStatus('Caricamento in corso…', true);
        const res = await window.RoulotteStore.pushToServer();
        if (res && res.ok) { setSyncStatus('Caricato sul server', true); try { showToast('success', 'Sync', 'Caricato sul server.', { timeoutMs: 1600 }); } catch {} }
        else { setSyncStatus('Caricamento fallito', false); try { showToast('error', 'Sync', 'Caricamento fallito.', { timeoutMs: 2200 }); } catch {} }
      } catch {
        setSyncStatus('Caricamento fallito', false);
        try { showToast('error', 'Sync', 'Caricamento fallito.', { timeoutMs: 2200 }); } catch {}
      }
    });

    wipeBtn.addEventListener('click', () => {
      if(confirm('Eliminare TUTTO?')) {
        localStorage.removeItem(window.RoulotteStore.storageKey);
        location.reload();
      }
    });

    function getEmbedUrl(u) {
      const s = String(u || '').trim();
      if (!s) return null;
      if (s.includes('youtube.com/watch')) {
        const p = new URL(s);
        const id = p.searchParams.get('v');
        if (id) return 'https://www.youtube.com/embed/' + id;
      }
      if (s.includes('youtu.be/')) {
        const id = s.split('youtu.be/')[1].split(/[?&]/)[0];
        if (id) return 'https://www.youtube.com/embed/' + id;
      }
      if (s.includes('vimeo.com/')) {
        const id = s.split('vimeo.com/')[1].split(/[?&]/)[0];
        if (id) return 'https://player.vimeo.com/video/' + id;
      }
      return null;
    }
    videoUrlEl.addEventListener('input', () => {
      const embed = getEmbedUrl(videoUrlEl.value);
      const container = document.getElementById('videoPreview');
      if (!container) return;
      if (!embed) { container.innerHTML = ''; return; }
      const iframe = document.createElement('iframe');
      iframe.src = embed;
      iframe.width = '100%';
      iframe.height = '240';
      iframe.style.border = 'none';
      iframe.loading = 'lazy';
      container.innerHTML = '';
      container.appendChild(iframe);
    });

    async function checkHealth() {
      const dot = document.getElementById('healthDot');
      const txt = document.getElementById('healthText');
      if (!dot || !txt) return;
      
      try {
        const res = await fetch(apiUrl('/api/health'));
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
             dot.className = 'status-dot ok';
             txt.textContent = 'Sistema Online';
          } else {
             dot.className = 'status-dot error';
             txt.textContent = 'Errore DB';
          }
        } else {
          dot.className = 'status-dot error';
          txt.textContent = 'Server Error';
        }
      } catch (e) {
        dot.className = 'status-dot error';
        txt.textContent = 'Offline';
      }
    }
    // Controllo ogni 60 secondi
    setInterval(checkHealth, 60000);

    // --- Init ---
    function refreshAll() {
      refreshStats();
      renderCharts();
      renderCategories();
      renderList();
      renderQualityIssues();
    }
    let autoRefreshTimer = null;
    function setAutoRefreshEnabled(on) {
      if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
      if (on) {
        const sec = Number(autoRefreshInterval && autoRefreshInterval.value || 60);
        autoRefreshTimer = setInterval(() => refreshAll(), Math.max(10, sec) * 1000);
      }
    }
    if (autoRefreshToggle) autoRefreshToggle.addEventListener('change', () => setAutoRefreshEnabled(autoRefreshToggle.checked));
    if (autoRefreshInterval) autoRefreshInterval.addEventListener('change', () => setAutoRefreshEnabled(autoRefreshToggle && autoRefreshToggle.checked));
    if (probeBtn) probeBtn.addEventListener('click', async () => { try { await checkHealth(); } catch {} });
    if (syncNowBtnDash) syncNowBtnDash.addEventListener('click', async () => {
      try {
        const res = await window.RoulotteStore.syncNow();
        refreshAll();
        if (res && res.ok) { try { showToast('success', 'Sync', `Sync OK (${res.mode})`, { timeoutMs: 1600 }); } catch {} }
        else { try { showToast('error', 'Sync', 'Server non disponibile.', { timeoutMs: 2200 }); } catch {} }
      } catch { try { showToast('error', 'Sync', 'Sync fallita.', { timeoutMs: 2200 }); } catch {} }
    });
    if (filterNoPhotosBtn) filterNoPhotosBtn.addEventListener('click', () => {
      listFilterMissingPhotos = true;
      listAnnuncio.value = '';
      switchSection('list');
      renderList();
    });
    if (filterDraftsBtn) filterDraftsBtn.addEventListener('click', () => {
      listFilterMissingPhotos = false;
      listAnnuncio.value = 'bozza';
      switchSection('list');
      renderList();
    });
    if (filterPublishedBtn) filterPublishedBtn.addEventListener('click', () => {
      listFilterMissingPhotos = false;
      listAnnuncio.value = 'pubblicato';
      switchSection('list');
      renderList();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === window.RoulotteStore.storageKey) refreshAll();
    });

    async function bootAuthed() {
      showApp();
      checkHealth();
      connectAdminWs();
      try { await window.RoulotteStore.reloadRoulottes(); } catch {}
      try {
        const res = await window.RoulotteStore.syncNow();
        if (res && syncMsg) {
          if (res.ok) setSyncStatus(`Sync OK (${res.mode})`, true);
          else setSyncStatus('Server non disponibile', false);
        }
      } catch {
        if (syncMsg) setSyncStatus('Server non disponibile', false);
      }
      refreshAll();
      loadDraft(); // Recupera bozza
      await applyInitialRoute();
      if (!getInitialRoute().section) switchSection('dashboard');
    }
    if (isAuthed()) bootAuthed();
    else showLogin();

    // --- Event Delegation for List Actions ---
    // Fixes issues with onclick scope and unresponsiveness
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        e.preventDefault();
        e.stopPropagation();

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        console.log('Action Clicked via Delegation:', action, id);

        if (!id) return;

        if (action === 'view') {
           if (typeof window.viewItem === 'function') window.viewItem(id);
        } else if (action === 'edit') {
           if (typeof window.editItem === 'function') window.editItem(id);
        } else if (action === 'duplicate') {
           if (typeof window.duplicateItem === 'function') window.duplicateItem(id);
        } else if (action === 'sold') {
           if (typeof window.markSold === 'function') window.markSold(id);
        } else if (action === 'delete') {
           if (typeof window.deleteItem === 'function') window.deleteItem(id);
        }
      });
    }

    var adminWs = null;
    var adminWsRetryTimer = null;
    var adminWsLastSeq = 0;

    function getWsUrl() {
      const base = getWsBaseUrl();
      const token = (window.RoulotteStore && typeof window.RoulotteStore.getAuthToken === 'function') ? window.RoulotteStore.getAuthToken() : '';
      const qs = token ? ('?token=' + encodeURIComponent(token)) : '';
      return base + '/ws' + qs;
    }

    function scheduleWsRetry() {
      if (adminWsRetryTimer) return;
      const delay = 1500;
      adminWsRetryTimer = setTimeout(() => {
        adminWsRetryTimer = null;
        if (isAuthed()) connectAdminWs();
      }, delay);
    }

    function connectAdminWs() {
      try { if (adminWs) adminWs.close(); } catch {}
      adminWs = null;
      try {
        const url = getWsUrl();
        adminWs = new WebSocket(url);
        if (wsStatusEl) wsStatusEl.textContent = 'WS: Connessione…';
        adminWs.onopen = () => { if (wsStatusEl) wsStatusEl.textContent = 'WS: Connesso'; };
        adminWs.onclose = () => { scheduleWsRetry(); };
        adminWs.onerror = () => { try { if (adminWs) adminWs.close(); } catch {}; if (wsStatusEl) wsStatusEl.textContent = 'WS: Errore'; };
        adminWs.onmessage = (ev) => {
          let msg = null;
          try { msg = JSON.parse(String(ev && ev.data || '')); } catch {}
          if (!msg || typeof msg !== 'object') return;
          if (String(msg.type || '') === 'invalidate' && String(msg.scope || '') === 'roulottes') {
            const seq = Number(msg.seq || 0);
            if (seq && seq <= adminWsLastSeq) return;
            if (seq) adminWsLastSeq = seq;
            Promise.resolve()
              .then(async () => {
                if (window.RoulotteStore && typeof window.RoulotteStore.reloadRoulottes === 'function') {
                  await window.RoulotteStore.reloadRoulottes();
                }
              })
              .then(() => {
                refreshAll();
                if (currentDetailId) renderDetail(currentDetailId);
              })
              .catch(() => {});
            if (wsStatusEl) wsStatusEl.textContent = 'WS: Dati aggiornati';
          }
        };
      } catch {
        scheduleWsRetry();
      }
    }
