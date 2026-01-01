    let qEl = null;
    let statoEl = null;
    let sortEl = null;
    let categoryEl = null;
    let priceMinEl = null;
    let priceMaxEl = null;
    let hasPhotoEl = null;
    let cardsEl = null;
    let emptyEl = null;
    let totalCountEl = null;
    let resultCountEl = null;
    let lastUpdatedEl = null;
    let liveStatusEl = null;
    let resetFiltersEl = null;
    let copySearchLinkEl = null;
    let themeToggleEl = null;
    let langSelectEl = null;
    let quickEditBtnEl = null;
    let retryLoadEl = null;

    let dialog = null;
    let copyLinkBtn = null;
    let closeDialog = null;
    let detailTitle = null;
    let detailMeta = null;
    let detailPrice = null;
    let detailNote = null;
    let detailGallery = null;
    let detailPlanimetria = null;
    let detailVideo = null;
    let currentDetailId = null;
    let pendingUrlDetailId = null;
    let lastFocusBeforeDetail = null;
    let lastFocusBeforeLightbox = null;

    let transportStandalone = null;
    let transportDialog = null;

    let defaultHomeInnerHtml = '';
    let defaultDetailDialogInnerHtml = '';

    let cardTemplateHtml = '';
    let cardTemplateEl = null;

    function refreshDomRefs() {
      const home = document.getElementById('editableHome');
      const filtersRoot = document.getElementById('editableFilters')
        || (home ? home.querySelector('#editableFilters') : null)
        || (home ? home.querySelector('[role="search"]') : null)
        || (home ? home.querySelector('.controls') : null);
      const priceRange = filtersRoot ? (filtersRoot.querySelector('.price-range') || null) : null;
      const priceInputs = priceRange ? Array.from(priceRange.querySelectorAll('input')) : [];

      qEl = document.getElementById('q') || (filtersRoot ? (filtersRoot.querySelector('input[name="q"]') || filtersRoot.querySelector('input[type="search"]')) : null);
      statoEl = document.getElementById('statoFilter') || (filtersRoot ? filtersRoot.querySelector('select[name="statoFilter"]') : null);
      sortEl = document.getElementById('sort') || (filtersRoot ? filtersRoot.querySelector('select[name="sort"]') : null);
      categoryEl = document.getElementById('categoryFilter') || (filtersRoot ? filtersRoot.querySelector('select[name="categoryFilter"]') : null);
      priceMinEl = document.getElementById('priceMin') || (priceRange ? (priceRange.querySelector('input[name="priceMin"]') || priceInputs[0] || null) : null);
      priceMaxEl = document.getElementById('priceMax') || (priceRange ? (priceRange.querySelector('input[name="priceMax"]') || priceInputs[1] || null) : null);
      hasPhotoEl = document.getElementById('hasPhoto') || (filtersRoot ? filtersRoot.querySelector('input[type="checkbox"][name="hasPhoto"], input[type="checkbox"]') : null);
      cardsEl = document.getElementById('cards');
      emptyEl = document.getElementById('emptyState');
      totalCountEl = document.getElementById('totalCount');
      resultCountEl = document.getElementById('resultCount');
      lastUpdatedEl = document.getElementById('lastUpdated');
      liveStatusEl = document.getElementById('liveStatus');
      resetFiltersEl = document.getElementById('resetFilters');
      copySearchLinkEl = document.getElementById('copySearchLink');
      themeToggleEl = document.getElementById('themeToggle');
      langSelectEl = document.getElementById('langSelect');
      quickEditBtnEl = document.getElementById('quickEditBtn');
      retryLoadEl = document.getElementById('retryLoad');

      dialog = document.getElementById('detailDialog');
      copyLinkBtn = document.getElementById('copyLinkBtn');
      closeDialog = document.getElementById('closeDialog');
      detailTitle = document.getElementById('detailTitle');
      detailMeta = document.getElementById('detailMeta');
      detailPrice = document.getElementById('detailPrice');
      detailNote = document.getElementById('detailNote');
      detailGallery = document.getElementById('detailGallery');
      detailPlanimetria = document.getElementById('detailPlanimetria');
      detailVideo = document.getElementById('detailVideo');
    }

    function buildTransportContexts() {
      transportStandalone = {
        title: document.getElementById('transportStandaloneTitle'),
        length: document.getElementById('transportStandaloneLength'),
        width: document.getElementById('transportStandaloneWidth'),
        weight: document.getElementById('transportStandaloneWeight'),
        axles: document.getElementById('transportStandaloneAxles'),
        trainable: document.getElementById('transportStandaloneTrainable'),
        revised: document.getElementById('transportStandaloneRevised'),
        drawbar: document.getElementById('transportStandaloneDrawbar'),
        lengthEdit: document.getElementById('transportStandaloneLengthEdit'),
        widthEdit: document.getElementById('transportStandaloneWidthEdit'),
        weightEdit: document.getElementById('transportStandaloneWeightEdit'),
        axlesEdit: document.getElementById('transportStandaloneAxlesEdit'),
        trainableEdit: document.getElementById('transportStandaloneTrainableEdit'),
        revisedEdit: document.getElementById('transportStandaloneRevisedEdit'),
        drawbarEdit: document.getElementById('transportStandaloneDrawbarEdit'),
        perKmEdit: document.getElementById('transportStandalonePerKmEdit'),
        confirm: document.getElementById('transportStandaloneConfirm'),
        from: document.getElementById('transportStandaloneFrom'),
        to: document.getElementById('transportStandaloneTo'),
        calcBtn: document.getElementById('transportStandaloneCalcBtn'),
        status: document.getElementById('transportStandaloneStatus'),
        distance: document.getElementById('transportStandaloneDistance'),
        duration: document.getElementById('transportStandaloneDuration'),
        type: document.getElementById('transportStandaloneType'),
        reason: document.getElementById('transportStandaloneReason'),
        price: document.getElementById('transportStandalonePrice'),
        mapEl: document.getElementById('transportStandaloneMap')
      };

      transportDialog = {
        length: document.getElementById('transportDialogLength'),
        width: document.getElementById('transportDialogWidth'),
        weight: document.getElementById('transportDialogWeight'),
        axles: document.getElementById('transportDialogAxles'),
        trainable: document.getElementById('transportDialogTrainable'),
        revised: document.getElementById('transportDialogRevised'),
        drawbar: document.getElementById('transportDialogDrawbar'),
        lengthEdit: document.getElementById('transportDialogLengthEdit'),
        widthEdit: document.getElementById('transportDialogWidthEdit'),
        weightEdit: document.getElementById('transportDialogWeightEdit'),
        axlesEdit: document.getElementById('transportDialogAxlesEdit'),
        trainableEdit: document.getElementById('transportDialogTrainableEdit'),
        revisedEdit: document.getElementById('transportDialogRevisedEdit'),
        drawbarEdit: document.getElementById('transportDialogDrawbarEdit'),
        perKmEdit: document.getElementById('transportDialogPerKmEdit'),
        confirm: document.getElementById('transportDialogConfirm'),
        from: document.getElementById('transportDialogFrom'),
        to: document.getElementById('transportDialogTo'),
        calcBtn: document.getElementById('transportDialogCalcBtn'),
        status: document.getElementById('transportDialogStatus'),
        distance: document.getElementById('transportDialogDistance'),
        duration: document.getElementById('transportDialogDuration'),
        type: document.getElementById('transportDialogType'),
        reason: document.getElementById('transportDialogReason'),
        price: document.getElementById('transportDialogPrice'),
        mapEl: document.getElementById('transportDialogMap')
      };
    }

    function captureDefaults() {
      const home = document.getElementById('editableHome');
      if (home) defaultHomeInnerHtml = String(home.innerHTML || '');
      if (dialog) defaultDetailDialogInnerHtml = String(dialog.innerHTML || '');
    }

    function setCardTemplate(html) {
      const raw = String(html || '').trim();
      cardTemplateHtml = raw;
      cardTemplateEl = null;
      if (!raw) return;
      try {
        const tpl = document.createElement('template');
        tpl.innerHTML = raw;
        const first = tpl.content.firstElementChild;
        if (first) cardTemplateEl = tpl;
      } catch {}
    }

    refreshDomRefs();
    buildTransportContexts();
    captureDefaults();

    const defaultTitle = 'Roulotte online';
    const imgLightbox = document.getElementById('imgLightbox');
    const lbImg = document.getElementById('lbImg');
    const lbClose = document.getElementById('lbClose');
    const lbPrev = document.getElementById('lbPrev');
    const lbNext = document.getElementById('lbNext');
    let currentGalleryPhotos = [];
    let currentGalleryCaptions = [];
    let lightboxIndex = 0;
    const LANG_STORAGE_KEY = 'public_lang';
    let currentLang = 'it';

    function getLocaleForLang(lang) {
      const l = String(lang || 'it').toLowerCase();
      if (l === 'en') return 'en-US';
      if (l === 'de') return 'de-DE';
      if (l === 'fr') return 'fr-FR';
      return 'it-IT';
    }

    function tr(key, opts) {
      const o = (opts && typeof opts === 'object') ? opts : {};
      if (window.i18next && typeof window.i18next.t === 'function') return window.i18next.t(key, o);
      if (o.defaultValue !== undefined) return String(o.defaultValue);
      return '';
    }

    function trCount(key, count, defaultTemplate) {
      if (window.i18next && typeof window.i18next.t === 'function') return window.i18next.t(key, { count, defaultValue: defaultTemplate });
      return String(defaultTemplate || '').replace('{{count}}', String(count));
    }

    function bindOnce(el, eventName, key, handler) {
      if (!el) return;
      const k = 'wired' + String(key || '').replace(/[^a-zA-Z0-9]/g, '');
      if (el.dataset && el.dataset[k]) return;
      el.addEventListener(eventName, handler);
      if (el.dataset) el.dataset[k] = '1';
    }

    function extractInnerHtmlFromHtml(html, selectors) {
      const raw = String(html || '').trim();
      if (!raw) return '';
      try {
        const dom = new DOMParser().parseFromString(raw, 'text/html');
        const list = Array.isArray(selectors) ? selectors : [selectors];
        for (const sel of list) {
          if (!sel) continue;
          const el = dom.querySelector(sel);
          if (el) return String(el.innerHTML || '').trim();
        }
      } catch {}
      return raw;
    }

    function ensureHomeDom() {
      const home = document.getElementById('editableHome');
      if (!home) return false;
      if (home.querySelector('#editableFilters') || home.querySelector('[role="search"]') || home.querySelector('input[name="q"]')) return true;
      if (!defaultHomeInnerHtml) return false;
      home.innerHTML = defaultHomeInnerHtml;
      return true;
    }

    function ensureDetailDialogDom() {
      const d = document.getElementById('detailDialog');
      if (!d) return false;
      if (d.querySelector('#detailTitle') && d.querySelector('#closeDialog') && d.querySelector('#detailGallery')) return true;
      if (!defaultDetailDialogInnerHtml) return false;
      d.innerHTML = defaultDetailDialogInnerHtml;
      return true;
    }

    async function changePublicLang(next) {
      const n = String(next || 'it');
      const target = (n === 'en' || n === 'de' || n === 'fr') ? n : 'it';
      if (target === currentLang) return;
      currentLang = target;
      try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch {}
      if (window.i18next && typeof window.i18next.changeLanguage === 'function') {
        try { await window.i18next.changeLanguage(currentLang); } catch {}
      }
      applyTranslations();
      wireUi();
    }

    function wireUi() {
      const navToggle = document.getElementById('navToggle');
      const mainNav = document.getElementById('mainNav');
      if (navToggle && mainNav) {
        bindOnce(navToggle, 'click', 'navToggle', () => {
          const open = mainNav.classList.toggle('open');
          navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }

      refreshDomRefs();

      if (langSelectEl) bindOnce(langSelectEl, 'change', 'langSelect', () => changePublicLang(langSelectEl.value));
      if (themeToggleEl) bindOnce(themeToggleEl, 'click', 'themeToggle', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
      if (quickEditBtnEl) {
        const token = (window.RoulotteStore && typeof window.RoulotteStore.getAuthToken === 'function') ? window.RoulotteStore.getAuthToken() : '';
        quickEditBtnEl.hidden = !(!!getApiBaseUrl() || !!String(token || '').trim());
      }

      if (qEl) bindOnce(qEl, 'input', 'qInput', scheduleRender);
      if (statoEl) bindOnce(statoEl, 'change', 'statoChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (sortEl) bindOnce(sortEl, 'change', 'sortChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (categoryEl) bindOnce(categoryEl, 'change', 'catChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (priceMinEl) bindOnce(priceMinEl, 'input', 'priceMin', scheduleRender);
      if (priceMaxEl) bindOnce(priceMaxEl, 'input', 'priceMax', scheduleRender);
      if (hasPhotoEl) bindOnce(hasPhotoEl, 'change', 'hasPhoto', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });

      if (resetFiltersEl) {
        bindOnce(resetFiltersEl, 'click', 'resetFilters', () => {
          ensureHomeDom();
          refreshDomRefs();
          if (!qEl || !statoEl || !sortEl) return;
          if (!currentDetailId) pendingUrlDetailId = null;
          qEl.value = '';
          if (categoryEl) categoryEl.value = '';
          statoEl.value = '';
          sortEl.value = 'newest';
          if (priceMinEl) priceMinEl.value = '';
          if (priceMaxEl) priceMaxEl.value = '';
          if (hasPhotoEl) hasPhotoEl.checked = false;
          remoteActive = false;
          remoteResults = [];
          lastRemoteKey = '';
          render();
          qEl.focus();
        });
      }

      if (copySearchLinkEl) {
        bindOnce(copySearchLinkEl, 'click', 'copySearchLink', async () => {
          const url = location.href;
          const ok = await copyText(url);
          if (ok) {
            copySearchLinkEl.textContent = tr('actions.copied', { defaultValue: 'Copiato' });
            setTimeout(() => (copySearchLinkEl.textContent = tr('actions.copySearchLink', { defaultValue: 'Copia link ricerca' })), 900);
          } else {
            alert(tr('detail.copyError', { defaultValue: 'Impossibile copiare il link.' }));
          }
        });
      }

      if (retryLoadEl) {
        bindOnce(retryLoadEl, 'click', 'retryLoad', async () => {
          retryLoadEl.disabled = true;
          showCardsLoading(6);
          try {
            if (window.RoulotteStore && typeof window.RoulotteStore.initializeStore === 'function') {
              await window.RoulotteStore.initializeStore();
            } else if (window.RoulotteStore && typeof window.RoulotteStore.syncNow === 'function') {
              await window.RoulotteStore.syncNow();
            }
            dataLoadError = false;
            hideCardsLoading();
            render();
            scheduleRemoteSearch(0);
            setEmptyStateMessage('', { show: false, showRetry: false });
          } catch {
            dataLoadError = true;
            hideCardsLoading();
            setEmptyStateMessage(tr('errors.loadData', { defaultValue: "Si è verificato un errore nel caricamento dei dati. Riprova più tardi." }), { show: true, showRetry: true });
          } finally {
            retryLoadEl.disabled = false;
          }
        });
      }

      if (copyLinkBtn) {
        bindOnce(copyLinkBtn, 'click', 'copyLink', async () => {
          const id = String(currentDetailId || pendingUrlDetailId || '').trim();
          const url = (id && location.origin && location.origin !== 'null')
            ? (location.origin + '/p/' + encodeURIComponent(id))
            : location.href;
          const ok = await copyText(url);
          if (ok) {
            copyLinkBtn.textContent = tr('detail.copied', { defaultValue: 'Copiato' });
            setTimeout(() => (copyLinkBtn.textContent = tr('detail.copyLink', { defaultValue: 'Copia link' })), 900);
          } else {
            alert(tr('detail.copyError', { defaultValue: 'Impossibile copiare il link.' }));
          }
        });
      }

      if (closeDialog) {
        bindOnce(closeDialog, 'click', 'closeDialog', () => closeDetails());
      }

      if (dialog) {
        bindOnce(dialog, 'click', 'dialogBackdrop', (e) => {
          const rect = dialog.getBoundingClientRect();
          const inDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                           rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
          if (!inDialog) closeDetails();
        });
      }

      bindOnce(document, 'keydown', 'escCloseDialog', (e) => {
        if (e.key !== 'Escape') return;
        if (!dialog) return;
        if (!(dialog.hasAttribute('open') || (typeof dialog.open === 'boolean' && dialog.open))) return;
        closeDetails();
      });
    }

    function getStatusLabel(value) {
      const v = String(value || '').trim();
      if (!v) return '—';
      if (v === 'Ottimo') return tr('status.excellent', { defaultValue: v });
      if (v === 'Buono') return tr('status.good', { defaultValue: v });
      if (v === 'Da sistemare') return tr('status.toFix', { defaultValue: v });
      if (v === 'Nuovo') return tr('status.new', { defaultValue: v });
      if (v === 'Venduto') return tr('status.sold', { defaultValue: v });
      return v;
    }

    function applyTranslations() {
      document.documentElement.lang = currentLang;

      const nodes = document.querySelectorAll('[data-i18n]');
      nodes.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const def = el.getAttribute('data-i18n-default');
        const defaultValue = def !== null ? def : el.textContent;
        el.textContent = tr(key, { defaultValue });
      });

      const phNodes = document.querySelectorAll('[data-i18n-placeholder]');
      phNodes.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (!key) return;
        const defaultValue = el.getAttribute('placeholder') || '';
        el.setAttribute('placeholder', tr(key, { defaultValue }));
      });

      applyTheme(document.documentElement.dataset.theme || 'light');
      render();
    }

    function getInitialLang() {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'it' || saved === 'en' || saved === 'de' || saved === 'fr') return saved;
      const nav = String((navigator.languages && navigator.languages[0]) || navigator.language || 'it').toLowerCase();
      if (nav.startsWith('en')) return 'en';
      if (nav.startsWith('de')) return 'de';
      if (nav.startsWith('fr')) return 'fr';
      return 'it';
    }

    async function initI18n() {
      currentLang = getInitialLang();
      if (langSelectEl) langSelectEl.value = currentLang;

      const resources = {
        it: {
          translation: {
            a11y: { skipToContent: "Vai al contenuto" },
            common: { caravan: "Roulotte" },
            nav: { menu: "Menu", catalog: "Catalogo", transport: "Trasporto", admin: "Admin" },
            actions: { adminArea: "Area Admin", editSite: "Modifica sito", resetFilters: "Reset filtri", themeLight: "Tema: Chiaro", themeDark: "Tema: Scuro" },
            hero: { title: "Trova la roulotte giusta", text: "Filtra per marca, modello, anno e stato. I risultati si aggiornano in tempo reale." },
            filters: {
              searchLabel: "Cerca",
              searchPlaceholder: "Es. Adria, Hobby, 2021...",
              category: "Categoria",
              all: "Tutte",
              status: "Stato",
              any: "Tutti",
              sort: "Ordina",
              price: "Prezzo",
              min: "Min",
              max: "Max",
              onlyWithPhotos: "Solo con foto"
            },
            status: { excellent: "Ottimo", good: "Buono", toFix: "Da sistemare", new: "Nuovo", sold: "Venduto" },
            sort: { newest: "Più recenti", priceAsc: "Prezzo crescente", priceDesc: "Prezzo decrescente", yearDesc: "Anno più nuovo", yearAsc: "Anno più vecchio" },
            meta: { totalCards: "Totale schede", results: "Risultati", updated: "Aggiornamento" },
            results: { title: "Disponibilità", liveStatus: "{{count}} risultati" },
            empty: { noResults: "Nessun risultato. Prova a cambiare filtri o aggiungi nuove schede dall'area admin." },
            detail: {
              copyLink: "Copia link",
              close: "Chiudi",
              copied: "Copiato",
              copyError: "Impossibile copiare il link.",
              meta: "ID {{id}} • {{category}} • Anno {{year}} • Stato {{status}}",
              noPhotoAvailable: "Nessuna foto disponibile.",
              photoAlt: "Foto di {{title}}",
              planimetryAlt: "Planimetria",
              openVideo: "Apri video"
            },
            lightbox: { close: "Chiudi" },
            card: { details: "Dettagli", noPhoto: "Nessuna foto", yearPrefix: "Anno" },
            transport: {
              sectionTitle: "Calcolatore trasporto roulotte",
              sectionHint: "Apri una scheda roulotte per compilare automaticamente i dati tecnici. Inserisci solo partenza e destinazione.",
              goToCatalog: "Vai al catalogo",
              dialogTitle: "Calcolatore trasporto",
              dialogHint: "Dati già compilati dalla scheda. Inserisci solo partenza e destinazione.",
              openStandalone: "Apri in sezione dedicata",
              selected: "Selezione",
              trainableQuestion: "Roulotte trainabile?",
              perKm: "Costo al km (€/km)",
              length: "Lunghezza",
              width: "Larghezza",
              weight: "Peso",
              axles: "Doppio asse",
              trainable: "Trainabile",
              revised: "Revisionata",
              drawbar: "Timone",
              confirmData: "Confermo che i dati mostrati sono corretti",
              from: "Indirizzo di partenza",
              to: "Indirizzo di destinazione",
              calculate: "Calcola percorso",
              distance: "Distanza",
              duration: "Durata",
              distanceRoundTrip: "Distanza (andata/ritorno)",
              durationRoundTrip: "Durata (andata/ritorno)",
              type: "Tipologia",
              reason: "Motivo",
              estimateTitle: "Stima prezzo (andata/ritorno)",
              disclaimer: "Prezzo indicativo e non vincolante. È solo una stima. Contattaci per conferma finale."
            },
            errors: { loadData: "Si è verificato un errore nel caricamento dei dati. Riprova più tardi." }
          }
        },
        en: {
          translation: {
            a11y: { skipToContent: "Skip to content" },
            common: { caravan: "Caravan" },
            nav: { menu: "Menu", catalog: "Catalog", transport: "Transport", admin: "Admin" },
            actions: { adminArea: "Admin Area", editSite: "Edit site", resetFilters: "Reset filters", themeLight: "Theme: Light", themeDark: "Theme: Dark" },
            hero: { title: "Find the right caravan", text: "Filter by brand, model, year and condition. Results update in real time." },
            filters: {
              searchLabel: "Search",
              searchPlaceholder: "e.g. Adria, Hobby, 2021...",
              category: "Category",
              all: "All",
              status: "Condition",
              any: "Any",
              sort: "Sort",
              price: "Price",
              min: "Min",
              max: "Max",
              onlyWithPhotos: "Only with photos"
            },
            status: { excellent: "Excellent", good: "Good", toFix: "Needs work", new: "New", sold: "Sold" },
            sort: { newest: "Newest", priceAsc: "Price (low to high)", priceDesc: "Price (high to low)", yearDesc: "Year (newest)", yearAsc: "Year (oldest)" },
            meta: { totalCards: "Total listings", results: "Results", updated: "Updated" },
            results: { title: "Availability", liveStatus: "{{count}} results" },
            empty: { noResults: "No results. Try changing filters or add new listings from the admin area." },
            detail: {
              copyLink: "Copy link",
              close: "Close",
              copied: "Copied",
              copyError: "Unable to copy the link.",
              meta: "ID {{id}} • {{category}} • Year {{year}} • Status {{status}}",
              noPhotoAvailable: "No photo available.",
              photoAlt: "Photo of {{title}}",
              planimetryAlt: "Floor plan",
              openVideo: "Open video"
            },
            lightbox: { close: "Close" },
            card: { details: "Details", noPhoto: "No photo", yearPrefix: "Year" },
            transport: {
              sectionTitle: "Caravan transport calculator",
              sectionHint: "Open a listing to auto-fill the technical data. Enter only origin and destination.",
              goToCatalog: "Go to catalog",
              dialogTitle: "Transport calculator",
              dialogHint: "Data is auto-filled from the listing. Enter only origin and destination.",
              openStandalone: "Open dedicated section",
              selected: "Selected",
              trainableQuestion: "Towable caravan?",
              perKm: "Cost per km (€/km)",
              length: "Length",
              width: "Width",
              weight: "Weight",
              axles: "Twin axle",
              trainable: "Towable",
              revised: "Inspected",
              drawbar: "Drawbar",
              confirmData: "I confirm the displayed data is correct",
              from: "Origin address",
              to: "Destination address",
              calculate: "Calculate route",
              distance: "Distance",
              duration: "Duration",
              distanceRoundTrip: "Distance (round trip)",
              durationRoundTrip: "Duration (round trip)",
              type: "Transport type",
              reason: "Reason",
              estimateTitle: "Estimated price (round trip)",
              disclaimer: "Indicative and non-binding price. This is only an estimate. Contact us for final confirmation."
            },
            errors: { loadData: "An error occurred while loading data. Please try again later." }
          }
        },
        de: {
          translation: {
            a11y: { skipToContent: "Zum Inhalt springen" },
            common: { caravan: "Wohnwagen" },
            nav: { menu: "MenÃ¼", catalog: "Katalog", transport: "Transport", admin: "Admin" },
            actions: { adminArea: "Admin-Bereich", editSite: "Website bearbeiten", resetFilters: "Filter zurÃ¼cksetzen", themeLight: "Thema: Hell", themeDark: "Thema: Dunkel" },
            hero: { title: "Finde den richtigen Wohnwagen", text: "Filtere nach Marke, Modell, Jahr und Zustand. Ergebnisse aktualisieren sich in Echtzeit." },
            filters: {
              searchLabel: "Suchen",
              searchPlaceholder: "z. B. Adria, Hobby, 2021...",
              category: "Kategorie",
              all: "Alle",
              status: "Zustand",
              any: "Alle",
              sort: "Sortieren",
              price: "Preis",
              min: "Min",
              max: "Max",
              onlyWithPhotos: "Nur mit Fotos"
            },
            status: { excellent: "Sehr gut", good: "Gut", toFix: "ReparaturbedÃ¼rftig", new: "Neu", sold: "Verkauft" },
            sort: { newest: "Neueste", priceAsc: "Preis aufsteigend", priceDesc: "Preis absteigend", yearDesc: "Jahr (neueste)", yearAsc: "Jahr (Ã¤lteste)" },
            meta: { totalCards: "Gesamtanzeigen", results: "Ergebnisse", updated: "Aktualisiert" },
            results: { title: "VerfÃ¼gbarkeit", liveStatus: "{{count}} Ergebnisse" },
            empty: { noResults: "Keine Ergebnisse. Filter Ã¤ndern oder neue Anzeigen im Admin-Bereich hinzufÃ¼gen." },
            detail: {
              copyLink: "Link kopieren",
              close: "SchlieÃŸen",
              copied: "Kopiert",
              copyError: "Link konnte nicht kopiert werden.",
              meta: "ID {{id}} â€¢ {{category}} â€¢ Jahr {{year}} â€¢ Status {{status}}",
              noPhotoAvailable: "Kein Foto verfÃ¼gbar.",
              photoAlt: "Foto von {{title}}",
              planimetryAlt: "Grundriss",
              openVideo: "Video Ã¶ffnen"
            },
            lightbox: { close: "SchlieÃŸen" },
            card: { details: "Details", noPhoto: "Kein Foto", yearPrefix: "Jahr" },
            transport: {
              sectionTitle: "Transportrechner",
              sectionHint: "Ã–ffne ein Inserat, um technische Daten automatisch zu Ã¼bernehmen. Gib nur Start und Ziel ein.",
              goToCatalog: "Zum Katalog",
              dialogTitle: "Transportrechner",
              dialogHint: "Daten werden aus dem Inserat Ã¼bernommen. Gib nur Start und Ziel ein.",
              openStandalone: "In eigener Sektion Ã¶ffnen",
              selected: "Auswahl",
              trainableQuestion: "ZugfÃ¤higer Wohnwagen?",
              perKm: "Kosten pro km (â‚¬/km)",
              length: "LÃ¤nge",
              width: "Breite",
              weight: "Gewicht",
              axles: "Doppelachse",
              trainable: "ZugfÃ¤hig",
              revised: "GeprÃ¼ft",
              drawbar: "Deichsel",
              confirmData: "Ich bestÃ¤tige, dass die angezeigten Daten korrekt sind",
              from: "Startadresse",
              to: "Zieladresse",
              calculate: "Route berechnen",
              distance: "Distanz",
              duration: "Dauer",
              distanceRoundTrip: "Distanz (Hin- und RÃ¼ckfahrt)",
              durationRoundTrip: "Dauer (Hin- und RÃ¼ckfahrt)",
              type: "Transportart",
              reason: "BegrÃ¼ndung",
              estimateTitle: "PreisschÃ¤tzung (Hin- und RÃ¼ckfahrt)",
              disclaimer: "Richtwert und unverbindlich. Dies ist nur eine SchÃ¤tzung. Kontaktieren Sie uns zur finalen BestÃ¤tigung."
            },
            errors: { loadData: "Beim Laden der Daten ist ein Fehler aufgetreten. Bitte spÃ¤ter erneut versuchen." }
          }
        },
        fr: {
          translation: {
            a11y: { skipToContent: "Aller au contenu" },
            common: { caravan: "Caravane" },
            nav: { menu: "Menu", catalog: "Catalogue", transport: "Transport", admin: "Admin" },
            actions: { adminArea: "Espace Admin", editSite: "Modifier le site", resetFilters: "RÃ©initialiser", themeLight: "ThÃ¨meÂ : Clair", themeDark: "ThÃ¨meÂ : Sombre" },
            hero: { title: "Trouvez la bonne caravane", text: "Filtrez par marque, modÃ¨le, annÃ©e et Ã©tat. Les rÃ©sultats se mettent Ã  jour en temps rÃ©el." },
            filters: {
              searchLabel: "Rechercher",
              searchPlaceholder: "ex. Adria, Hobby, 2021...",
              category: "CatÃ©gorie",
              all: "Toutes",
              status: "Ã‰tat",
              any: "Tous",
              sort: "Trier",
              price: "Prix",
              min: "Min",
              max: "Max",
              onlyWithPhotos: "Seulement avec photos"
            },
            status: { excellent: "Excellent", good: "Bon", toFix: "Ã€ rÃ©parer", new: "Neuf", sold: "Vendu" },
            sort: { newest: "Les plus rÃ©centes", priceAsc: "Prix croissant", priceDesc: "Prix dÃ©croissant", yearDesc: "AnnÃ©e (plus rÃ©cente)", yearAsc: "AnnÃ©e (plus ancienne)" },
            meta: { totalCards: "Annonces totales", results: "RÃ©sultats", updated: "Mise Ã  jour" },
            results: { title: "DisponibilitÃ©", liveStatus: "{{count}} rÃ©sultats" },
            empty: { noResults: "Aucun rÃ©sultat. Essayez de changer les filtres ou ajoutez des annonces depuis l'espace admin." },
            detail: {
              copyLink: "Copier le lien",
              close: "Fermer",
              copied: "CopiÃ©",
              copyError: "Impossible de copier le lien.",
              meta: "ID {{id}} â€¢ {{category}} â€¢ AnnÃ©e {{year}} â€¢ Statut {{status}}",
              noPhotoAvailable: "Aucune photo disponible.",
              photoAlt: "Photo de {{title}}",
              planimetryAlt: "Plan",
              openVideo: "Ouvrir la vidÃ©o"
            },
            lightbox: { close: "Fermer" },
            card: { details: "DÃ©tails", noPhoto: "Aucune photo", yearPrefix: "AnnÃ©e" },
            transport: {
              sectionTitle: "Calculateur de transport",
              sectionHint: "Ouvrez une fiche pour prÃ©remplir les donnÃ©es techniques. Saisissez seulement dÃ©part et arrivÃ©e.",
              goToCatalog: "Aller au catalogue",
              dialogTitle: "Calculateur de transport",
              dialogHint: "DonnÃ©es prÃ©remplies depuis la fiche. Saisissez seulement dÃ©part et arrivÃ©e.",
              openStandalone: "Ouvrir la section dÃ©diÃ©e",
              selected: "SÃ©lection",
              trainableQuestion: "Caravane tractable ?",
              perKm: "CoÃ»t par km (â‚¬/km)",
              length: "Longueur",
              width: "Largeur",
              weight: "Poids",
              axles: "Double essieu",
              trainable: "Tractable",
              revised: "RÃ©visÃ©e",
              drawbar: "Timon",
              confirmData: "Je confirme que les donnÃ©es affichÃ©es sont correctes",
              from: "Adresse de dÃ©part",
              to: "Adresse d'arrivÃ©e",
              calculate: "Calculer l'itinÃ©raire",
              distance: "Distance",
              duration: "DurÃ©e",
              distanceRoundTrip: "Distance (aller/retour)",
              durationRoundTrip: "DurÃ©e (aller/retour)",
              type: "Type de transport",
              reason: "Motif",
              estimateTitle: "Estimation (aller/retour)",
              disclaimer: "Prix indicatif et non contraignant. Ceci est seulement une estimation. Contactez-nous pour la confirmation finale."
            },
            errors: { loadData: "Une erreur s'est produite lors du chargement des donnÃ©es. Veuillez rÃ©essayer plus tard." }
          }
        }
      };

      if (window.i18next && typeof window.i18next.init === 'function') {
        await window.i18next.init({
          lng: currentLang,
          fallbackLng: 'it',
          resources,
          interpolation: { escapeValue: false }
        });
      }

      applyTranslations();
    }

    function setCanonicalAndMeta() {
      function ensureMetaName(name) {
        const n = String(name || '').trim();
        if (!n) return null;
        let el = document.querySelector(`meta[name="${CSS.escape(n)}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('name', n);
          document.head.appendChild(el);
        }
        return el;
      }

      function ensureMetaProperty(prop) {
        const p = String(prop || '').trim();
        if (!p) return null;
        let el = document.querySelector(`meta[property="${CSS.escape(p)}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('property', p);
          document.head.appendChild(el);
        }
        return el;
      }

      function setMetaName(name, content) {
        const el = ensureMetaName(name);
        if (!el) return;
        el.setAttribute('content', String(content ?? ''));
      }

      function setMetaProperty(prop, content) {
        const el = ensureMetaProperty(prop);
        if (!el) return;
        el.setAttribute('content', String(content ?? ''));
      }

      function getIndexBaseUrl() {
        const u = new URL(location.href);
        u.hash = '';
        u.search = '';
        if (!u.pathname.toLowerCase().endsWith('index.html')) {
          if (u.pathname.endsWith('/')) u.pathname = u.pathname + 'index.html';
          else if (!u.pathname.toLowerCase().endsWith('.html')) u.pathname = u.pathname + '/index.html';
        }
        return u.toString();
      }

      function getOgLocaleFromLang(lang) {
        const l = String(lang || 'it').toLowerCase();
        if (l === 'en') return 'en_US';
        if (l === 'de') return 'de_DE';
        if (l === 'fr') return 'fr_FR';
        return 'it_IT';
      }

      function setCanonical(url) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'canonical';
          document.head.appendChild(link);
        }
        link.href = String(url || '');
      }

      function upsertJsonLd(id, data) {
        const scriptId = String(id || '').trim();
        if (!scriptId) return;
        let s = document.getElementById(scriptId);
        if (!s) {
          s = document.createElement('script');
          s.id = scriptId;
          s.type = 'application/ld+json';
          document.head.appendChild(s);
        }
        s.textContent = JSON.stringify(data);
      }

      function removeJsonLd(id) {
        try {
          const el = document.getElementById(String(id || ''));
          if (el) el.remove();
        } catch {}
      }

      const baseUrl = getIndexBaseUrl();
      const detailId = currentDetailId || pendingUrlDetailId || '';
      const canonicalUrl = detailId ? (function () {
        const u = new URL(baseUrl);
        u.searchParams.set('id', String(detailId));
        return u.toString();
      })() : baseUrl;

      const shareUrl = (function () {
        const u = new URL(location.href);
        u.hash = '';
        const id = String(currentDetailId || '').trim();
        if (id && location.origin && location.origin !== 'null') return location.origin + '/p/' + encodeURIComponent(id);
        return u.toString();
      })();

      const defaultTitle = 'Roulotte online';
      const descriptionEl = document.querySelector('meta[name="description"]');
      const defaultDescription = String(descriptionEl && descriptionEl.getAttribute('content') || '').trim();

      setCanonical(canonicalUrl);
      setMetaProperty('og:url', shareUrl);
      setMetaProperty('og:locale', getOgLocaleFromLang(currentLang));

      if (currentDetailId) {
        const desc = truncate(stripHtml(detailNote && !detailNote.hidden ? detailNote.innerHTML : ''), 160) || defaultDescription;
        const title = String(detailTitle && detailTitle.textContent || '').trim() || defaultTitle;
        const img = (Array.isArray(currentGalleryPhotos) && currentGalleryPhotos[0]) ? String(currentGalleryPhotos[0]) : '';

        document.title = `${defaultTitle} – ${title}`;
        if (descriptionEl) descriptionEl.setAttribute('content', desc);

        setMetaProperty('og:type', 'product');
        setMetaProperty('og:title', title);
        setMetaProperty('og:description', desc);
        setMetaProperty('og:image', img);
        setMetaName('twitter:card', img ? 'summary_large_image' : 'summary');
        setMetaName('twitter:title', title);
        setMetaName('twitter:description', desc);
        setMetaName('twitter:image', img);

        const offerPrice = Number.isFinite(Number(detailPrice && detailPrice.textContent ? String(detailPrice.textContent).replace(/[^\d]/g, '') : ''))
          ? Number(String(detailPrice.textContent).replace(/[^\d]/g, ''))
          : null;
        const ld = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": title,
          "description": desc,
          "sku": String(currentDetailId),
          "url": canonicalUrl,
          "image": img ? [img] : undefined,
          "offers": offerPrice !== null ? {
            "@type": "Offer",
            "priceCurrency": "EUR",
            "price": offerPrice,
            "availability": "https://schema.org/InStock",
            "url": canonicalUrl
          } : undefined
        };
        Object.keys(ld).forEach(k => (ld[k] === undefined) && delete ld[k]);
        upsertJsonLd('jsonLdDetail', ld);
      } else {
        document.title = defaultTitle;
        if (descriptionEl && defaultDescription) descriptionEl.setAttribute('content', defaultDescription);
        setMetaProperty('og:type', 'website');
        setMetaProperty('og:title', defaultTitle);
        setMetaProperty('og:description', defaultDescription);
        setMetaProperty('og:image', '');
        setMetaName('twitter:card', 'summary');
        setMetaName('twitter:title', defaultTitle);
        setMetaName('twitter:description', defaultDescription);
        setMetaName('twitter:image', '');
        removeJsonLd('jsonLdDetail');
      }
    }

    function injectJsonLdWebSite() {
      const base = location.origin + '/index.html';
      const target = location.origin + '/index.html?q={search_term_string}';
      const data = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": base,
        "name": "Roulotte online",
        "potentialAction": {
          "@type": "SearchAction",
          "target": target,
          "query-input": "required name=search_term_string"
        }
      };
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(data);
      document.head.appendChild(s);
    }
    function getPhotoUrl(ph, variant) {
      if (!ph) return '';
      if (typeof ph === 'string') return ph;
      if (variant === 'thumb') return String(ph.thumb || ph.src || '');
      return String(ph.src || ph.thumb || '');
    }
    function stripHtml(html) {
      const div = document.createElement('div');
      div.innerHTML = String(html || '');
      return div.textContent || div.innerText || '';
    }
    function truncate(s, n) {
      const t = String(s || '');
      if (t.length <= n) return t;
      return t.slice(0, n - 1) + '…';
    }
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
    function openLightbox(idx) {
      if (!Array.isArray(currentGalleryPhotos) || !currentGalleryPhotos.length) return;
      lightboxIndex = Math.max(0, Math.min(idx, currentGalleryPhotos.length - 1));
      lbImg.src = currentGalleryPhotos[lightboxIndex];
      const cap = currentGalleryCaptions[lightboxIndex] || '';
      const lbC = document.getElementById('lbCaption');
      const lbN = document.getElementById('lbCounter');
      if (lbC) lbC.textContent = cap;
      if (lbN) lbN.textContent = `${lightboxIndex + 1}/${currentGalleryPhotos.length}`;
      lastFocusBeforeLightbox = document.activeElement;
      imgLightbox.style.display = 'flex';
      imgLightbox.setAttribute('aria-hidden', 'false');
      const container = document.querySelector('.container');
      if (container) container.setAttribute('aria-hidden', 'true');
      try { document.body.style.overflow = 'hidden'; } catch {}
      lbClose.focus();
    }
    function closeLightbox() {
      imgLightbox.style.display = 'none';
      imgLightbox.setAttribute('aria-hidden', 'true');
      const container = document.querySelector('.container');
      if (container) container.removeAttribute('aria-hidden');
      try { document.body.style.overflow = ''; } catch {}
      lbImg.src = '';
      try {
        const el = lastFocusBeforeLightbox;
        lastFocusBeforeLightbox = null;
        if (el && typeof el.focus === 'function') el.focus();
      } catch {}
    }
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => openLightbox(lightboxIndex - 1 < 0 ? currentGalleryPhotos.length - 1 : lightboxIndex - 1));
    lbNext.addEventListener('click', () => openLightbox((lightboxIndex + 1) % currentGalleryPhotos.length));
    imgLightbox.addEventListener('click', (e) => {
      const r = imgLightbox.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside && e.target === imgLightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (imgLightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') lbPrev.click();
        else if (e.key === 'ArrowRight') lbNext.click();
      }
    });

    function formatPrice(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '€ —';
      return '€ ' + n.toLocaleString(getLocaleForLang(currentLang));
    }

    function normalize(s) {
      return String(s ?? '').trim().toLowerCase();
    }
    
    function parseNumberOrNull(v) {
      const s = String(v ?? '').trim();
      if (s === '') return null;
      const n = Number(s.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }

    function parseBoolOrNull(v) {
      if (v === true || v === false) return v;
      if (v === undefined || v === null) return null;
      const s = String(v).trim().toLowerCase();
      if (!s) return null;
      if (s === 'si' || s === 'sÃ¬' || s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on' || s === 'presente') return true;
      if (s === 'no' || s === 'false' || s === '0' || s === 'off' || s === 'assente') return false;
      return null;
    }

    const API_BASE_STORAGE_KEY = 'roulotte_api_base_url';
    const DEFAULT_REMOTE_API_BASE_URL = 'https://roulotte-online-foto.onrender.com';

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

    function getApiBaseUrlOverride(opts) {
      const o = (opts && typeof opts === 'object') ? opts : {};
      const includeStorage = o.includeStorage !== undefined ? !!o.includeStorage : true;
      try {
        const p = new URLSearchParams(location.search || '');
        const qp = String(p.get('api') || p.get('api_base') || '').trim();
        if (qp) {
          const persist = String(p.get('persist_api') || '').trim() === '1' || (location && location.protocol === 'file:');
          if (persist) return setApiBaseUrlOverride(qp);
          return normalizeApiBaseUrl(qp);
        }
      } catch {}
      if (!includeStorage) return '';
      try {
        const v = String(localStorage.getItem(API_BASE_STORAGE_KEY) || '').trim();
        return normalizeApiBaseUrl(v);
      } catch {
        return '';
      }
    }

    function getApiBaseUrl() {
      const isLocalHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      if (isLocalHost) return 'http://localhost:3001';
      if (location && location.protocol === 'file:') return getApiBaseUrlOverride({ includeStorage: true }) || DEFAULT_REMOTE_API_BASE_URL;
      return getApiBaseUrlOverride({ includeStorage: false }) || '';
    }

    let posthogInitStarted = false;
    let posthogReady = false;

    function normalizePosthogHost(host) {
      const h = String(host || '').trim();
      if (!h) return '';
      if (h.startsWith('http://') || h.startsWith('https://')) return h.replace(/\/+$/, '');
      const proto = location.protocol === 'http:' ? 'http://' : 'https://';
      return (proto + h).replace(/\/+$/, '');
    }

    function loadScriptOnce(src) {
      return new Promise((resolve, reject) => {
        const s = String(src || '').trim();
        if (!s) return reject(new Error('missing_script_src'));
        const existing = Array.from(document.getElementsByTagName('script')).some((x) => String(x && x.src || '').trim() === s);
        if (existing) return resolve(true);
        const el = document.createElement('script');
        el.async = true;
        el.src = s;
        el.onload = () => resolve(true);
        el.onerror = () => reject(new Error('script_load_error'));
        document.head.appendChild(el);
      });
    }

    async function fetchJsonWithTimeout(url, timeoutMs = 1800) {
      const u = String(url || '').trim();
      if (!u) return null;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), Math.max(250, Number(timeoutMs) || 0));
      try {
        const r = await fetch(u, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        return j && typeof j === 'object' ? j : null;
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    }

    function posthogCapture(eventName, props) {
      if (!posthogReady) return;
      const ev = String(eventName || '').trim();
      if (!ev) return;
      try {
        if (window.posthog && typeof window.posthog.capture === 'function') {
          window.posthog.capture(ev, props && typeof props === 'object' ? props : {});
        }
      } catch {}
    }

    function bindContactClickTracking() {
      if (window.__ph_contact_tracking_bound) return;
      window.__ph_contact_tracking_bound = true;
      document.addEventListener('click', (e) => {
        const t = e && e.target ? e.target : null;
        if (!t || !t.closest) return;
        const a = t.closest('a');
        if (!a) return;
        const href = String(a.getAttribute('href') || '').trim();
        if (!href) return;
        const lower = href.toLowerCase();
        let kind = '';
        if (lower.startsWith('tel:')) kind = 'telefono';
        else if (lower.includes('wa.me') || lower.includes('whatsapp')) kind = 'whatsapp';
        else return;
        posthogCapture('contact_click', {
          kind,
          roulotte_id: currentDetailId ? String(currentDetailId) : null
        });
      });
    }

    async function initPosthog() {
      if (posthogInitStarted) return;
      posthogInitStarted = true;
      const cfg = await fetchJsonWithTimeout(getApiBaseUrl() + '/api/config', 2000);
      const host = normalizePosthogHost(cfg && cfg.posthog_host);
      const key = String(cfg && cfg.posthog_key || '').trim();
      if (!host || !key) return;

      try {
        await loadScriptOnce(host + '/static/array.js');
      } catch {
        return;
      }

      if (!window.posthog || typeof window.posthog.init !== 'function') return;
      try {
        window.posthog.init(key, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          persistence: 'memory',
          disable_session_recording: true,
          mask_all_text: true,
          mask_all_element_attributes: true,
        });
        posthogReady = true;
      } catch {
        posthogReady = false;
      }

      if (posthogReady) bindContactClickTracking();
    }

    function formatBoolHuman(v) {
      if (v === true) return 'Sì';
      if (v === false) return 'No';
      return '—';
    }

    function formatMetersOrDash(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      return n.toLocaleString(getLocaleForLang(currentLang), { maximumFractionDigits: 2 }) + ' m';
    }

    function formatKgOrDash(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      return n.toLocaleString(getLocaleForLang(currentLang), { maximumFractionDigits: 0 }) + ' kg';
    }

    function formatKmOrDash(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      return n.toLocaleString(getLocaleForLang(currentLang), { maximumFractionDigits: 1 }) + ' km';
    }

    function formatMinutesOrDash(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return 'â€”';
      const mins = Math.max(0, Math.round(n));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h <= 0) return String(m) + ' min';
      return String(h) + ' h ' + String(m).padStart(2, '0') + ' min';
    }

    function getTransportDataFromR(r) {
      const obj = (r && typeof r === 'object') ? r : {};
      return {
        lunghezza: parseNumberOrNull(obj.lunghezza ?? obj.lunghezzaTotale ?? obj.length),
        larghezza: parseNumberOrNull(obj.larghezza ?? obj.width),
        peso: parseNumberOrNull(obj.peso ?? obj.pesoVuoto ?? obj.weight),
        doppioAsse: parseBoolOrNull(obj.doppioAsse),
        trainabile: parseBoolOrNull(obj.trainabile),
        revisionata: parseBoolOrNull(obj.revisionata),
        timone: parseBoolOrNull(obj.timone)
      };
    }

    function decideTransport(data) {
      const d = (data && typeof data === 'object') ? data : {};
      const hasBool = (v) => v === true || v === false;
      if (!hasBool(d.trainabile) || !hasBool(d.revisionata) || !hasBool(d.doppioAsse) || d.lunghezza === null || d.larghezza === null) {
        return { type: 'carrello / carroattrezzi', reason: 'dati mancanti o non verificabili' };
      }
      if (d.trainabile === true && d.revisionata === true) {
        return { type: 'traino auto', reason: 'roulotte trainabile e revisionata' };
      }
      const reasons = [];
      if (d.trainabile === false) reasons.push('roulotte non trainabile');
      if (d.revisionata === false) reasons.push('roulotte non revisionata');
      if (d.doppioAsse === true && d.revisionata === false) reasons.push('doppio asse e non revisionata');
      return { type: 'carrello / carroattrezzi', reason: reasons.join(', ') || 'non idonea al traino' };
    }

    const TRANSPORT_PER_KM_TRAINABLE_KEY = 'transport_per_km_trainable_v1';
    const TRANSPORT_PER_KM_NOT_TRAINABLE_KEY = 'transport_per_km_not_trainable_v1';
    const TRANSPORT_TRAINABLE_KEY = 'transport_trainable_v1';
    const DEFAULT_TRANSPORT_PER_KM = 1.30;

    function getPerKmStorageKey(trainable) {
      return trainable ? TRANSPORT_PER_KM_TRAINABLE_KEY : TRANSPORT_PER_KM_NOT_TRAINABLE_KEY;
    }

    function loadTrainablePreference() {
      try {
        const raw = localStorage.getItem(TRANSPORT_TRAINABLE_KEY);
        const v = parseBoolOrNull(raw);
        return v === true || v === false ? v : null;
      } catch {
        return null;
      }
    }

    function saveTrainablePreference(value) {
      if (value !== true && value !== false) return;
      try { localStorage.setItem(TRANSPORT_TRAINABLE_KEY, value ? 'true' : 'false'); } catch {}
    }

    function loadTransportPerKm(trainable) {
      try {
        const raw = localStorage.getItem(getPerKmStorageKey(trainable));
        const n = parseNumberOrNull(raw);
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_TRANSPORT_PER_KM;
      } catch {
        return DEFAULT_TRANSPORT_PER_KM;
      }
    }

    function saveTransportPerKm(trainable, value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return;
      try { localStorage.setItem(getPerKmStorageKey(trainable), String(n)); } catch {}
    }

    function calcEstimatePriceRoundTrip(distanceOneWayKm, costPerKm) {
      const km = Number(distanceOneWayKm);
      const c = Number(costPerKm);
      if (!Number.isFinite(km) || km <= 0) return null;
      if (!Number.isFinite(c) || c <= 0) return null;
      const totalKm = km * 2;
      return Math.max(0, Math.round(totalKm * c));
    }

    function boolToSelectValue(v) {
      if (v === true) return 'true';
      if (v === false) return 'false';
      return '';
    }

    function readTransportEdits(ctx) {
      if (!ctx) return ctx && ctx._data && typeof ctx._data === 'object' ? ctx._data : {};
      const prev = ctx._data && typeof ctx._data === 'object' ? ctx._data : {};
      const next = { ...prev };

      if (ctx.trainableEdit) {
        const t = parseBoolOrNull(ctx.trainableEdit.value);
        if (t === true || t === false) {
          next.trainabile = t;
          saveTrainablePreference(t);
        }
      }
      if (ctx.perKmEdit) {
        const v = parseNumberOrNull(ctx.perKmEdit.value);
        next.costoKm = v;
        const t = (next.trainabile === true || next.trainabile === false) ? next.trainabile : true;
        if (v !== null) saveTransportPerKm(t, v);
      }

      ctx._data = next;
      return next;
    }

    function applyTransportEditsFromData(ctx, data) {
      if (!ctx) return;
      const d = (data && typeof data === 'object') ? data : {};

      let trainable = (d.trainabile === true || d.trainabile === false) ? d.trainabile : null;
      if (trainable === null) trainable = loadTrainablePreference();
      if (trainable === null) trainable = true;

      if (ctx.trainableEdit) ctx.trainableEdit.value = boolToSelectValue(trainable);

      const perKm = loadTransportPerKm(trainable);
      if (ctx.perKmEdit) ctx.perKmEdit.value = String(perKm).replace('.', ',');
      if (ctx._data && typeof ctx._data === 'object') {
        ctx._data.trainabile = trainable;
        ctx._data.costoKm = perKm;
      }
    }

    function refreshTransportComputed(ctx) {
      if (!ctx) return;
      const d = readTransportEdits(ctx);
      const km = ctx._lastKm;
      const perKm = parseNumberOrNull(d.costoKm);
      if (Number.isFinite(km) && km > 0 && perKm !== null && perKm > 0) {
        const price = calcEstimatePriceRoundTrip(km, perKm);
        if (ctx.price) ctx.price.textContent = formatPrice(price);
      } else {
        if (ctx.price && (!Number.isFinite(km) || km <= 0)) ctx.price.textContent = 'â‚¬ â€”';
      }
    }

    function createMap(ctx) {
      if (!ctx || !ctx.mapEl) return null;
      if (!window.L || typeof window.L.map !== 'function') return null;
      if (ctx._map) return ctx._map;

      const map = window.L.map(ctx.mapEl, { zoomControl: true, scrollWheelZoom: false });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const layer = window.L.layerGroup().addTo(map);
      map.setView([41.9, 12.5], 6);

      ctx._map = { map, layer };
      return ctx._map;
    }

    function clearMap(ctx) {
      const m = ctx && ctx._map;
      if (!m || !m.layer) return;
      try { m.layer.clearLayers(); } catch {}
    }

    function drawRouteOnMap(ctx, from, to, geometry) {
      const m = createMap(ctx);
      if (!m) return;

      clearMap(ctx);

      if (from && Number.isFinite(from.lat) && Number.isFinite(from.lon)) {
        window.L.marker([from.lat, from.lon]).addTo(m.layer);
      }
      if (to && Number.isFinite(to.lat) && Number.isFinite(to.lon)) {
        window.L.marker([to.lat, to.lon]).addTo(m.layer);
      }

      const coords = geometry && geometry.type === 'LineString' && Array.isArray(geometry.coordinates)
        ? geometry.coordinates
        : null;
      if (coords && coords.length >= 2) {
        const latLngs = coords
          .map((p) => Array.isArray(p) && p.length >= 2 ? [Number(p[1]), Number(p[0])] : null)
          .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (latLngs.length >= 2) {
          const line = window.L.polyline(latLngs, { color: '#2563eb', weight: 5, opacity: 0.9 }).addTo(m.layer);
          try { m.map.fitBounds(line.getBounds().pad(0.18)); } catch {}
        }
      }
    }

    function setCalcEnabled(ctx) {
      if (!ctx || !ctx.calcBtn || !ctx.from || !ctx.to || !ctx.trainableEdit || !ctx.perKmEdit) return;
      const fromOk = !!String(ctx.from.value || '').trim();
      const toOk = !!String(ctx.to.value || '').trim();
      const trainable = parseBoolOrNull(ctx.trainableEdit.value);
      const perKm = parseNumberOrNull(ctx.perKmEdit.value);
      const ok = fromOk && toOk && (trainable === true || trainable === false) && perKm !== null && perKm > 0;
      ctx.calcBtn.disabled = !ok;
    }

    async function runTransportCalc(ctx, data) {
      if (!ctx) return;
      const fromAddress = String(ctx.from && ctx.from.value || '').trim();
      const toAddress = String(ctx.to && ctx.to.value || '').trim();
      if (!fromAddress || !toAddress) return;

      if (ctx.status) ctx.status.textContent = 'Calcolo in corsoâ€¦';

      try {
        const res = await fetch(getApiBaseUrl() + '/api/transport/route', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromAddress, toAddress })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const code = json && json.error ? String(json.error) : 'SERVER_ERROR';
          throw new Error(code);
        }

        const decision = decideTransport(data);
        const km = json && json.distance_km !== undefined ? Number(json.distance_km) : null;
        const mins = json && json.duration_min !== undefined ? Number(json.duration_min) : null;
        const perKm = parseNumberOrNull(data && data.costoKm);
        const price = calcEstimatePriceRoundTrip(km, perKm);
        const totalKm = Number.isFinite(km) ? km * 2 : null;
        const totalMins = Number.isFinite(mins) ? mins * 2 : null;

        if (ctx.distance) ctx.distance.textContent = formatKmOrDash(totalKm);
        if (ctx.duration) ctx.duration.textContent = formatMinutesOrDash(totalMins);
        if (ctx.price) ctx.price.textContent = formatPrice(price);

        ctx._lastKm = Number.isFinite(km) ? km : null;

        posthogCapture('transport_calc_success', {
          context: (ctx === transportDialog) ? 'dialog' : 'sezione',
          roulotte_id: currentDetailId ? String(currentDetailId) : null,
          distance_one_way_km: Number.isFinite(km) ? km : null,
          duration_one_way_min: Number.isFinite(mins) ? mins : null
        });

        drawRouteOnMap(ctx, json.from, json.to, json.geometry);

        if (ctx.status) ctx.status.textContent = '';
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        posthogCapture('transport_calc_error', {
          context: (ctx === transportDialog) ? 'dialog' : 'sezione',
          roulotte_id: currentDetailId ? String(currentDetailId) : null,
          error: msg || 'unknown'
        });
        if (ctx.status) {
          if (msg === 'ORS_NOT_CONFIGURED') ctx.status.textContent = 'Servizio di calcolo percorso non configurato.';
          else if (msg === 'FROM_NOT_FOUND') ctx.status.textContent = 'Indirizzo di partenza non trovato.';
          else if (msg === 'TO_NOT_FOUND') ctx.status.textContent = 'Indirizzo di destinazione non trovato.';
          else ctx.status.textContent = 'Errore nel calcolo del percorso.';
        }
      }
    }
    
    function getFilterState() {
      return {
        q: String(qEl?.value || ''),
        category: String(categoryEl?.value || ''),
        stato: String(statoEl?.value || ''),
        sort: String(sortEl?.value || 'newest'),
        priceMin: String(priceMinEl?.value || ''),
        priceMax: String(priceMaxEl?.value || ''),
        hasPhoto: !!hasPhotoEl?.checked
      };
    }

    function applyFilterState(state) {
      if (!state || typeof state !== 'object') return;
      if (qEl && state.q !== undefined) qEl.value = String(state.q || '');
      if (statoEl && state.stato !== undefined) statoEl.value = String(state.stato || '');
      if (sortEl && state.sort !== undefined) sortEl.value = String(state.sort || 'newest');
      if (categoryEl && state.category !== undefined) categoryEl.value = String(state.category || '');
      if (priceMinEl && state.priceMin !== undefined) priceMinEl.value = String(state.priceMin || '');
      if (priceMaxEl && state.priceMax !== undefined) priceMaxEl.value = String(state.priceMax || '');
      if (hasPhotoEl && state.hasPhoto !== undefined) hasPhotoEl.checked = !!state.hasPhoto;
    }

    function getUrlState() {
      const p = new URLSearchParams(location.search);
      return {
        q: p.get('q') || '',
        category: p.get('category') || '',
        stato: p.get('stato') || '',
        sort: p.get('sort') || '',
        priceMin: p.get('min') || '',
        priceMax: p.get('max') || '',
        hasPhoto: p.get('photo') === '1',
        id: p.get('id') || ''
      };
    }

    function setUrlState(state) {
      const url = new URL(location.href);
      const next = new URLSearchParams(url.search);
      const setOrDel = (k, v) => {
        const s = String(v ?? '').trim();
        if (s) next.set(k, s);
        else next.delete(k);
      };
      setOrDel('q', state.q);
      setOrDel('category', state.category);
      setOrDel('stato', state.stato);
      if (state.sort && state.sort !== 'newest') next.set('sort', state.sort);
      else next.delete('sort');
      setOrDel('min', state.priceMin);
      setOrDel('max', state.priceMax);
      if (state.hasPhoto) next.set('photo', '1');
      else next.delete('photo');
      if (state.id) next.set('id', state.id);
      else next.delete('id');
      url.search = next.toString();
      history.replaceState(null, '', url.toString());
    }

    function persistFilters() {
      const state = getFilterState();
      try { localStorage.setItem('public_filters_v1', JSON.stringify(state)); } catch {}
      setUrlState({ ...state, id: currentDetailId || pendingUrlDetailId || '' });
    }

    function restoreFilters() {
      const urlState = getUrlState();
      const fromUrl = {
        q: urlState.q,
        category: urlState.category,
        stato: urlState.stato,
        sort: urlState.sort || 'newest',
        priceMin: urlState.priceMin,
        priceMax: urlState.priceMax,
        hasPhoto: urlState.hasPhoto
      };
      const hasAnyUrl = Object.values(fromUrl).some(v => (typeof v === 'boolean' ? v : String(v || '').trim() !== ''));
      if (hasAnyUrl) {
        applyFilterState(fromUrl);
        return;
      }
      try {
        const raw = localStorage.getItem('public_filters_v1');
        const saved = raw ? JSON.parse(raw) : null;
        if (saved) applyFilterState(saved);
      } catch {}
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

    async function fetchRoulotteById(id, timeoutMs = 2500) {
      const publicId = String(id || '').trim();
      if (!publicId) return null;
      if (window.RoulotteStore && typeof window.RoulotteStore.getRoulotteById === 'function') {
        return await window.RoulotteStore.getRoulotteById(publicId, timeoutMs);
      }
      if (typeof fetch !== 'function') return null;
      const base = getApiBaseUrl();
      const url = (base || '') + '/api/roulottes/' + encodeURIComponent(publicId);
      if (typeof AbortController === 'undefined') {
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('remote_get_failed');
        const obj = await res.json().catch(() => null);
        return obj && typeof obj === 'object' ? obj : null;
      }
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('remote_get_failed');
        const obj = await res.json().catch(() => null);
        return obj && typeof obj === 'object' ? obj : null;
      } finally {
        clearTimeout(t);
      }
    }

    function matchQuery(r, q, categoriesById) {
      if (!q) return true;
      const hay = [
        r.marca,
        r.modello,
        r.stato,
        r.anno,
        r.id,
        categoriesById?.[r.categoryId],
        r.tipologiaMezzo
      ].map(normalize).join(' ');
      return hay.includes(q);
    }

    function applySort(items, sort) {
      const arr = [...items];
      if (sort === 'priceAsc') arr.sort((a,b) => (Number(a.prezzo)||0) - (Number(b.prezzo)||0));
      else if (sort === 'priceDesc') arr.sort((a,b) => (Number(b.prezzo)||0) - (Number(a.prezzo)||0));
      else if (sort === 'yearDesc') arr.sort((a,b) => (Number(b.anno)||0) - (Number(a.anno)||0));
      else if (sort === 'yearAsc') arr.sort((a,b) => (Number(a.anno)||0) - (Number(b.anno)||0));
      else arr.sort((a,b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      return arr;
    }

    let remoteSearchSupported = null;
    let remoteActive = false;
    let remoteResults = [];
    let remoteSeq = 0;
    let remoteTimer = null;
    let lastRemoteKey = '';
    let dataLoadError = false;
    let shareToken = '';
    let shareMode = false;
    let shareRoulottes = [];
    let shareTitle = '';
    let shareExpiresAt = null;

    function getShareTokenFromUrl() {
      try {
        const p = new URLSearchParams(location.search || '');
        return String(p.get('share') || '').trim();
      } catch {
        return '';
      }
    }

    async function loadShareSelection(token, timeoutMs = 2500) {
      const t = String(token || '').trim();
      if (!t) return { ok: false, code: 'NOT_FOUND' };
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), Math.max(300, Number(timeoutMs) || 0)) : null;
      try {
        const origin = (function () {
          try {
            if (location && location.origin && location.origin !== 'null') return String(location.origin || '');
          } catch {}
          return '';
        })();
        const url = origin + '/api/share-links/roulottes?token=' + encodeURIComponent(t);
        const r = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined });
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          const code = j && j.error ? String(j.error) : String(r.status);
          return { ok: false, code };
        }
        const list = j && Array.isArray(j.roulottes) ? j.roulottes : [];
        return {
          ok: true,
          title: String(j && j.title || '').trim(),
          expiresAt: j && j.expiresAt ? j.expiresAt : null,
          roulottes: list
        };
      } catch (e) {
        return { ok: false, code: 'NETWORK_ERROR' };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    function getRemoteParamsFromUi() {
      const q = String(qEl.value || '').trim();
      const stato = String(statoEl.value || '').trim();
      const minPrice = parseNumberOrNull(priceMinEl?.value);
      const maxPrice = parseNumberOrNull(priceMaxEl?.value);
      const hasPhoto = !!hasPhotoEl?.checked;
      const sort = String(sortEl.value || '').trim();
      return {
        q,
        stato,
        min: minPrice,
        max: maxPrice,
        hasPhoto,
        sort,
        limit: 100
      };
    }

    function shouldUseRemoteSearch(params) {
      if (shareMode) return false;
      if (remoteSearchSupported === false) return false;
      if (!window.RoulotteStore || typeof window.RoulotteStore.searchRoulottes !== 'function') return false;
      const p = params && typeof params === 'object' ? params : {};
      return !!(
        String(p.q || '').trim() ||
        String(p.stato || '').trim() ||
        p.min !== null && p.min !== undefined ||
        p.max !== null && p.max !== undefined ||
        !!p.hasPhoto ||
        (String(p.sort || '').trim() && String(p.sort || '').trim() !== 'newest')
      );
    }

    function normalizeRemoteItem(r) {
      const obj = (r && typeof r === 'object') ? r : {};
      const photos = Array.isArray(obj.photos) ? obj.photos : [];
      const note = obj.note !== undefined && obj.note !== null
        ? String(obj.note)
        : (obj.descrizione !== undefined && obj.descrizione !== null ? String(obj.descrizione) : '');
      return { ...obj, photos, note };
    }

    async function runRemoteSearch() {
      const params = getRemoteParamsFromUi();
      if (!shouldUseRemoteSearch(params)) {
        if (remoteActive) {
          remoteActive = false;
          remoteResults = [];
          lastRemoteKey = '';
          render();
        }
        return;
      }

      const key = JSON.stringify(params);
      if (key === lastRemoteKey && remoteActive) return;

      const seq = ++remoteSeq;
      try {
        const list = await window.RoulotteStore.searchRoulottes(params, 2000);
        if (seq !== remoteSeq) return;
        remoteSearchSupported = true;
        remoteResults = (Array.isArray(list) ? list : []).map(normalizeRemoteItem);
        remoteActive = true;
        lastRemoteKey = key;
        render();
      } catch (e) {
        if (seq !== remoteSeq) return;
        const msg = String(e && e.message ? e.message : e);
        if (msg === 'remote_search_not_supported') remoteSearchSupported = false;
        remoteActive = false;
        remoteResults = [];
        lastRemoteKey = '';
        render();
      }
    }

    function scheduleRemoteSearch(delayMs = 240) {
      if (remoteTimer) clearTimeout(remoteTimer);
      remoteTimer = setTimeout(runRemoteSearch, delayMs);
    }

    function updateTransportUi(ctx, title, data) {
      if (!ctx) return;
      const d = (data && typeof data === 'object') ? data : {};
      const decision = decideTransport(d);

      if (ctx.title) {
        const t = String(title || 'â€”');
        if ('value' in ctx.title) ctx.title.value = t;
        else ctx.title.textContent = t;
      }
      if (ctx.length) ctx.length.textContent = formatMetersOrDash(d.lunghezza);
      if (ctx.width) ctx.width.textContent = formatMetersOrDash(d.larghezza);
      if (ctx.weight) ctx.weight.textContent = formatKgOrDash(d.peso);
      if (ctx.axles) ctx.axles.textContent = formatBoolHuman(d.doppioAsse);
      if (ctx.trainable) ctx.trainable.textContent = formatBoolHuman(d.trainabile);
      if (ctx.revised) ctx.revised.textContent = formatBoolHuman(d.revisionata);
      if (ctx.drawbar) ctx.drawbar.textContent = formatBoolHuman(d.timone);

      if (ctx.type) ctx.type.textContent = decision.type;
      if (ctx.reason) ctx.reason.textContent = decision.reason;
      if (ctx.distance) ctx.distance.textContent = 'â€”';
      if (ctx.duration) ctx.duration.textContent = 'â€”';
      if (ctx.price) ctx.price.textContent = 'â‚¬ â€”';
      if (ctx.status) ctx.status.textContent = '';

      if (ctx.confirm) ctx.confirm.checked = false;
      ctx._data = d;
      ctx._title = String(title || '');
      ctx._lastKm = null;

      applyTransportEditsFromData(ctx, d);

      clearMap(ctx);
      setCalcEnabled(ctx);
    }

    function saveLastTransport(title, data) {
      try {
        const payload = { title: String(title || ''), data: data && typeof data === 'object' ? data : null };
        localStorage.setItem('transport_last', JSON.stringify(payload));
      } catch {}
    }

    function loadLastTransport() {
      try {
        const raw = localStorage.getItem('transport_last');
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') return null;
        if (!obj.data || typeof obj.data !== 'object') return null;
        return { title: String(obj.title || ''), data: obj.data };
      } catch {
        return null;
      }
    }

    function wireCalculator(ctx) {
      if (!ctx) return;
      if (ctx.confirm) ctx.confirm.addEventListener('change', () => setCalcEnabled(ctx));
      if (ctx.from) ctx.from.addEventListener('input', () => setCalcEnabled(ctx));
      if (ctx.to) ctx.to.addEventListener('input', () => setCalcEnabled(ctx));
      const onEdit = () => {
        refreshTransportComputed(ctx);
        setCalcEnabled(ctx);
      };
      if (ctx.lengthEdit) ctx.lengthEdit.addEventListener('input', onEdit);
      if (ctx.widthEdit) ctx.widthEdit.addEventListener('input', onEdit);
      if (ctx.weightEdit) ctx.weightEdit.addEventListener('input', onEdit);
      if (ctx.axlesEdit) ctx.axlesEdit.addEventListener('change', onEdit);
      if (ctx.trainableEdit) ctx.trainableEdit.addEventListener('change', () => {
        const t = parseBoolOrNull(ctx.trainableEdit.value);
        if (t === true || t === false) {
          const perKm = loadTransportPerKm(t);
          if (ctx.perKmEdit) ctx.perKmEdit.value = String(perKm).replace('.', ',');
        }
        onEdit();
      });
      if (ctx.revisedEdit) ctx.revisedEdit.addEventListener('change', onEdit);
      if (ctx.drawbarEdit) ctx.drawbarEdit.addEventListener('change', onEdit);
      if (ctx.perKmEdit) ctx.perKmEdit.addEventListener('input', onEdit);
      if (ctx.calcBtn) ctx.calcBtn.addEventListener('click', async () => {
        posthogCapture('transport_calc_click', {
          context: (ctx === transportDialog) ? 'dialog' : 'sezione',
          roulotte_id: currentDetailId ? String(currentDetailId) : null
        });
        const data = readTransportEdits(ctx);
        await runTransportCalc(ctx, data);
      });
    }

    function openDetails(r) {
      ensureDetailDialogDom();
      refreshDomRefs();
      buildTransportContexts();
      if (!dialog || !detailTitle || !detailMeta || !detailPrice || !detailNote || !detailGallery || !closeDialog) return;
      const db = window.RoulotteStore.getDB();
      const categoriesById = Object.fromEntries((db.categories || []).map(c => [c.id, c.name]));
      detailTitle.textContent = `${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' });
      const categoryName = categoriesById[r.categoryId] || 'â€”';
      detailMeta.textContent = tr('detail.meta', {
        defaultValue: `ID ${r.id || 'â€”'} â€¢ ${categoryName} â€¢ Anno ${r.anno || 'â€”'} â€¢ Stato ${r.stato || 'â€”'}`,
        id: r.id || 'â€”',
        category: categoryName,
        year: r.anno || 'â€”',
        status: getStatusLabel(r.stato)
      });
      detailPrice.textContent = formatPrice(r.prezzo);
      lastFocusBeforeDetail = document.activeElement;
      pendingUrlDetailId = null;
      currentDetailId = r.id || null;
      posthogCapture('roulotte_view', { roulotte_id: currentDetailId ? String(currentDetailId) : null });
      const note = String(r.note || '').trim();
      if (note) {
        detailNote.hidden = false;
        detailNote.innerHTML = note;
      } else {
        detailNote.hidden = true;
        detailNote.innerHTML = '';
      }
      detailGallery.innerHTML = '';
      detailPlanimetria.style.display = 'none';
      detailVideo.style.display = 'none';
      const photos = Array.isArray(r.photos) ? r.photos : [];
      if (photos.length === 0) {
        const ph = document.createElement('div');
        ph.className = 'empty';
        ph.textContent = tr('detail.noPhotoAvailable', { defaultValue: 'Nessuna foto disponibile.' });
        detailGallery.appendChild(ph);
      } else {
        currentGalleryPhotos = photos.map(p => getPhotoUrl(p, 'src'));
        currentGalleryCaptions = photos.map(p => {
          if (typeof p === 'object' && p.alt) return p.alt;
          return '';
        });
        photos.forEach((item, i) => {
          const wrap = document.createElement('div');
          wrap.style.position = 'relative';
          wrap.style.borderRadius = '14px';
          wrap.style.overflow = 'hidden';
          wrap.style.border = '1px solid var(--border)';
          wrap.style.height = '150px';
          const url = getPhotoUrl(item, 'src');
          const ph = typeof item === 'object' ? String(item.placeholder || '') : '';
          if (ph) {
            wrap.style.backgroundImage = `url(${ph})`;
            wrap.style.backgroundSize = 'cover';
            wrap.style.backgroundPosition = 'center';
            wrap.style.filter = 'blur(6px)';
          }
          const img = document.createElement('img');
          const alt = (typeof item === 'object' && item.alt)
            ? item.alt
            : tr('detail.photoAlt', { defaultValue: `Foto di ${detailTitle.textContent}`, title: detailTitle.textContent });
          img.alt = alt;
          img.src = getPhotoUrl(item, 'thumb');
          img.srcset = [
            getPhotoUrl(item, 'thumb') + ' 480w',
            getPhotoUrl(item, 'src') + ' 1280w'
          ].join(', ');
          img.sizes = '(max-width:640px) 100vw, 33vw';
          img.loading = i === 0 ? 'eager' : 'lazy';
          img.decoding = 'async';
          if (i === 0) img.setAttribute('fetchpriority', 'high');
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.addEventListener('load', () => { wrap.style.filter = 'none'; img.classList.add('loaded'); });
          img.addEventListener('click', () => openLightbox(i));
          wrap.appendChild(img);
          detailGallery.appendChild(wrap);
        });
      }
      if (r.planimetriaUrl) {
        detailPlanimetria.style.display = '';
        const img = document.createElement('img');
        img.alt = tr('detail.planimetryAlt', { defaultValue: 'Planimetria' });
        img.src = r.planimetriaUrl;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.width = '100%';
        img.style.border = '1px solid var(--border)';
        img.style.borderRadius = '14px';
        img.style.marginTop = '10px';
        detailPlanimetria.innerHTML = '';
        detailPlanimetria.appendChild(img);
      }
      if (r.videoUrl) {
        const embed = getEmbedUrl(r.videoUrl);
        if (embed) {
          detailVideo.style.display = '';
          const iframe = document.createElement('iframe');
          iframe.src = embed;
          iframe.width = '100%';
          iframe.height = '320';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '14px';
          iframe.loading = 'lazy';
          detailVideo.innerHTML = '';
          detailVideo.appendChild(iframe);
        } else {
          detailVideo.style.display = '';
          const a = document.createElement('a');
          a.href = r.videoUrl;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = tr('detail.openVideo', { defaultValue: 'Apri video' });
          detailVideo.innerHTML = '';
          detailVideo.appendChild(a);
        }
      }
      const tData = getTransportDataFromR(r);
      updateTransportUi(transportDialog, '', tData);
      updateTransportUi(transportStandalone, detailTitle.textContent, tData);
      saveLastTransport(detailTitle.textContent, tData);
      persistFilters();
      setCanonicalAndMeta();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', 'open');
      setTimeout(() => {
        const m = createMap(transportDialog);
        if (m && m.map && typeof m.map.invalidateSize === 'function') m.map.invalidateSize(true);
      }, 60);
      closeDialog.focus();
    }

    function closeDetails() {
      ensureDetailDialogDom();
      refreshDomRefs();
      if (!dialog) return;
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      currentDetailId = null;
      pendingUrlDetailId = null;
      persistFilters();
      setCanonicalAndMeta();
      try {
        const el = lastFocusBeforeDetail;
        lastFocusBeforeDetail = null;
        if (el && typeof el.focus === 'function') el.focus();
      } catch {}
    }

    function applyTheme(theme) {
      const next = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('public_theme', next);
      if (themeToggleEl) themeToggleEl.textContent = next === 'dark'
        ? tr('actions.themeDark', { defaultValue: 'Tema: Scuro' })
        : tr('actions.themeLight', { defaultValue: 'Tema: Chiaro' });
    }

    function initTheme() {
      const saved = localStorage.getItem('public_theme');
      if (saved) applyTheme(saved);
      else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }
    }

    function syncCategoryOptions(categories, selectedId) {
      if (!categoryEl) return;
      const current = selectedId !== undefined ? String(selectedId || '') : categoryEl.value;
      const cats = Array.isArray(categories) ? categories : [];
      categoryEl.innerHTML = '';
      const first = document.createElement('option');
      first.value = '';
      first.textContent = tr('filters.all', { defaultValue: 'Tutte' });
      categoryEl.appendChild(first);
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        categoryEl.appendChild(opt);
      });
      if (current) categoryEl.value = current;
    }

    function renderTemplateString(templateHtml, data) {
      let out = String(templateHtml || '');
      if (!out) return '';
      const d = (data && typeof data === 'object') ? data : {};
      Object.keys(d).forEach(k => {
        const token = '{{' + k + '}}';
        out = out.split(token).join(String(d[k] ?? ''));
      });
      return out;
    }

    function buildDefaultCardElement(r, categoriesById) {
      const card = document.createElement('article');
      card.className = 'card';
      const media = document.createElement('div');
      media.className = 'card-media';
      const firstPhoto = Array.isArray(r.photos) ? r.photos[0] : null;
      if (firstPhoto) {
        const ph = typeof firstPhoto === 'object' ? String(firstPhoto.placeholder || '') : '';
        if (ph) {
          media.style.backgroundImage = `url(${ph})`;
          media.style.backgroundSize = 'cover';
          media.style.backgroundPosition = 'center';
          media.style.filter = 'blur(6px)';
        }
        const img = document.createElement('img');
        const alt = (typeof firstPhoto === 'object' && firstPhoto.alt)
          ? firstPhoto.alt
          : (`${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' }));
        img.alt = alt;
        img.src = getPhotoUrl(firstPhoto, 'thumb');
        img.srcset = [
          getPhotoUrl(firstPhoto, 'thumb') + ' 480w',
          getPhotoUrl(firstPhoto, 'src') + ' 1280w'
        ].join(', ');
        img.sizes = '(max-width:640px) 100vw, (max-width:980px) 50vw, 33vw';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('load', () => { media.style.filter = 'none'; img.classList.add('loaded'); });
        media.appendChild(img);
      } else {
        const no = document.createElement('div');
        no.style.fontWeight = '800';
        no.textContent = tr('card.noPhoto', { defaultValue: 'Nessuna foto' });
        media.innerHTML = '';
        media.appendChild(no);
      }

      const body = document.createElement('div');
      body.className = 'card-body';
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = `${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' });

      const sub = document.createElement('div');
      sub.className = 'card-sub';
      const tagYear = document.createElement('span');
      tagYear.className = 'tag';
      tagYear.textContent = `${tr('card.yearPrefix', { defaultValue: 'Anno' })} ${r.anno || 'â€”'}`;
      const tagState = document.createElement('span');
      tagState.className = 'tag';
      tagState.textContent = getStatusLabel(r.stato);
      const tagCategory = document.createElement('span');
      tagCategory.className = 'tag';
      tagCategory.textContent = categoriesById[r.categoryId] || 'â€”';
      sub.appendChild(tagYear);
      sub.appendChild(tagState);
      sub.appendChild(tagCategory);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = formatPrice(r.prezzo);
      const detailsBtn = document.createElement('button');
      detailsBtn.type = 'button';
      detailsBtn.className = 'btn';
      detailsBtn.textContent = tr('card.details', { defaultValue: 'Dettagli' });
      detailsBtn.addEventListener('click', () => openDetails(r));
      actions.appendChild(price);
      actions.appendChild(detailsBtn);

      body.appendChild(title);
      body.appendChild(sub);
      body.appendChild(actions);
      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function buildCardElementFromTemplate(r, categoriesById) {
      if (!cardTemplateHtml) return null;
      const firstPhoto = Array.isArray(r.photos) ? r.photos[0] : null;
      const photoThumb = firstPhoto ? getPhotoUrl(firstPhoto, 'thumb') : '';
      const photoSrc = firstPhoto ? getPhotoUrl(firstPhoto, 'src') : '';
      const categoryName = categoriesById[r.categoryId] || 'â€”';
      const title = `${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' });
      const statusLabel = getStatusLabel(r.stato);
      const noteText = truncate(stripHtml(r.note || ''), 160);
      const html = renderTemplateString(cardTemplateHtml, {
        id: String(r.id || ''),
        title,
        brand: String(r.marca || ''),
        model: String(r.modello || ''),
        year: String(r.anno || 'â€”'),
        status: String(statusLabel || ''),
        category: String(categoryName || ''),
        price: String(formatPrice(r.prezzo) || ''),
        photoThumb,
        photoSrc,
        noteText
      }).trim();

      if (!html) return null;
      try {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const root = tpl.content.firstElementChild;
        if (!root) return null;
        if (!root.classList.contains('card')) root.classList.add('card');

        const img = root.querySelector('img[data-slot="photo"]') || root.querySelector('img');
        if (img) {
          if (photoThumb) {
            const alt = (typeof firstPhoto === 'object' && firstPhoto.alt) ? firstPhoto.alt : title;
            img.alt = alt;
            img.src = photoThumb;
            img.srcset = [photoThumb + ' 480w', photoSrc + ' 1280w'].filter(Boolean).join(', ');
            img.sizes = '(max-width:640px) 100vw, (max-width:980px) 50vw, 33vw';
            img.loading = 'lazy';
            img.decoding = 'async';
          } else {
            try { img.remove(); } catch {}
          }
        }

        let detailsEl = root.querySelector('[data-action="details"]');
        if (!detailsEl) {
          const maybeActions = root.querySelector('.card-actions') || root;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn';
          btn.textContent = tr('card.details', { defaultValue: 'Dettagli' });
          btn.addEventListener('click', () => openDetails(r));
          maybeActions.appendChild(btn);
          detailsEl = btn;
        } else {
          if (detailsEl.tagName === 'BUTTON') detailsEl.type = 'button';
          detailsEl.classList.add('btn');
          detailsEl.textContent = tr('card.details', { defaultValue: 'Dettagli' });
          detailsEl.addEventListener('click', (e) => {
            e.preventDefault();
            openDetails(r);
          });
        }

        return root;
      } catch {
        return null;
      }
    }

    function createCardElement(r, categoriesById) {
      const custom = buildCardElementFromTemplate(r, categoriesById);
      if (custom) return custom;
      return buildDefaultCardElement(r, categoriesById);
    }

    function render() {
      ensureHomeDom();
      refreshDomRefs();
      buildTransportContexts();
      if (!qEl || !statoEl || !sortEl || !cardsEl || !emptyEl || !totalCountEl || !resultCountEl || !lastUpdatedEl || !liveStatusEl) return;
      const db = window.RoulotteStore.getDB();
      const all = shareMode ? (Array.isArray(shareRoulottes) ? shareRoulottes : []) : (db.roulottes || []);
      const base = shareMode ? all : (remoteActive ? remoteResults : all);
      syncCategoryOptions(db.categories || [], categoryEl ? categoryEl.value : '');
      const categoriesById = Object.fromEntries((db.categories || []).map(c => [c.id, c.name]));
      totalCountEl.textContent = String(all.length);
      lastUpdatedEl.textContent = shareMode
        ? (shareExpiresAt ? new Date(shareExpiresAt).toLocaleString(getLocaleForLang(currentLang)) : 'â€”')
        : (db.updatedAt ? new Date(db.updatedAt).toLocaleString(getLocaleForLang(currentLang)) : 'â€”');

      const q = normalize(qEl.value);
      const stato = statoEl.value;
      const category = categoryEl ? categoryEl.value : '';
      const minPrice = parseNumberOrNull(priceMinEl?.value);
      const maxPrice = parseNumberOrNull(priceMaxEl?.value);
      const hasPhoto = !!hasPhotoEl?.checked;
      const filtered = base
        .filter(r => (remoteActive ? true : matchQuery(r, q, categoriesById)))
        .filter(r => (category ? r.categoryId === category : true))
        .filter(r => (stato ? r.stato === stato : true))
        .filter(r => (minPrice !== null ? (Number(r.prezzo) || 0) >= minPrice : true))
        .filter(r => (maxPrice !== null ? (Number(r.prezzo) || 0) <= maxPrice : true))
        .filter(r => (hasPhoto ? (Array.isArray(r.photos) && r.photos.length > 0) : true));
      const sorted = applySort(filtered, sortEl.value);

      cardsEl.innerHTML = '';
      resultCountEl.textContent = String(sorted.length);
      liveStatusEl.textContent = trCount('results.liveStatus', sorted.length, '{{count}} risultati');

      emptyEl.hidden = sorted.length !== 0;
      const frag = document.createDocumentFragment();
      sorted.forEach((r, index) => {
        const card = createCardElement(r, categoriesById);
        if (card && index < 3) {
          const img = card.querySelector('img');
          if (img) {
            img.loading = 'eager';
            img.setAttribute('fetchpriority', 'high');
          }
        }
        if (card) frag.appendChild(card);
      });
      cardsEl.appendChild(frag);
      
      persistFilters();
    }

    function setEmptyStateMessage(message, opts) {
      const o = (opts && typeof opts === 'object') ? opts : {};
      const show = o.show !== undefined ? !!o.show : true;
      const showRetry = !!o.showRetry;
      if (!emptyEl) return;
      const span = emptyEl.querySelector('span') || null;
      if (span) span.textContent = String(message || '');
      emptyEl.hidden = !show;
      if (retryLoadEl) {
        retryLoadEl.hidden = !showRetry;
        retryLoadEl.disabled = false;
      }
    }

    let t = null;
    function scheduleRender() {
      if (t) clearTimeout(t);
      if (!currentDetailId) pendingUrlDetailId = null;
      t = setTimeout(render, 100);
      scheduleRemoteSearch(260);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === window.RoulotteStore.storageKey) { render(); scheduleRemoteSearch(0); }
    });

    let cardsLoadingEl = null;

    function createCardsSkeleton(count = 6) {
      const skeleton = document.createElement('div');
      skeleton.className = 'grid';
      skeleton.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'card';
        const m = document.createElement('div');
        m.className = 'card-media skeleton';
        const b = document.createElement('div');
        b.className = 'card-body';

        const t = document.createElement('div');
        t.className = 'skeleton sk-title';
        const l = document.createElement('div');
        l.className = 'skeleton sk-line';

        const tags = document.createElement('div');
        tags.className = 'sk-tags';
        const tg1 = document.createElement('div');
        tg1.className = 'skeleton sk-tag';
        const tg2 = document.createElement('div');
        tg2.className = 'skeleton sk-tag';
        const tg3 = document.createElement('div');
        tg3.className = 'skeleton sk-tag wide';
        tags.appendChild(tg1);
        tags.appendChild(tg2);
        tags.appendChild(tg3);

        const actions = document.createElement('div');
        actions.className = 'sk-actions';
        const price = document.createElement('div');
        price.className = 'skeleton sk-price';
        const btn = document.createElement('div');
        btn.className = 'skeleton sk-btn';
        actions.appendChild(price);
        actions.appendChild(btn);

        b.appendChild(t);
        b.appendChild(l);
        b.appendChild(tags);
        b.appendChild(actions);

        c.appendChild(m);
        c.appendChild(b);
        skeleton.appendChild(c);
      }
      return skeleton;
    }

    function showCardsLoading(count = 6) {
      if (!cardsEl) return;
      if (cardsLoadingEl) {
        try { cardsLoadingEl.remove(); } catch {}
        cardsLoadingEl = null;
      }
      cardsLoadingEl = createCardsSkeleton(count);
      cardsEl.before(cardsLoadingEl);
      if (emptyEl) emptyEl.hidden = true;
      cardsEl.hidden = true;
      cardsEl.setAttribute('aria-busy', 'true');
    }

    function hideCardsLoading() {
      if (!cardsEl) return;
      cardsEl.hidden = false;
      cardsEl.setAttribute('aria-busy', 'false');
      if (cardsLoadingEl) {
        try { cardsLoadingEl.remove(); } catch {}
        cardsLoadingEl = null;
      }
    }

    let publicWs = null;
    let publicWsRetryTimer = null;
    let publicWsLastSeq = 0;

    function getWsUrl() {
      const isLocalHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      if (isLocalHost) return 'ws://localhost:3001/ws';
      const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
      return proto + '://' + location.host + '/ws';
    }

    function scheduleWsRetry() {
      if (publicWsRetryTimer) return;
      const delay = 2000;
      publicWsRetryTimer = setTimeout(() => {
        publicWsRetryTimer = null;
        connectPublicWs();
      }, delay);
    }

    function connectPublicWs() {
      try { if (publicWs) publicWs.close(); } catch {}
      publicWs = null;
      try {
        const url = getWsUrl();
        publicWs = new WebSocket(url);
        publicWs.onopen = () => {};
        publicWs.onclose = () => { scheduleWsRetry(); };
        publicWs.onerror = () => { try { if (publicWs) publicWs.close(); } catch {} };
        publicWs.onmessage = (ev) => {
          let msg = null;
          try { msg = JSON.parse(String(ev && ev.data || '')); } catch {}
          if (!msg || typeof msg !== 'object') return;
          if (String(msg.type || '') === 'invalidate' && String(msg.scope || '') === 'roulottes') {
            const seq = Number(msg.seq || 0);
            if (seq && seq <= publicWsLastSeq) return;
            if (seq) publicWsLastSeq = seq;
            Promise.resolve()
              .then(async () => {
                let shown = false;
                const timer = setTimeout(() => { shown = true; showCardsLoading(6); }, 180);
                if (window.RoulotteStore && typeof window.RoulotteStore.reloadRoulottes === 'function') {
                  await window.RoulotteStore.reloadRoulottes();
                } else if (window.RoulotteStore && typeof window.RoulotteStore.initializeStore === 'function') {
                  await window.RoulotteStore.initializeStore();
                }
                if (shareMode && shareToken) {
                  const resolved = await loadShareSelection(shareToken, 2500);
                  if (resolved && resolved.ok) {
                    shareRoulottes = Array.isArray(resolved.roulottes) ? resolved.roulottes : [];
                    shareTitle = String(resolved.title || '').trim();
                    shareExpiresAt = resolved.expiresAt || null;
                  }
                }
                clearTimeout(timer);
                if (shown) hideCardsLoading();
              })
              .then(() => {
                render();
                scheduleRemoteSearch(0);
                if (currentDetailId) {
                  const db = window.RoulotteStore.getDB();
                  const base = shareMode ? (Array.isArray(shareRoulottes) ? shareRoulottes : []) : (db.roulottes || []);
                  const r = base.find(x => x.id === currentDetailId);
                  if (r) openDetails(r);
                }
              })
              .catch(() => {});
          }
        };
      } catch {
        scheduleWsRetry();
      }
    }

    async function boot() {
      await initI18n();
      initPosthog();
      initTheme();
      shareToken = getShareTokenFromUrl();
      shareMode = !!shareToken;
      if (shareMode) {
        remoteSearchSupported = false;
        remoteActive = false;
        remoteResults = [];
        lastRemoteKey = '';
        const robots = document.querySelector('meta[name="robots"]');
        if (robots) robots.setAttribute('content', 'noindex,nofollow');
      }
      const last = loadLastTransport();
      if (last && last.data) {
        updateTransportUi(transportStandalone, last.title || 'â€”', last.data);
      }
      createMap(transportStandalone);
      pendingUrlDetailId = getUrlState().id || null;
      restoreFilters();
      setCanonicalAndMeta();
      injectJsonLdWebSite();
      function pickPublishedOrData(json) {
        return String((json && (json.published_data || json.data)) || '').trim();
      }
      if (currentLang === 'it') {
        try {
          const r1 = await fetch(getApiBaseUrl() + '/api/content/home_hero_title', { headers: { 'Accept': 'application/json' } });
          if (r1.ok) {
            const j1 = await r1.json();
            const t1 = String(j1.data || '').trim();
            if (t1) { const el = document.getElementById('heroTitle'); if (el) el.textContent = t1; }
          }
        } catch {}
        try {
          const r2 = await fetch(getApiBaseUrl() + '/api/content/home_hero_text', { headers: { 'Accept': 'application/json' } });
          if (r2.ok) {
            const j2 = await r2.json();
            const t2 = String(j2.data || '').trim();
            if (t2) { const el2 = document.getElementById('heroText'); if (el2) el2.textContent = t2; }
          }
        } catch {}
        try {
          const rFrag = await fetch(getApiBaseUrl() + '/api/content/page_home_fragment', { headers: { 'Accept': 'application/json' } });
          const rCss = await fetch(getApiBaseUrl() + '/api/content/page_home_styles', { headers: { 'Accept': 'application/json' } });
          if (rCss.ok) {
            const jCss = await rCss.json();
            const css = pickPublishedOrData(jCss);
            if (css) {
              const st = document.getElementById('pageCustomCss') || document.createElement('style');
              st.id = 'pageCustomCss';
              st.textContent = css;
              document.head.appendChild(st);
            }
          }
          if (rFrag.ok) {
            const jFrag = await rFrag.json();
            const html = pickPublishedOrData(jFrag);
            if (html) {
              const root = document.getElementById('editableHome');
              if (root) root.innerHTML = html;
            }
          }
        } catch {}
        // Header
        try {
          const rHFrag = await fetch(getApiBaseUrl() + '/api/content/page_header_fragment', { headers: { 'Accept': 'application/json' } });
          const rHCss = await fetch(getApiBaseUrl() + '/api/content/page_header_styles', { headers: { 'Accept': 'application/json' } });
          if (rHCss.ok) {
            const jHCss = await rHCss.json();
            const cssH = pickPublishedOrData(jHCss);
            if (cssH) {
              const stH = document.getElementById('pageCustomCssHeader') || document.createElement('style');
              stH.id = 'pageCustomCssHeader';
              stH.textContent = cssH;
              document.head.appendChild(stH);
            }
          }
          if (rHFrag.ok) {
            const jHFrag = await rHFrag.json();
            const htmlH = pickPublishedOrData(jHFrag);
            if (htmlH) {
              const hRoot = document.getElementById('editableHeader');
              if (hRoot) hRoot.innerHTML = htmlH;
            }
          }
        } catch {}
        // Footer
        try {
          const rFFrag = await fetch(getApiBaseUrl() + '/api/content/page_footer_fragment', { headers: { 'Accept': 'application/json' } });
          const rFCss = await fetch(getApiBaseUrl() + '/api/content/page_footer_styles', { headers: { 'Accept': 'application/json' } });
          if (rFCss.ok) {
            const jFCss = await rFCss.json();
            const cssF = pickPublishedOrData(jFCss);
            if (cssF) {
              const stF = document.getElementById('pageCustomCssFooter') || document.createElement('style');
              stF.id = 'pageCustomCssFooter';
              stF.textContent = cssF;
              document.head.appendChild(stF);
            }
          }
          if (rFFrag.ok) {
            const jFFrag = await rFFrag.json();
            const htmlF = pickPublishedOrData(jFFrag);
            if (htmlF) {
              const fRoot = document.getElementById('editableFooter');
              if (fRoot) fRoot.innerHTML = htmlF;
            }
          }
        } catch {}
        // List Top/Bottom
        try {
          const rLT = await fetch(getApiBaseUrl() + '/api/content/page_list_top_fragment', { headers: { 'Accept': 'application/json' } });
          const rLTs = await fetch(getApiBaseUrl() + '/api/content/page_list_top_styles', { headers: { 'Accept': 'application/json' } });
          if (rLTs.ok) {
            const jLTs = await rLTs.json();
            const cssLT = pickPublishedOrData(jLTs);
            if (cssLT) {
              const stLT = document.getElementById('pageCustomCssListTop') || document.createElement('style');
              stLT.id = 'pageCustomCssListTop';
              stLT.textContent = cssLT;
              document.head.appendChild(stLT);
            }
          }
          if (rLT.ok) {
            const jLT = await rLT.json();
            const htmlLT = pickPublishedOrData(jLT);
            if (htmlLT) {
              const ltRoot = document.getElementById('editableListTop');
              if (ltRoot) ltRoot.innerHTML = htmlLT;
            }
          }
        } catch {}
        try {
          const rLB = await fetch(getApiBaseUrl() + '/api/content/page_list_bottom_fragment', { headers: { 'Accept': 'application/json' } });
          const rLBs = await fetch(getApiBaseUrl() + '/api/content/page_list_bottom_styles', { headers: { 'Accept': 'application/json' } });
          if (rLBs.ok) {
            const jLBs = await rLBs.json();
            const cssLB = pickPublishedOrData(jLBs);
            if (cssLB) {
              const stLB = document.getElementById('pageCustomCssListBottom') || document.createElement('style');
              stLB.id = 'pageCustomCssListBottom';
              stLB.textContent = cssLB;
              document.head.appendChild(stLB);
            }
          }
          if (rLB.ok) {
            const jLB = await rLB.json();
            const htmlLB = pickPublishedOrData(jLB);
            if (htmlLB) {
              const lbRoot = document.getElementById('editableListBottom');
              if (lbRoot) lbRoot.innerHTML = htmlLB;
            }
          }
        } catch {}

        // Filtri
        try {
          const rFF = await fetch(getApiBaseUrl() + '/api/content/page_filters_fragment', { headers: { 'Accept': 'application/json' } });
          const rFFs = await fetch(getApiBaseUrl() + '/api/content/page_filters_styles', { headers: { 'Accept': 'application/json' } });
          if (rFFs.ok) {
            const jFFs = await rFFs.json();
            const cssF = pickPublishedOrData(jFFs);
            if (cssF) {
              const stF = document.getElementById('pageCustomCssFilters') || document.createElement('style');
              stF.id = 'pageCustomCssFilters';
              stF.textContent = cssF;
              document.head.appendChild(stF);
            }
          }
          if (rFF.ok) {
            const jFF = await rFF.json();
            const htmlF = pickPublishedOrData(jFF);
            if (htmlF) {
              ensureHomeDom();
              const rootF = document.getElementById('editableFilters');
              if (rootF) {
                const inner = extractInnerHtmlFromHtml(htmlF, ['#editableFilters', '.controls', '[role="search"]']);
                if (inner) rootF.innerHTML = inner;
              }
            }
          }
        } catch {}

        // Dialog dettagli
        try {
          const rDD = await fetch(getApiBaseUrl() + '/api/content/page_detail_dialog_fragment', { headers: { 'Accept': 'application/json' } });
          const rDDs = await fetch(getApiBaseUrl() + '/api/content/page_detail_dialog_styles', { headers: { 'Accept': 'application/json' } });
          if (rDDs.ok) {
            const jDDs = await rDDs.json();
            const cssD = pickPublishedOrData(jDDs);
            if (cssD) {
              const stD = document.getElementById('pageCustomCssDetailDialog') || document.createElement('style');
              stD.id = 'pageCustomCssDetailDialog';
              stD.textContent = cssD;
              document.head.appendChild(stD);
            }
          }
          if (rDD.ok) {
            const jDD = await rDD.json();
            const htmlD = pickPublishedOrData(jDD);
            if (htmlD) {
              const inner = extractInnerHtmlFromHtml(htmlD, ['#detailDialog', 'dialog']);
              if (inner) {
                const d = document.getElementById('detailDialog');
                if (d) d.innerHTML = inner;
              }
            }
          }
        } catch {}

        // Template card
        try {
          const rCT = await fetch(getApiBaseUrl() + '/api/content/page_card_template_fragment', { headers: { 'Accept': 'application/json' } });
          const rCTs = await fetch(getApiBaseUrl() + '/api/content/page_card_template_styles', { headers: { 'Accept': 'application/json' } });
          if (rCTs.ok) {
            const jCTs = await rCTs.json();
            const cssC = pickPublishedOrData(jCTs);
            if (cssC) {
              const stC = document.getElementById('pageCustomCssCardTemplate') || document.createElement('style');
              stC.id = 'pageCustomCssCardTemplate';
              stC.textContent = cssC;
              document.head.appendChild(stC);
            }
          }
          if (rCT.ok) {
            const jCT = await rCT.json();
            const htmlC = pickPublishedOrData(jCT);
            if (htmlC) setCardTemplate(htmlC);
          }
        } catch {}
      }

      wireUi();
      wireCalculator(transportStandalone);
      wireCalculator(transportDialog);
      showCardsLoading(6);

      try {
        if (window.RoulotteStore.initializeStore) {
          await window.RoulotteStore.initializeStore();
        } else if (window.RoulotteStore.syncNow) {
          await window.RoulotteStore.syncNow();
        }

        let shareResolveError = '';
        if (shareMode) {
          const resolved = await loadShareSelection(shareToken, 3000);
          if (resolved && resolved.ok) {
            shareRoulottes = Array.isArray(resolved.roulottes) ? resolved.roulottes : [];
            shareTitle = String(resolved.title || '').trim();
            shareExpiresAt = resolved.expiresAt || null;
            if (shareTitle) document.title = 'Roulotte online â€“ ' + shareTitle;
          } else {
            shareRoulottes = [];
            shareTitle = '';
            shareExpiresAt = null;
            const code = resolved && resolved.code ? String(resolved.code) : 'NOT_FOUND';
            shareResolveError = (code === 'EXPIRED') ? 'Link di condivisione scaduto.' : 'Link di condivisione non valido.';
          }
        }
        
        render();
        if (shareMode && shareResolveError) setEmptyStateMessage(shareResolveError, { show: true, showRetry: false });
        scheduleRemoteSearch(0);
        hideCardsLoading();
        connectPublicWs();
        
        const initialId = pendingUrlDetailId || '';
        if (initialId) {
          const db = window.RoulotteStore.getDB();
          const base = shareMode ? (Array.isArray(shareRoulottes) ? shareRoulottes : []) : (db.roulottes || []);
          const r = base.find(x => x.id === initialId);
          if (r) openDetails(r);
          else {
            try {
              const remote = await fetchRoulotteById(initialId, 3000);
              if (remote) {
                openDetails(remote);
              } else {
                pendingUrlDetailId = null;
                persistFilters();
                setCanonicalAndMeta();
                alert(tr('detail.notFound', { defaultValue: 'Scheda non trovata o non disponibile.' }));
              }
            } catch {
              alert(tr('errors.loadDetail', { defaultValue: 'Impossibile caricare la scheda. Riprova piÃ¹ tardi.' }));
            }
          }
        }

      } catch (error) {
        console.error("Errore durante l'inizializzazione dello store:", error);
        dataLoadError = true;
        setEmptyStateMessage(tr('errors.loadData', { defaultValue: "Si Ã¨ verificato un errore nel caricamento dei dati. Riprova piÃ¹ tardi." }), { show: true, showRetry: true });
      } finally {
        hideCardsLoading();
      }
    }
    boot();
