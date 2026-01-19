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
    let apiOverrideBadgeEl = null;
    let themeToggleEl = null;
    let voiceToggleEl = null;
    let langSelectEl = null;
    let quickEditBtnEl = null;
    let retryLoadEl = null;

    let suggestWrap = null;
    let suggestItems = [];
    let suggestSelectedIndex = -1;
    let suggestTimer = null;
    let suggestSeq = 0;
    let lastSuggestKey = '';

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

    const leafletMapsByEl = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

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
      apiOverrideBadgeEl = document.getElementById('apiOverrideBadge');
      themeToggleEl = document.getElementById('themeToggle');
      voiceToggleEl = document.getElementById('voiceToggle');
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
      const safe = sanitizeHtmlForPublicInsert(raw);
      cardTemplateHtml = safe;
      cardTemplateEl = null;
      if (!safe) return;
      try {
        const tpl = document.createElement('template');
        tpl.innerHTML = safe;
        const first = tpl.content.firstElementChild;
        if (first) cardTemplateEl = tpl;
      } catch {}
    }

    refreshDomRefs();
    buildTransportContexts();
    captureDefaults();

    const defaultTitle = 'Roulotte online';
    let siteBrandName = defaultTitle;
    let siteSeoDefaultTitle = defaultTitle;
    let siteSeoDefaultDescription = '';
    let siteSeoOgImageUrl = '';
    let siteSeoTwitterCard = '';
    let publicConfigCache = null;
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

    function setMetaPropertyIfPresent(propertyName, value) {
      const el = document.querySelector(`meta[property="${String(propertyName || '')}"]`);
      if (!el) return;
      el.setAttribute('content', String(value ?? ''));
    }

    function setMetaNameIfPresent(name, value) {
      const el = document.querySelector(`meta[name="${String(name || '')}"]`);
      if (!el) return;
      el.setAttribute('content', String(value ?? ''));
    }

    function applyPublicConfig(cfg) {
      const c = (cfg && typeof cfg === 'object') ? cfg : {};
      const brandName = String(c.site_name || '').trim();
      if (brandName) siteBrandName = brandName;

      const tagline = String(c.site_tagline || '').trim();
      if (tagline) {
        try {
          const brandRoot = document.querySelector('.brand');
          if (brandRoot) {
            let p = brandRoot.querySelector('p');
            if (!p) {
              p = document.createElement('p');
              brandRoot.appendChild(p);
            }
            p.textContent = tagline;
          }
        } catch {}
      }

      const seoTitle = String(c.seo_default_title || '').trim();
      siteSeoDefaultTitle = seoTitle || siteBrandName || defaultTitle;

      const seoDesc = String(c.seo_default_description || '').trim();
      if (seoDesc) siteSeoDefaultDescription = seoDesc;

      const ogImg = String(c.seo_og_image_url || '').trim();
      if (ogImg) siteSeoOgImageUrl = ogImg;

      const twCard = String(c.seo_twitter_card || '').trim();
      if (twCard) siteSeoTwitterCard = twCard;

      try {
        const h1 = document.querySelector('.brand h1');
        if (h1 && siteBrandName) h1.textContent = siteBrandName;
        const brandLink = document.querySelector('.brand[aria-label]');
        if (brandLink && siteBrandName) brandLink.setAttribute('aria-label', siteBrandName + ', home');
      } catch {}

      const desc = siteSeoDefaultDescription || String(document.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim();
      if (siteSeoDefaultTitle) document.title = siteSeoDefaultTitle;
      if (desc) setMetaNameIfPresent('description', desc);
      if (siteBrandName) setMetaPropertyIfPresent('og:site_name', siteBrandName);
      if (siteSeoDefaultTitle) setMetaPropertyIfPresent('og:title', siteSeoDefaultTitle);
      if (desc) setMetaPropertyIfPresent('og:description', desc);
      if (siteSeoOgImageUrl) setMetaPropertyIfPresent('og:image', siteSeoOgImageUrl);
      if (siteSeoTwitterCard) setMetaNameIfPresent('twitter:card', siteSeoTwitterCard);
      if (siteSeoDefaultTitle) setMetaNameIfPresent('twitter:title', siteSeoDefaultTitle);
      if (desc) setMetaNameIfPresent('twitter:description', desc);
      if (siteSeoOgImageUrl) setMetaNameIfPresent('twitter:image', siteSeoOgImageUrl);
    }

    function normalizePhoneDigits(v) {
      const s = String(v ?? '').trim();
      if (!s) return '';
      return s.replace(/[^\d]/g, '');
    }

    function ensureDefaultFooterFromConfig(cfg) {
      const c = (cfg && typeof cfg === 'object') ? cfg : {};
      const root = document.getElementById('editableFooter');
      if (!root) return;
      if (String(root.innerHTML || '').trim()) return;

      const phone = String(c.contact_phone || '').trim();
      const whatsapp = String(c.contact_whatsapp || '').trim();
      const email = String(c.contact_email || '').trim();
      const ig = String(c.social_instagram_url || '').trim();
      const fb = String(c.social_facebook_url || '').trim();
      const yt = String(c.social_youtube_url || '').trim();
      const tt = String(c.social_tiktok_url || '').trim();

      if (!phone && !whatsapp && !email && !ig && !fb && !yt && !tt) return;

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexWrap = 'wrap';
      wrap.style.gap = '10px';
      wrap.style.alignItems = 'center';

      const title = document.createElement('strong');
      title.textContent = siteBrandName || defaultTitle;
      wrap.appendChild(title);

      const sep = () => {
        const s = document.createElement('span');
        s.textContent = '•';
        s.setAttribute('aria-hidden', 'true');
        wrap.appendChild(s);
      };

      const addLink = (href, text) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        wrap.appendChild(a);
      };

      if (phone) {
        sep();
        addLink('tel:' + phone, phone);
      }
      if (whatsapp) {
        const digits = normalizePhoneDigits(whatsapp);
        if (digits) {
          sep();
          addLink('https://wa.me/' + digits, 'WhatsApp');
        }
      }
      if (email) {
        sep();
        addLink('mailto:' + email, email);
      }
      if (ig) {
        sep();
        addLink(ig, 'Instagram');
      }
      if (fb) {
        sep();
        addLink(fb, 'Facebook');
      }
      if (yt) {
        sep();
        addLink(yt, 'YouTube');
      }
      if (tt) {
        sep();
        addLink(tt, 'TikTok');
      }

      root.appendChild(wrap);
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
      pruneHomeSections(home);
      return true;
    }

    function pruneHomeSections(homeRoot) {
      const root = homeRoot || document.getElementById('editableHome');
      if (!root) return;
      try {
        const toRemove = root.querySelectorAll('.home-features, .home-trust, .home-transport-cta');
        for (const el of Array.from(toRemove)) el.remove();
        const searchHead = root.querySelector('.home-search .home-section-head');
        if (searchHead) searchHead.remove();
      } catch {}
    }

    function ensureContrastOverrides() {
      try {
        const css = [
          ':root:not([data-theme=\"dark\"]) body input,:root:not([data-theme=\"dark\"]) body select,:root:not([data-theme=\"dark\"]) body textarea{background:#fff !important;border-color:rgba(15,23,42,.34) !important;color:#0f172a !important;}',
          ':root:not([data-theme=\"dark\"]) body input::placeholder,:root:not([data-theme=\"dark\"]) body textarea::placeholder{color:rgba(15,23,42,.86) !important;opacity:1 !important;font-weight:800 !important;}',
          ':root:not([data-theme=\"dark\"]) body select option{color:#0f172a !important;}',
          ':root:not([data-theme=\"dark\"]) body .btn{background:#fff !important;border-color:rgba(15,23,42,.18) !important;color:#0f172a !important;}',
          ':root:not([data-theme=\"dark\"]) body .btn.btn-primary,:root:not([data-theme=\"dark\"]) body a.btn.btn-primary,:root:not([data-theme=\"dark\"]) body button.btn.btn-primary{background:#2563eb !important;border-color:transparent !important;color:#fff !important;}',
          ':root[data-theme=\"dark\"] body input,:root[data-theme=\"dark\"] body select,:root[data-theme=\"dark\"] body textarea{background:rgba(255,255,255,.06) !important;border-color:rgba(255,255,255,.22) !important;color:#e5e7eb !important;}',
          ':root[data-theme=\"dark\"] body input::placeholder,:root[data-theme=\"dark\"] body textarea::placeholder{color:rgba(231,234,240,.80) !important;opacity:1 !important;font-weight:800 !important;}',
          ':root[data-theme=\"dark\"] body select option{color:#e5e7eb !important;}',
          ':root[data-theme=\"dark\"] body .btn{background:rgba(255,255,255,.06) !important;border-color:rgba(255,255,255,.18) !important;color:#e5e7eb !important;}',
          ':root[data-theme=\"dark\"] body .btn.btn-primary,:root[data-theme=\"dark\"] body a.btn.btn-primary,:root[data-theme=\"dark\"] body button.btn.btn-primary{background:#2563eb !important;border-color:transparent !important;color:#fff !important;}',
        ].join('\n');
        const st = document.getElementById('contrastOverrides') || document.createElement('style');
        st.id = 'contrastOverrides';
        st.textContent = css;
        document.head.appendChild(st);
      } catch {}
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

    function ensureSuggestUi() {
      if (!qEl) return;
      if (suggestWrap && suggestWrap.isConnected) return;
      try {
        const field = qEl.closest('.field') || qEl.parentElement;
        if (!field) return;
        if (!field.style.position) field.style.position = 'relative';
        const existing = field.querySelector('.search-suggest');
        if (existing) {
          suggestWrap = existing;
          return;
        }
        const wrap = document.createElement('div');
        wrap.className = 'search-suggest';
        wrap.hidden = true;
        wrap.setAttribute('role', 'listbox');
        field.appendChild(wrap);
        suggestWrap = wrap;
      } catch {}
    }

    function hideSuggest() {
      try {
        if (!suggestWrap) return;
        suggestWrap.hidden = true;
        suggestWrap.innerHTML = '';
        suggestItems = [];
        suggestSelectedIndex = -1;
        lastSuggestKey = '';
      } catch {}
    }

    function getSuggestParamsFromUi() {
      const base = getRemoteParamsFromUi();
      return { ...base, limit: 8 };
    }

    function buildLocalSuggestions(q) {
      const qq = String(q || '').trim();
      if (qq.length < 2) return [];
      const db = window.RoulotteStore && typeof window.RoulotteStore.getDB === 'function' ? window.RoulotteStore.getDB() : {};
      const list = Array.isArray(db.roulottes) ? db.roulottes : [];
      if (!list.length) return [];

      const out = [];
      const seen = new Set();
      const nq = normalize(qq);

      function add(v) {
        const s = String(v || '').trim();
        if (!s) return;
        const key = s.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(s);
      }

      for (const r of list) {
        if (out.length >= 8) break;
        const marca = String(r && r.marca || '').trim();
        const modello = String(r && r.modello || '').trim();
        const anno = r && r.anno !== undefined && r.anno !== null ? String(r.anno).trim() : '';
        const id = String(r && r.id || '').trim();
        const hay = [marca, modello, anno, id].map(normalize).join(' ');
        if (!fuzzyTextMatch(hay, nq)) continue;
        if (id) add(id);
        if (marca) add(marca);
        const title = [marca, modello].filter(Boolean).join(' ').trim();
        if (title) add(title);
        if (anno) add(anno);
      }
      return out.slice(0, 8);
    }

    function renderSuggest(list) {
      if (!suggestWrap) return;
      const arr = Array.isArray(list) ? list.map(s => String(s || '').trim()).filter(Boolean) : [];
      suggestItems = arr.slice(0, 8);
      suggestSelectedIndex = -1;
      if (!suggestItems.length) {
        hideSuggest();
        return;
      }
      suggestWrap.innerHTML = '';
      for (let i = 0; i < suggestItems.length; i++) {
        const v = suggestItems[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-suggest-item';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', 'false');
        btn.dataset.idx = String(i);
        const left = document.createElement('span');
        left.textContent = v;
        const right = document.createElement('span');
        right.className = 'hint';
        right.textContent = tr('actions.search', { defaultValue: 'Cerca' });
        btn.appendChild(left);
        btn.appendChild(right);
        btn.addEventListener('pointerdown', (e) => { try { e.preventDefault(); } catch {} });
        btn.addEventListener('click', () => applySuggestSelection(i));
        suggestWrap.appendChild(btn);
      }
      suggestWrap.hidden = false;
    }

    function applySuggestSelection(index) {
      if (!qEl) return;
      const i = Number(index);
      if (!Number.isFinite(i) || i < 0 || i >= suggestItems.length) return;
      qEl.value = suggestItems[i];
      hideSuggest();
      scheduleRender();
      scheduleRemoteSearch(0);
      try { qEl.focus(); } catch {}
    }

    function moveSuggestSelection(delta) {
      if (!suggestWrap || suggestWrap.hidden || !suggestItems.length) return;
      const max = suggestItems.length;
      let next = suggestSelectedIndex + Number(delta || 0);
      if (!Number.isFinite(next)) next = -1;
      if (next < 0) next = max - 1;
      if (next >= max) next = 0;
      suggestSelectedIndex = next;
      const children = Array.from(suggestWrap.querySelectorAll('.search-suggest-item'));
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const sel = i === suggestSelectedIndex;
        el.setAttribute('aria-selected', sel ? 'true' : 'false');
        if (sel) {
          try { el.scrollIntoView({ block: 'nearest' }); } catch {}
        }
      }
    }

    async function runSuggest() {
      if (!qEl) return;
      ensureSuggestUi();
      const params = getSuggestParamsFromUi();
      const q = String(params.q || '').trim();
      if (q.length < 2) { hideSuggest(); return; }

      const key = JSON.stringify(params);
      if (key === lastSuggestKey && suggestWrap && !suggestWrap.hidden) return;
      lastSuggestKey = key;

      const seq = ++suggestSeq;
      const useRemote = !!(window.RoulotteStore && typeof window.RoulotteStore.suggestRoulottes === 'function' && remoteSearchSupported !== false && remoteSuggestSupported !== false && !shareMode);
      if (!useRemote) {
        renderSuggest(buildLocalSuggestions(q));
        return;
      }

      try {
        const list = await window.RoulotteStore.suggestRoulottes(params, 900);
        if (seq !== suggestSeq) return;
        remoteSuggestSupported = true;
        const out = Array.isArray(list) ? list : [];
        if (out.length) renderSuggest(out);
        else renderSuggest(buildLocalSuggestions(q));
      } catch (e) {
        if (seq !== suggestSeq) return;
        const msg = String(e && e.message ? e.message : e);
        if (msg === 'remote_suggest_not_supported') remoteSuggestSupported = false;
        renderSuggest(buildLocalSuggestions(q));
      }
    }

    function scheduleSuggest(delayMs = 140) {
      if (suggestTimer) clearTimeout(suggestTimer);
      const d = Math.max(0, Number(delayMs) || 0);
      suggestTimer = setTimeout(() => {
        suggestTimer = null;
        runSuggest();
      }, d);
    }

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

    function getApiBaseUrlOverrideForUi() {
      try {
        const p = new URLSearchParams(location.search || '');
        const qp = String(p.get('api') || p.get('api_base') || '').trim();
        if (qp) return normalizeApiBaseUrl(qp);
      } catch {}
      try {
        const v = String(localStorage.getItem('roulotte_api_base_url') || '').trim();
        return normalizeApiBaseUrl(v);
      } catch {
        return '';
      }
    }

    function updateApiOverrideBadge() {
      if (!apiOverrideBadgeEl) return;
      const isDev = (location && (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'));
      const override = getApiBaseUrlOverrideForUi();
      if (!isDev || !override) {
        apiOverrideBadgeEl.hidden = true;
        apiOverrideBadgeEl.textContent = '';
        apiOverrideBadgeEl.removeAttribute('title');
        return;
      }
      apiOverrideBadgeEl.hidden = false;
      apiOverrideBadgeEl.textContent = 'API: ' + override;
      apiOverrideBadgeEl.title = override;
    }

    let voiceRecognition = null;
    let voiceActive = false;
    let voiceLastErrorAt = 0;
    let voiceLastStartAt = 0;
    let voiceRestartTimer = null;

    function getVoiceCtor() {
      const w = window;
      return (w && (w.SpeechRecognition || w.webkitSpeechRecognition)) || null;
    }

    function getVoiceLangTag() {
      if (currentLang === 'en') return 'en-US';
      if (currentLang === 'de') return 'de-DE';
      if (currentLang === 'fr') return 'fr-FR';
      return 'it-IT';
    }

    function setLiveStatus(text) {
      if (!liveStatusEl) return;
      liveStatusEl.textContent = String(text || '');
    }

    function updateVoiceToggleUi() {
      if (!voiceToggleEl) return;
      const supported = !!getVoiceCtor();
      if (!supported) {
        voiceToggleEl.hidden = true;
        voiceToggleEl.setAttribute('aria-pressed', 'false');
        voiceToggleEl.setAttribute('aria-label', tr('voice.unsupported', { defaultValue: 'Comandi vocali non supportati' }));
        voiceToggleEl.setAttribute('title', tr('voice.unsupported', { defaultValue: 'Comandi vocali non supportati' }));
        return;
      }
      voiceToggleEl.hidden = false;
      voiceToggleEl.setAttribute('aria-pressed', voiceActive ? 'true' : 'false');
      const label = voiceActive
        ? tr('voice.stop', { defaultValue: 'Ferma comandi vocali' })
        : tr('voice.start', { defaultValue: 'Avvia comandi vocali' });
      voiceToggleEl.setAttribute('aria-label', label);
      voiceToggleEl.setAttribute('title', label);
    }

    function normalizeVoiceKey(input) {
      return String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
    }

    function getCurrentRoulottesForVoice() {
      const db = window.RoulotteStore ? window.RoulotteStore.getDB() : null;
      const local = db && Array.isArray(db.roulottes) ? db.roulottes : [];
      if (shareMode) return Array.isArray(shareRoulottes) ? shareRoulottes : [];
      if (remoteActive) return Array.isArray(remoteResults) ? remoteResults : [];
      return local;
    }

    function findRoulotteByTranscript(transcript) {
      const key = normalizeVoiceKey(transcript);
      if (!key) return null;
      const list = getCurrentRoulottesForVoice();
      for (const r of list) {
        const id = r && r.id !== undefined && r.id !== null ? String(r.id) : '';
        const idKey = normalizeVoiceKey(id);
        if (idKey && key.includes(idKey)) return r;
      }
      return null;
    }

    function setVoiceActive(next) {
      voiceActive = !!next;
      updateVoiceToggleUi();
    }

    function stopVoiceRecognition() {
      if (voiceRestartTimer) { clearTimeout(voiceRestartTimer); voiceRestartTimer = null; }
      if (voiceRecognition) {
        try { voiceRecognition.onend = null; } catch {}
        try { voiceRecognition.stop(); } catch {}
      }
      setVoiceActive(false);
      setLiveStatus('');
    }

    function startVoiceRecognition() {
      const Ctor = getVoiceCtor();
      if (!Ctor) return;
      if (voiceRestartTimer) { clearTimeout(voiceRestartTimer); voiceRestartTimer = null; }

      if (!voiceRecognition) {
        voiceRecognition = new Ctor();
        voiceRecognition.interimResults = false;
        voiceRecognition.continuous = true;
        voiceRecognition.maxAlternatives = 1;
        voiceRecognition.onresult = (e) => {
          try {
            const results = e && e.results ? e.results : null;
            const last = results && results.length ? results[results.length - 1] : null;
            const t = last && last[0] && last[0].transcript ? String(last[0].transcript) : '';
            if (t) handleVoiceCommand(t);
          } catch {}
        };
        voiceRecognition.onerror = (e) => {
          voiceLastErrorAt = Date.now();
          const code = e && e.error ? String(e.error) : '';
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setLiveStatus(tr('voice.permissionDenied', { defaultValue: 'Permesso microfono negato.' }));
            stopVoiceRecognition();
            return;
          }
          if (code === 'no-speech') {
            setLiveStatus(tr('voice.noSpeech', { defaultValue: 'Nessun parlato rilevato.' }));
            return;
          }
          setLiveStatus(tr('voice.error', { defaultValue: 'Errore comandi vocali.' }));
        };
      }

      voiceRecognition.lang = getVoiceLangTag();
      voiceRecognition.onend = () => {
        if (!voiceActive) return;
        const now = Date.now();
        if (now - voiceLastErrorAt < 800) return;
        if (now - voiceLastStartAt < 800) return;
        voiceRestartTimer = setTimeout(() => {
          if (!voiceActive) return;
          startVoiceRecognition();
        }, 250);
      };

      try {
        voiceLastStartAt = Date.now();
        voiceRecognition.start();
        setVoiceActive(true);
        setLiveStatus(tr('voice.listening', { defaultValue: 'In ascolto…' }));
      } catch {
        setLiveStatus(tr('voice.error', { defaultValue: 'Errore comandi vocali.' }));
      }
    }

    function toggleVoiceRecognition() {
      if (voiceActive) stopVoiceRecognition();
      else startVoiceRecognition();
    }

    function handleVoiceCommand(raw) {
      const text = String(raw || '').trim();
      if (!text) return;
      const lower = text.toLowerCase().replace(/[.,;:!?]+/g, ' ').replace(/\s+/g, ' ').trim();

      if (/\bchiudi\b/.test(lower)) {
        closeDetails();
        setLiveStatus(tr('voice.closed', { defaultValue: 'Dettagli chiusi.' }));
        return;
      }

      if (/\breset\b/.test(lower) && /\bfiltr/i.test(lower)) {
        if (resetFiltersEl && typeof resetFiltersEl.click === 'function') resetFiltersEl.click();
        setLiveStatus(tr('voice.filtersReset', { defaultValue: 'Filtri azzerati.' }));
        return;
      }

      if (/\btema\b/.test(lower) && /\bscur/.test(lower)) {
        applyTheme('dark');
        setLiveStatus(tr('voice.themeDark', { defaultValue: 'Tema scuro.' }));
        return;
      }
      if (/\btema\b/.test(lower) && /\bchiar/.test(lower)) {
        applyTheme('light');
        setLiveStatus(tr('voice.themeLight', { defaultValue: 'Tema chiaro.' }));
        return;
      }

      if (/\blingua\b/.test(lower)) {
        if (/\bitalian|\bitaliano\b/.test(lower)) { changePublicLang('it'); setLiveStatus(tr('voice.langSet', { defaultValue: 'Lingua impostata.' })); return; }
        if (/\binglese|\benglish\b/.test(lower)) { changePublicLang('en'); setLiveStatus(tr('voice.langSet', { defaultValue: 'Lingua impostata.' })); return; }
        if (/\btedesco|\bgerman\b/.test(lower)) { changePublicLang('de'); setLiveStatus(tr('voice.langSet', { defaultValue: 'Lingua impostata.' })); return; }
        if (/\bfrancese|\bfrench\b/.test(lower)) { changePublicLang('fr'); setLiveStatus(tr('voice.langSet', { defaultValue: 'Lingua impostata.' })); return; }
      }

      if (lower.startsWith('cerca ')) {
        const q = lower.slice(6).trim();
        if (qEl) {
          qEl.value = q;
          scheduleRender();
          try { qEl.focus(); } catch {}
        }
        setLiveStatus(tr('voice.searching', { defaultValue: 'Ricerca aggiornata.' }));
        return;
      }

      if (/\bapri\b/.test(lower)) {
        const r = findRoulotteByTranscript(lower);
        if (r) {
          openDetails(r);
          setLiveStatus(tr('voice.opened', { defaultValue: 'Dettagli aperti.' }));
        } else {
          setLiveStatus(tr('voice.notFound', { defaultValue: 'Roulotte non trovata.' }));
        }
        return;
      }

      setLiveStatus(tr('voice.unrecognized', { defaultValue: 'Comando non riconosciuto.' }));
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
      updateApiOverrideBadge();
      updateVoiceToggleUi();
      suggestWrap = null;

      if (langSelectEl) bindOnce(langSelectEl, 'change', 'langSelect', () => changePublicLang(langSelectEl.value));
      if (themeToggleEl) bindOnce(themeToggleEl, 'click', 'themeToggle', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
      if (voiceToggleEl) bindOnce(voiceToggleEl, 'click', 'voiceToggle', () => toggleVoiceRecognition());
      if (quickEditBtnEl) {
        quickEditBtnEl.hidden = true;
      }
      if (cardsEl) {
        bindOnce(cardsEl, 'click', 'cardsDelegateOpen', (e) => {
          const target = e && e.target;
          if (!target || typeof target.closest !== 'function') return;
          const card = target.closest('.card');
          if (!card) return;
          const interactive = target.closest('button, a, input, select, textarea, label, summary, details');
          if (interactive) return;
          const id = String(card.dataset ? (card.dataset.roulotteId || '') : '').trim();
          if (!id) return;
          let found = null;
          try {
            const db = window.RoulotteStore.getDB();
            const list = shareMode ? (Array.isArray(shareRoulottes) ? shareRoulottes : []) : (db.roulottes || []);
            found = (Array.isArray(list) ? list : []).find((x) => String(x && x.id || '') === id) || null;
          } catch {}
          if (!found) return;
          try { e.preventDefault(); } catch {}
          openDetails(found);
        });
      }

      if (qEl) {
        ensureSuggestUi();
        bindOnce(qEl, 'input', 'qInput', () => { scheduleRender(); scheduleRemoteSearch(260); scheduleSuggest(160); });
        bindOnce(qEl, 'focus', 'qFocus', () => scheduleSuggest(0));
        bindOnce(qEl, 'keydown', 'qKeydown', (e) => {
          if (e.key === 'ArrowDown') {
            if (suggestWrap && !suggestWrap.hidden) { try { e.preventDefault(); } catch {} moveSuggestSelection(1); return; }
          }
          if (e.key === 'ArrowUp') {
            if (suggestWrap && !suggestWrap.hidden) { try { e.preventDefault(); } catch {} moveSuggestSelection(-1); return; }
          }
          if (e.key === 'Enter') {
            if (suggestWrap && !suggestWrap.hidden && suggestSelectedIndex >= 0) { try { e.preventDefault(); } catch {} applySuggestSelection(suggestSelectedIndex); return; }
          }
          if (e.key === 'Escape') hideSuggest();
        });
        bindOnce(qEl, 'blur', 'qBlur', () => setTimeout(hideSuggest, 120));
      }
      if (statoEl) bindOnce(statoEl, 'change', 'statoChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (sortEl) bindOnce(sortEl, 'change', 'sortChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (categoryEl) bindOnce(categoryEl, 'change', 'catChange', () => { if (!currentDetailId) pendingUrlDetailId = null; render(); scheduleRemoteSearch(0); });
      if (priceMinEl) bindOnce(priceMinEl, 'input', 'priceMin', () => { scheduleRender(); scheduleRemoteSearch(260); });
      if (priceMaxEl) bindOnce(priceMaxEl, 'input', 'priceMax', () => { scheduleRender(); scheduleRemoteSearch(260); });
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
            voice: {
              start: "Avvia comandi vocali",
              stop: "Ferma comandi vocali",
              unsupported: "Comandi vocali non supportati",
              listening: "In ascolto…",
              permissionDenied: "Permesso microfono negato.",
              noSpeech: "Nessun parlato rilevato.",
              error: "Errore comandi vocali.",
              closed: "Dettagli chiusi.",
              filtersReset: "Filtri azzerati.",
              themeDark: "Tema scuro.",
              themeLight: "Tema chiaro.",
              langSet: "Lingua impostata.",
              searching: "Ricerca aggiornata.",
              opened: "Dettagli aperti.",
              notFound: "Roulotte non trovata.",
              unrecognized: "Comando non riconosciuto."
            },
            hero: { title: "Trova roulotte", text: "" },
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
            results: { title: "Disponibilità", liveStatus: "" },
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
              sectionTitle: "Preventivo consegna",
              sectionHint: "Apri una scheda per compilare automaticamente i dati tecnici. Inserisci solo partenza e destinazione.",
              goToCatalog: "Vai ai risultati",
              dialogTitle: "Preventivo consegna",
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
            voice: {
              start: "Start voice commands",
              stop: "Stop voice commands",
              unsupported: "Voice commands not supported",
              listening: "Listening…",
              permissionDenied: "Microphone permission denied.",
              noSpeech: "No speech detected.",
              error: "Voice commands error.",
              closed: "Details closed.",
              filtersReset: "Filters reset.",
              themeDark: "Dark theme.",
              themeLight: "Light theme.",
              langSet: "Language updated.",
              searching: "Search updated.",
              opened: "Details opened.",
              notFound: "Caravan not found.",
              unrecognized: "Command not recognized."
            },
            hero: { title: "Find caravans", text: "" },
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
            results: { title: "Availability", liveStatus: "" },
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
            nav: { menu: "Menü", catalog: "Katalog", transport: "Transport", admin: "Admin" },
            actions: { adminArea: "Admin-Bereich", editSite: "Website bearbeiten", resetFilters: "Filter zurücksetzen", themeLight: "Thema: Hell", themeDark: "Thema: Dunkel" },
            voice: {
              start: "Sprachbefehle starten",
              stop: "Sprachbefehle stoppen",
              unsupported: "Sprachbefehle nicht unterstützt",
              listening: "Höre zu…",
              permissionDenied: "Mikrofonberechtigung verweigert.",
              noSpeech: "Keine Sprache erkannt.",
              error: "Fehler bei Sprachbefehlen.",
              closed: "Details geschlossen.",
              filtersReset: "Filter zurückgesetzt.",
              themeDark: "Dunkles Thema.",
              themeLight: "Helles Thema.",
              langSet: "Sprache aktualisiert.",
              searching: "Suche aktualisiert.",
              opened: "Details geöffnet.",
              notFound: "Wohnwagen nicht gefunden.",
              unrecognized: "Befehl nicht erkannt."
            },
            hero: { title: "Wohnwagen finden", text: "" },
            filters: {
              searchLabel: "Suche",
              searchPlaceholder: "z.B. Adria, Hobby, 2021...",
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
            status: { excellent: "Sehr gut", good: "Gut", toFix: "Reparaturbedürftig", new: "Neu", sold: "Verkauft" },
            sort: { newest: "Neueste", priceAsc: "Preis aufsteigend", priceDesc: "Preis absteigend", yearDesc: "Jahr (neueste)", yearAsc: "Jahr (älteste)" },
            meta: { totalCards: "Gesamtanzeigen", results: "Ergebnisse", updated: "Aktualisiert" },
            results: { title: "Verfügbarkeit", liveStatus: "" },
            empty: { noResults: "Keine Ergebnisse. Filter ändern oder neue Anzeigen im Admin-Bereich hinzufügen." },
            detail: {
              copyLink: "Link kopieren",
              close: "Schließen",
              copied: "Kopiert",
              copyError: "Link konnte nicht kopiert werden.",
              meta: "ID {{id}} • {{category}} • Jahr {{year}} • Status {{status}}",
              noPhotoAvailable: "Kein Foto verfügbar.",
              photoAlt: "Foto von {{title}}",
              planimetryAlt: "Grundriss",
              openVideo: "Video öffnen"
            },
            lightbox: { close: "Schließen" },
            card: { details: "Details", noPhoto: "Kein Foto", yearPrefix: "Jahr" },
            transport: {
              sectionTitle: "Transportrechner",
              sectionHint: "Öffne ein Inserat, um technische Daten automatisch zu übernehmen. Gib nur Start und Ziel ein.",
              goToCatalog: "Zum Katalog",
              dialogTitle: "Transportrechner",
              dialogHint: "Daten werden aus dem Inserat übernommen. Gib nur Start und Ziel ein.",
              openStandalone: "In eigener Sektion öffnen",
              selected: "Auswahl",
              trainableQuestion: "Zugfähiger Wohnwagen?",
              perKm: "Kosten pro km (€/km)",
              length: "Länge",
              width: "Breite",
              weight: "Gewicht",
              axles: "Doppelachse",
              trainable: "Zugfähig",
              revised: "Geprüft",
              drawbar: "Deichsel",
              confirmData: "Ich bestätige, dass die angezeigten Daten korrekt sind",
              from: "Startadresse",
              to: "Zieladresse",
              calculate: "Route berechnen",
              distance: "Distanz",
              duration: "Dauer",
              distanceRoundTrip: "Distanz (Hin- und Rückfahrt)",
              durationRoundTrip: "Dauer (Hin- und Rückfahrt)",
              type: "Transportart",
              reason: "Begründung",
              estimateTitle: "Preisschätzung (Hin- und Rückfahrt)",
              disclaimer: "Richtwert und unverbindlich. Dies ist nur eine Schätzung. Kontaktieren Sie uns zur finalen Bestätigung."
            },
            errors: { loadData: "Beim Laden der Daten ist ein Fehler aufgetreten. Bitte später erneut versuchen." }
          }
        },
        fr: {
          translation: {
            a11y: { skipToContent: "Aller au contenu" },
            common: { caravan: "Caravane" },
            nav: { menu: "Menu", catalog: "Catalogue", transport: "Transport", admin: "Admin" },
            actions: { adminArea: "Espace Admin", editSite: "Modifier le site", resetFilters: "Réinitialiser", themeLight: "Thème : Clair", themeDark: "Thème : Sombre" },
            voice: {
              start: "Démarrer les commandes vocales",
              stop: "Arrêter les commandes vocales",
              unsupported: "Commandes vocales non prises en charge",
              listening: "Écoute…",
              permissionDenied: "Permission micro refusée.",
              noSpeech: "Aucune parole détectée.",
              error: "Erreur des commandes vocales.",
              closed: "Détails fermés.",
              filtersReset: "Filtres réinitialisés.",
              themeDark: "Thème sombre.",
              themeLight: "Thème clair.",
              langSet: "Langue mise à jour.",
              searching: "Recherche mise à jour.",
              opened: "Détails ouverts.",
              notFound: "Caravane introuvable.",
              unrecognized: "Commande non reconnue."
            },
            hero: { title: "Trouver des caravanes", text: "" },
            filters: {
              searchLabel: "Rechercher",
              searchPlaceholder: "ex. Adria, Hobby, 2021...",
              category: "Catégorie",
              all: "Toutes",
              status: "État",
              any: "Tous",
              sort: "Trier",
              price: "Prix",
              min: "Min",
              max: "Max",
              onlyWithPhotos: "Seulement avec photos"
            },
            status: { excellent: "Excellent", good: "Bon", toFix: "À réparer", new: "Neuf", sold: "Vendu" },
            sort: { newest: "Les plus récentes", priceAsc: "Prix croissant", priceDesc: "Prix décroissant", yearDesc: "Année (plus récente)", yearAsc: "Année (plus ancienne)" },
            meta: { totalCards: "Annonces totales", results: "Résultats", updated: "Mise à jour" },
            results: { title: "Disponibilité", liveStatus: "" },
            empty: { noResults: "Aucun résultat. Essayez de changer les filtres ou ajoutez des annonces depuis l'espace admin." },
            detail: {
              copyLink: "Copier le lien",
              close: "Fermer",
              copied: "Copié",
              copyError: "Impossible de copier le lien.",
              meta: "ID {{id}} • {{category}} • Année {{year}} • Statut {{status}}",
              noPhotoAvailable: "Aucune photo disponible.",
              photoAlt: "Photo de {{title}}",
              planimetryAlt: "Plan",
              openVideo: "Ouvrir la vidéo"
            },
            lightbox: { close: "Fermer" },
            card: { details: "Détails", noPhoto: "Aucune photo", yearPrefix: "Année" },
            transport: {
              sectionTitle: "Calculateur de transport",
              sectionHint: "Ouvrez une fiche pour préremplir les données techniques. Saisissez seulement départ et arrivée.",
              goToCatalog: "Aller au catalogue",
              dialogTitle: "Calculateur de transport",
              dialogHint: "Données préremplies depuis la fiche. Saisissez seulement départ et arrivée.",
              openStandalone: "Ouvrir la section dédiée",
              selected: "Sélection",
              trainableQuestion: "Caravane tractable ?",
              perKm: "Coût par km (€/km)",
              length: "Longueur",
              width: "Largeur",
              weight: "Poids",
              axles: "Double essieu",
              trainable: "Tractable",
              revised: "Révisée",
              drawbar: "Timon",
              confirmData: "Je confirme que les données affichées sont correctes",
              from: "Adresse de départ",
              to: "Adresse d'arrivée",
              calculate: "Calculer l'itinéraire",
              distance: "Distance",
              duration: "Durée",
              distanceRoundTrip: "Distance (aller/retour)",
              durationRoundTrip: "Durée (aller/retour)",
              type: "Type de transport",
              reason: "Motif",
              estimateTitle: "Estimation (aller/retour)",
              disclaimer: "Prix indicatif et non contraignant. Ceci est seulement une estimation. Contactez-nous pour la confirmation finale."
            },
            errors: { loadData: "Une erreur s'est produite lors du chargement des données. Veuillez réessayer plus tard." }
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

    function normalizePathname(pathname) {
      const p = String(pathname || '').trim();
      if (p.length > 1 && p.endsWith('/')) return p.replace(/\/+$/, '');
      return p || '/';
    }

    function isTransportRoute() {
      try {
        const p = normalizePathname(location.pathname).toLowerCase();
        return p === '/trasporto-roulotte';
      } catch {
        return false;
      }
    }

    function applyTopLevelRouteVisibility() {
      const home = document.getElementById('editableHome');
      const transport = document.getElementById('transportPage');
      const catalog = document.getElementById('contenuto');
      const isTransport = isTransportRoute();

      if (transport) transport.hidden = !isTransport;
      if (home) home.hidden = isTransport;
      if (catalog) catalog.hidden = isTransport;

      const skip = document.querySelector('.skip-link');
      if (skip) skip.setAttribute('href', isTransport ? '#transportPage' : '#contenuto');

      return isTransport;
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
      const onTransport = isTransportRoute();
      const detailId = currentDetailId || pendingUrlDetailId || '';
      const canonicalUrl = detailId ? (function () {
        const u = new URL(baseUrl);
        u.searchParams.set('id', String(detailId));
        return u.toString();
      })() : (onTransport ? (function () {
        const u = new URL(location.href);
        u.hash = '';
        u.search = '';
        u.pathname = '/trasporto-roulotte';
        return u.toString();
      })() : baseUrl);

      const shareUrl = (function () {
        const u = new URL(location.href);
        u.hash = '';
        const id = String(currentDetailId || '').trim();
        if (id && location.origin && location.origin !== 'null') return location.origin + '/p/' + encodeURIComponent(id);
        return u.toString();
      })();

      const defaultTitle = siteSeoDefaultTitle || siteBrandName || 'Roulotte online';
      const descriptionEl = document.querySelector('meta[name="description"]');
      const defaultDescription = siteSeoDefaultDescription || String(descriptionEl && descriptionEl.getAttribute('content') || '').trim();

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
      } else if (onTransport) {
        const title = currentLang === 'it' ? 'Trasporto roulotte' : 'Transport';
        const desc = currentLang === 'it'
          ? 'Calcola una stima indicativa del trasporto roulotte in 30 secondi: distanza, durata e prezzo (andata/ritorno).'
          : defaultDescription;

        document.title = `${defaultTitle} – ${title}`;
        if (descriptionEl) descriptionEl.setAttribute('content', desc || defaultDescription);

        setMetaProperty('og:type', 'website');
        setMetaProperty('og:title', title);
        setMetaProperty('og:description', desc || defaultDescription);
        setMetaProperty('og:image', '');
        setMetaName('twitter:card', 'summary');
        setMetaName('twitter:title', title);
        setMetaName('twitter:description', desc || defaultDescription);
        setMetaName('twitter:image', '');
        removeJsonLd('jsonLdDetail');
      } else {
        document.title = defaultTitle;
        if (descriptionEl && defaultDescription) descriptionEl.setAttribute('content', defaultDescription);
        setMetaProperty('og:type', 'website');
        setMetaProperty('og:title', defaultTitle);
        setMetaProperty('og:description', defaultDescription);
        setMetaProperty('og:image', siteSeoOgImageUrl || '');
        setMetaName('twitter:card', siteSeoTwitterCard || 'summary');
        setMetaName('twitter:title', defaultTitle);
        setMetaName('twitter:description', defaultDescription);
        setMetaName('twitter:image', siteSeoOgImageUrl || '');
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
        "name": siteBrandName || "Roulotte online",
        "potentialAction": {
          "@type": "SearchAction",
          "target": target,
          "query-input": "required name=search_term_string"
        }
      };
      const existing = document.getElementById('jsonLdWebSite');
      if (existing) {
        existing.textContent = JSON.stringify(data);
        return;
      }
      const s = document.createElement('script');
      s.id = 'jsonLdWebSite';
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
    function createResponsivePicture(thumbUrl, srcUrl, sizes, eager) {
      const picture = document.createElement('picture');
      const hasWebp = /\.webp(\?.*)?$/i.test(srcUrl);
      const hasAvif = hasWebp ? srcUrl.replace(/\.webp(\?.*)?$/i, '.avif$1') : '';
      if (hasWebp) {
        const sWebp = document.createElement('source');
        sWebp.type = 'image/webp';
        sWebp.srcset = [
          (thumbUrl || srcUrl) + ' 480w',
          srcUrl + ' 1280w'
        ].join(', ');
        sWebp.sizes = sizes;
        picture.appendChild(sWebp);
      }
      if (hasAvif) {
        const sAvif = document.createElement('source');
        sAvif.type = 'image/avif';
        sAvif.srcset = [
          (thumbUrl || hasAvif) + ' 480w',
          hasAvif + ' 1280w'
        ].join(', ');
        sAvif.sizes = sizes;
        picture.insertBefore(sAvif, picture.firstChild || null);
      }
      const img = document.createElement('img');
      img.src = thumbUrl || srcUrl;
      img.decoding = 'async';
      img.loading = eager ? 'eager' : 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      picture.appendChild(img);
      return { picture, img };
    }
    function stripHtml(html) {
      const div = document.createElement('div');
      div.innerHTML = String(html || '');
      return div.textContent || div.innerText || '';
    }
    function sanitizeHtmlForPublicInsert(html) {
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
        return raw;
      }
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

    function tokenize(s) {
      return String(s ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }

    function levenshteinLimited(a, b, maxDist) {
      const s = String(a ?? '');
      const t = String(b ?? '');
      const max = Number.isFinite(Number(maxDist)) ? Number(maxDist) : 0;
      if (s === t) return 0;
      const n = s.length;
      const m = t.length;
      if (Math.abs(n - m) > max) return max + 1;
      if (n === 0) return m;
      if (m === 0) return n;

      let prev = new Array(m + 1);
      let curr = new Array(m + 1);
      for (let j = 0; j <= m; j++) prev[j] = j;
      for (let i = 1; i <= n; i++) {
        curr[0] = i;
        let rowMin = curr[0];
        const si = s.charCodeAt(i - 1);
        for (let j = 1; j <= m; j++) {
          const cost = si === t.charCodeAt(j - 1) ? 0 : 1;
          const del = prev[j] + 1;
          const ins = curr[j - 1] + 1;
          const sub = prev[j - 1] + cost;
          const v = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
          curr[j] = v;
          if (v < rowMin) rowMin = v;
        }
        if (rowMin > max) return max + 1;
        const tmp = prev; prev = curr; curr = tmp;
      }
      return prev[m];
    }

    function fuzzyTextMatch(haystackNormalized, queryRaw) {
      const q = normalize(queryRaw);
      if (!q) return true;
      const hay = String(haystackNormalized ?? '');
      if (hay.includes(q)) return true;

      const qTokens = tokenize(q);
      if (!qTokens.length) return true;
      const hTokens = tokenize(hay);
      if (!hTokens.length) return false;

      for (const qt of qTokens) {
        if (hay.includes(qt)) continue;
        const maxDist = qt.length <= 4 ? 1 : (qt.length <= 9 ? 2 : 2);
        let ok = false;
        for (const ht of hTokens) {
          if (Math.abs(ht.length - qt.length) > maxDist) continue;
          const d = levenshteinLimited(ht, qt, maxDist);
          if (d <= maxDist) { ok = true; break; }
        }
        if (!ok) return false;
      }
      return true;
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
      if (s === 'si' || s === 'sì' || s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on' || s === 'presente') return true;
      if (s === 'no' || s === 'false' || s === '0' || s === 'off' || s === 'assente') return false;
      return null;
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
      if (isLocalHost) {
        const port = String(location.port || '');
        const devServerPorts = new Set(['4173', '5173']);
        if (devServerPorts.has(port)) return `${location.protocol}//${location.hostname}:3001`;
        return '';
      }
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
      const cfg = publicConfigCache || await fetchJsonWithTimeout(getApiBaseUrl() + '/api/config', 2000);
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
      if (!Number.isFinite(n)) return '—';
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
        if (ctx.price && (!Number.isFinite(km) || km <= 0)) ctx.price.textContent = '€ —';
      }
    }

    function createMap(ctx) {
      if (!ctx || !ctx.mapEl) return null;
      if (!window.L || typeof window.L.map !== 'function') return null;
      const mapEl = ctx.mapEl;

      if (leafletMapsByEl) {
        const cached = leafletMapsByEl.get(mapEl);
        if (cached && cached.map && cached.layer) {
          ctx._map = cached;
          return cached;
        }
      }

      if (ctx._map) {
        if (leafletMapsByEl) leafletMapsByEl.set(mapEl, ctx._map);
        return ctx._map;
      }

      try {
        if (mapEl && mapEl._leaflet_id) {
          try { delete mapEl._leaflet_id; } catch {}
        }

        const map = window.L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const layer = window.L.layerGroup().addTo(map);
        map.setView([41.9, 12.5], 6);

        ctx._map = { map, layer };
        if (leafletMapsByEl) leafletMapsByEl.set(mapEl, ctx._map);
        try { map.invalidateSize(); } catch {}
        return ctx._map;
      } catch {
        return null;
      }
    }

    function clearMap(ctx) {
      if (!ctx) return;
      let m = ctx._map;
      if (!m && leafletMapsByEl && ctx.mapEl) m = leafletMapsByEl.get(ctx.mapEl) || null;
      if (!m || !m.layer) return;
      ctx._map = m;
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

      let raw = null;
      if (geometry && geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) raw = geometry.coordinates;
      if (geometry && geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) raw = geometry.coordinates.flat();

      if (raw && raw.length >= 2) {
        const latLngs = raw
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

    function buildTransportApiBaseCandidates() {
      const out = [];
      const override = getApiBaseUrlOverride({ includeStorage: true });
      if (override) out.push(override);

      const base = getApiBaseUrl();
      if (base) out.push(base);

      const isLocalHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      const port = String(location.port || '');
      const devServerPorts = new Set(['4173', '5173']);
      if (isLocalHost && devServerPorts.has(port)) {
        out.push(`${location.protocol}//${location.hostname}:3001`);
        out.push(`${location.protocol}//${location.hostname}:3002`);
      }

      if (!override && !base) out.push('');
      return Array.from(new Set(out));
    }

    async function fetchTransportRouteJson(fromAddress, toAddress) {
      const candidates = buildTransportApiBaseCandidates();
      let lastErr = null;

      for (const base of candidates) {
        try {
          const res = await fetch(String(base || '') + '/api/transport/route', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromAddress, toAddress })
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) {
            const code = json && typeof json === 'object' && json.error ? String(json.error) : '';
            if (code) throw new Error(code);
            lastErr = new Error('SERVER_ERROR');
            continue;
          }
          return json;
        } catch (e) {
          lastErr = e;
          const msg = String(e && e.message ? e.message : e).toLowerCase();
          if (
            msg.includes('failed to fetch') ||
            msg.includes('fetch failed') ||
            msg.includes('networkerror') ||
            msg.includes('load failed')
          ) continue;
          throw e;
        }
      }

      throw lastErr || new Error('SERVER_ERROR');
    }

    async function runTransportCalc(ctx, data) {
      if (!ctx) return;
      const fromAddress = String(ctx.from && ctx.from.value || '').trim();
      const toAddress = String(ctx.to && ctx.to.value || '').trim();
      if (!fromAddress || !toAddress) return;

      if (ctx.status) ctx.status.textContent = 'Calcolo in corso…';

      try {
        const json = await fetchTransportRouteJson(fromAddress, toAddress);

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

        try {
          drawRouteOnMap(ctx, json.from, json.to, json.geometry);
        } catch (err) {
          posthogCapture('transport_map_error', {
            context: (ctx === transportDialog) ? 'dialog' : 'sezione',
            roulotte_id: currentDetailId ? String(currentDetailId) : null,
            error: String(err && err.message ? err.message : err)
          });
        }

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
          else if (msg === 'ORS_UNAUTHORIZED') ctx.status.textContent = 'Servizio di calcolo percorso non autorizzato.';
          else if (msg === 'ORS_RATE_LIMIT') ctx.status.textContent = 'Troppe richieste al servizio. Riprova tra poco.';
          else if (msg === 'ORS_TIMEOUT') ctx.status.textContent = 'Servizio troppo lento. Riprova tra poco.';
          else if (msg === 'ORS_UPSTREAM_ERROR') ctx.status.textContent = 'Servizio di calcolo percorso non disponibile.';
          else if (msg === 'FROM_NOT_FOUND') ctx.status.textContent = 'Indirizzo di partenza non trovato.';
          else if (msg === 'TO_NOT_FOUND') ctx.status.textContent = 'Indirizzo di destinazione non trovato.';
          else if (String(msg || '').toLowerCase().includes('failed to fetch') || String(msg || '').toLowerCase().includes('networkerror') || String(msg || '').toLowerCase().includes('load failed')) ctx.status.textContent = 'Servizio non raggiungibile. Riprova più tardi.';
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
      if (!shareMode) {
        try { localStorage.setItem('public_filters_v1', JSON.stringify(state)); } catch {}
      }
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
      if (shareMode) return;
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
      return fuzzyTextMatch(hay, q);
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
    let remoteSuggestSupported = null;
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
        const t = String(title || '—');
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
      if (ctx.distance) ctx.distance.textContent = '—';
      if (ctx.duration) ctx.duration.textContent = '—';
      if (ctx.price) ctx.price.textContent = '€ —';
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
      const categoriesById = {};
      (db.categories || []).forEach((c) => {
        if (c && c.id !== undefined) categoriesById[c.id] = c.name;
      });
      detailTitle.textContent = `${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' });
      const categoryName = categoriesById[r.categoryId] || '—';
      detailMeta.textContent = tr('detail.meta', {
        defaultValue: `ID ${r.id || '—'} • ${categoryName} • Anno ${r.anno || '—'} • Stato ${r.stato || '—'}`,
        id: r.id || '—',
        category: categoryName,
        year: r.anno || '—',
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
        detailNote.innerHTML = sanitizeHtmlForPublicInsert(note);
      } else {
        detailNote.hidden = true;
        detailNote.innerHTML = '';
      }
      detailGallery.innerHTML = '';
      if (detailPlanimetria) {
        detailPlanimetria.style.display = 'none';
        detailPlanimetria.innerHTML = '';
      }
      if (detailVideo) {
        detailVideo.style.display = 'none';
        detailVideo.innerHTML = '';
      }
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
          const sizes = '(max-width:640px) 100vw, 33vw';
          const { picture, img } = createResponsivePicture(getPhotoUrl(item, 'thumb'), getPhotoUrl(item, 'src'), sizes, i === 0);
          const altText = (typeof item === 'object' && item.alt)
            ? item.alt
            : tr('detail.photoAlt', { defaultValue: `Foto di ${detailTitle.textContent}`, title: detailTitle.textContent });
          img.alt = altText;
          if (i === 0) img.setAttribute('fetchpriority', 'high');
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.addEventListener('load', () => { wrap.style.filter = 'none'; img.classList.add('loaded'); });
          img.addEventListener('click', () => openLightbox(i));
          try {
            img.setAttribute('data-pswp-src', getPhotoUrl(item, 'src'));
            img.setAttribute('data-pswp-width', '1280');
            img.setAttribute('data-pswp-height', '960');
          } catch {}
          wrap.appendChild(picture);
          detailGallery.appendChild(wrap);
        });
        try {
          if (window && typeof window.PhotoswipeLightbox !== 'undefined') {
            const lightbox = new window.PhotoswipeLightbox({
              gallery: '#detailGallery',
              children: 'img',
              pswpModule: () => import('https://unpkg.com/photoswipe@5/dist/photoswipe.esm.min.js')
            });
            lightbox.init();
          }
        } catch {}
      }
      if (r.planimetriaUrl && detailPlanimetria) {
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
      if (r.videoUrl && detailVideo) {
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
      try { setCanonicalAndMeta(); } catch {}
      try {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', 'open');
      } catch {
        try { dialog.setAttribute('open', 'open'); } catch {}
      }
      setTimeout(() => {
        const m = createMap(transportDialog);
        if (m && m.map && typeof m.map.invalidateSize === 'function') m.map.invalidateSize(true);
      }, 60);
      try { closeDialog.focus(); } catch {}
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
      if (themeToggleEl) {
        const label = next === 'dark'
          ? tr('actions.themeDark', { defaultValue: 'Tema: Scuro' })
          : tr('actions.themeLight', { defaultValue: 'Tema: Chiaro' });
        themeToggleEl.setAttribute('aria-label', label);
        themeToggleEl.setAttribute('title', label);
        themeToggleEl.innerHTML = next === 'dark'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a6.5 6.5 0 1 0 9.8 9.8z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
      }
    }

    function initTheme() {
      const saved = localStorage.getItem('public_theme');
      if (saved) applyTheme(saved);
      else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }
    }
    function initParallax() {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY || 0;
          document.documentElement.style.setProperty('--parallax-y', (y * 0.06) + 'px');
          try {
            if (y > 8) document.body.classList.add('scrolled');
            else document.body.classList.remove('scrolled');
          } catch {}
          ticking = false;
        });
      }, { passive: true });
    }
    window.addEventListener('DOMContentLoaded', () => { initParallax(); }, { once: true });
    function ensureVoiceToggle() {
      let el = document.getElementById('voiceToggle');
      const svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 19v3"/><path d="M8 22h8"/></svg>';
      if (el && String(el.tagName || '').toLowerCase() !== 'button') {
        try { el.remove(); } catch {}
        el = null;
      }
      if (!el) {
        el = document.createElement('button');
        el.id = 'voiceToggle';
      }
      el.className = 'btn icon-btn';
      el.type = 'button';
      el.setAttribute('aria-pressed', voiceActive ? 'true' : 'false');
      if (!el.innerHTML || el.innerHTML.indexOf('<svg') === -1) el.innerHTML = svg;
      el.hidden = true;
      el.setAttribute('aria-label', tr('voice.start', { defaultValue: 'Avvia comandi vocali' }));
      el.setAttribute('title', tr('voice.start', { defaultValue: 'Avvia comandi vocali' }));

      const actions = document.querySelector('#editableHeader .actions') || document.querySelector('.actions');
      if (!actions) return;
      if (el.parentElement !== actions) {
        const theme = actions.querySelector('#themeToggle');
        if (theme && theme.parentElement === actions) theme.insertAdjacentElement('afterend', el);
        else actions.insertBefore(el, actions.firstChild || null);
      }
    }
    function ensureAdminStar() {
      let el = document.getElementById('adminStar');
      const svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.7-6.3 3.7 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>';
      if (el && String(el.tagName || '').toLowerCase() !== 'a') {
        try { el.remove(); } catch {}
        el = null;
      }
      if (!el) {
        el = document.createElement('a');
        el.id = 'adminStar';
      }
      el.className = 'btn icon-btn';
      el.href = 'admin.html';
      el.setAttribute('aria-label', 'Admin');
      el.setAttribute('title', 'Admin');
      if (!String(el.innerHTML || '').trim()) el.innerHTML = svg;
      document.body.appendChild(el);
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

    function escapeHtmlText(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderTemplateString(templateHtml, data) {
      let out = String(templateHtml || '');
      if (!out) return '';
      const d = (data && typeof data === 'object') ? data : {};
      Object.keys(d).forEach(k => {
        const token = '{{' + k + '}}';
        out = out.split(token).join(escapeHtmlText(d[k] ?? ''));
      });
      return out;
    }

    function buildDefaultCardElement(r, categoriesById) {
      const card = document.createElement('article');
      card.className = 'card';
      try {
        const stateLabel = getStatusLabel(r.stato);
        if (stateLabel) {
          const ribbon = document.createElement('div');
          ribbon.className = 'card-ribbon';
          ribbon.dataset.state = stateLabel;
          ribbon.textContent = stateLabel;
          card.appendChild(ribbon);
        }
      } catch {}
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
        const sizes = '(max-width:640px) 100vw, (max-width:980px) 50vw, 33vw';
        const { picture, img } = createResponsivePicture(getPhotoUrl(firstPhoto, 'thumb'), getPhotoUrl(firstPhoto, 'src'), sizes, false);
        const altText = (typeof firstPhoto === 'object' && firstPhoto.alt)
          ? firstPhoto.alt
          : (`${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' }));
        img.alt = altText;
        img.addEventListener('load', () => { media.style.filter = 'none'; img.classList.add('loaded'); });
        media.appendChild(picture);
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
      tagYear.textContent = `${tr('card.yearPrefix', { defaultValue: 'Anno' })} ${r.anno || '—'}`;
      const tagState = document.createElement('span');
      tagState.className = 'tag state';
      tagState.textContent = getStatusLabel(r.stato);
      try { tagState.dataset.state = getStatusLabel(r.stato); } catch {}
      const tagCategory = document.createElement('span');
      tagCategory.className = 'tag';
      tagCategory.textContent = categoriesById[r.categoryId] || '—';
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
      detailsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDetails(r);
      });
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
      const categoryName = categoriesById[r.categoryId] || '—';
      const title = `${r.marca || ''} ${r.modello || ''}`.trim() || tr('common.caravan', { defaultValue: 'Roulotte' });
      const statusLabel = getStatusLabel(r.stato);
      const noteText = truncate(stripHtml(r.note || ''), 160);
      const html = renderTemplateString(cardTemplateHtml, {
        id: String(r.id || ''),
        title,
        brand: String(r.marca || ''),
        model: String(r.modello || ''),
        year: String(r.anno || '—'),
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
        try {
          const stateLabel = getStatusLabel(r.stato);
          if (stateLabel) {
            const ribbon = document.createElement('div');
            ribbon.className = 'card-ribbon';
            ribbon.dataset.state = stateLabel;
            ribbon.textContent = stateLabel;
            root.appendChild(ribbon);
          }
        } catch {}

        const imgSlot = root.querySelector('img[data-slot="photo"]') || root.querySelector('img');
        if (imgSlot) {
          if (photoThumb) {
            const sizes = '(max-width:640px) 100vw, (max-width:980px) 50vw, 33vw';
            const { picture, img } = createResponsivePicture(photoThumb, photoSrc, sizes, false);
            const altText = (typeof firstPhoto === 'object' && firstPhoto.alt) ? firstPhoto.alt : title;
            img.alt = altText;
            imgSlot.replaceWith(picture);
          } else {
            try { imgSlot.remove(); } catch {}
          }
        }

        let detailsEl = root.querySelector('[data-action="details"]');
        if (!detailsEl) {
          const maybeActions = root.querySelector('.card-actions') || root;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn';
          btn.textContent = tr('card.details', { defaultValue: 'Dettagli' });
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openDetails(r);
          });
          maybeActions.appendChild(btn);
          detailsEl = btn;
        } else {
          if (detailsEl.tagName === 'BUTTON') detailsEl.type = 'button';
          detailsEl.classList.add('btn');
          detailsEl.textContent = tr('card.details', { defaultValue: 'Dettagli' });
          detailsEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
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

    function wireCardClickOpenDetails(card, r) {
      if (!card || typeof card.addEventListener !== 'function') return;
      card.classList.add('card-clickable');
      if (r && r.id !== undefined && card.dataset) card.dataset.roulotteId = String(r.id);
      card.addEventListener('click', (e) => {
        const target = e && e.target;
        if (target && typeof target.closest === 'function') {
          const interactive = target.closest('button, a, input, select, textarea, label, summary, details');
          if (interactive) return;
        }
        openDetails(r);
      });
    }

    function render() {
      ensureHomeDom();
      refreshDomRefs();
      buildTransportContexts();
      if (!qEl || !statoEl || !sortEl || !cardsEl || !emptyEl || !liveStatusEl) return;
      const db = window.RoulotteStore.getDB();
      const all = shareMode ? (Array.isArray(shareRoulottes) ? shareRoulottes : []) : (db.roulottes || []);
      const base = shareMode ? all : (remoteActive ? remoteResults : all);
      syncCategoryOptions(db.categories || [], categoryEl ? categoryEl.value : '');
      const categoriesById = Object.fromEntries((db.categories || []).map(c => [c.id, c.name]));
      if (totalCountEl) { totalCountEl.textContent = String(all.length); totalCountEl.hidden = true; }
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = shareMode
          ? (shareExpiresAt ? new Date(shareExpiresAt).toLocaleString(getLocaleForLang(currentLang)) : '—')
          : (db.updatedAt ? new Date(db.updatedAt).toLocaleString(getLocaleForLang(currentLang)) : '—');
        lastUpdatedEl.hidden = true;
      }

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
      if (resultCountEl) { resultCountEl.textContent = String(sorted.length); resultCountEl.hidden = true; }
      if (liveStatusEl) liveStatusEl.textContent = '';

      emptyEl.hidden = sorted.length !== 0;
      const frag = document.createDocumentFragment();
      sorted.forEach((r, index) => {
        const card = createCardElement(r, categoriesById);
        if (card) wireCardClickOpenDetails(card, r);
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
      publicConfigCache = await fetchJsonWithTimeout(getApiBaseUrl() + '/api/config', 2000);
      applyPublicConfig(publicConfigCache);
      initPosthog();
      initTheme();
      ensureVoiceToggle();
      ensureAdminStar();
      const onTransport = applyTopLevelRouteVisibility();
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
        updateTransportUi(transportStandalone, last.title || '—', last.data);
      }
      if (onTransport) {
        createMap(transportStandalone);
        setTimeout(() => {
          try {
            if (transportStandalone && transportStandalone._map && transportStandalone._map.map) {
              transportStandalone._map.map.invalidateSize();
            }
          } catch {}
        }, 50);
      }
      pendingUrlDetailId = getUrlState().id || null;
      if (!shareMode) restoreFilters();
      setCanonicalAndMeta();
      injectJsonLdWebSite();
      const previewMode = (() => {
        try {
          const p = new URLSearchParams(location.search || '');
          return p.get('preview') === '1' || p.get('draft') === '1';
        } catch {
          return false;
        }
      })();
      const previewToken = (() => {
        if (!previewMode) return '';
        try { return String(sessionStorage.getItem('admin_jwt_token') || '').trim(); } catch { return ''; }
      })();
      function getContentHeaders() {
        const headers = { 'Accept': 'application/json' };
        if (previewToken) headers['Authorization'] = 'Bearer ' + previewToken;
        return headers;
      }
      function pickPublishedOrData(json) {
        if (previewToken) return String((json && (json.data || json.published_data)) || '').trim();
        return String((json && (json.published_data || json.data)) || '').trim();
      }
      function sanitizePublicHtml(html) {
        const cleaned = sanitizeHtmlForPublicInsert(html);
        try {
          const doc = new DOMParser().parseFromString(String(cleaned || ''), 'text/html');
          const root = doc.body || doc;
          const removeBySelector = [
            '[data-i18n="actions.editSite"]',
            '#editSite',
            '.edit-site',
            '[data-i18n="nav.transport"]',
            '[data-i18n="nav.catalog"]',
            '[data-i18n="nav.menu"]',
            '[data-i18n="nav.admin"]',
          ];
          removeBySelector.forEach(sel => root.querySelectorAll(sel).forEach(n => n.remove()));
          Array.from(root.querySelectorAll('a,button,span,div')).forEach(n => {
            const t = String(n.textContent || '').toLowerCase();
            if (
              t.includes('modifica sito') ||
              t.includes('area admin') ||
              t.includes('trasporto') ||
              t.includes('catalogo') ||
              t.trim() === 'menu' ||
              t.trim() === 'admin'
            ) n.remove();
          });
          return root.innerHTML || '';
        } catch { return String(cleaned || ''); }
      }
      function looksLikeHomeFragment(html) {
        const raw = String(html || '').trim();
        if (!raw) return false;
        try {
          const doc = new DOMParser().parseFromString(raw, 'text/html');
          const root = doc.body || doc;
          const hasEditableFilters = !!root.querySelector('#editableFilters');
          const hasSearch = !!root.querySelector('[role="search"], input[name="q"], input[type="search"]');
          return hasEditableFilters || hasSearch;
        } catch {
          return false;
        }
      }
      document.documentElement.setAttribute('data-hydrating','1');
      try {
      if (currentLang === 'it') {
        try {
          const r1 = await fetch(getApiBaseUrl() + '/api/content/home_hero_title', { headers: getContentHeaders() });
          if (r1.ok) {
            const j1 = await r1.json();
            const t1 = String(j1.data || '').trim();
            if (t1) { const el = document.getElementById('heroTitle'); if (el) el.textContent = t1; }
          }
        } catch {}
        try {
          const r2 = await fetch(getApiBaseUrl() + '/api/content/home_hero_text', { headers: getContentHeaders() });
          if (r2.ok) {
            const j2 = await r2.json();
            const t2 = String(j2.data || '').trim();
            if (t2) { const el2 = document.getElementById('heroText'); if (el2) el2.textContent = t2; }
          }
        } catch {}
        try {
          const rFrag = await fetch(getApiBaseUrl() + '/api/content/page_home_fragment', { headers: getContentHeaders() });
          const rCss = await fetch(getApiBaseUrl() + '/api/content/page_home_styles', { headers: getContentHeaders() });
          let appliedHomeFragment = false;
          if (rFrag.ok) {
            const jFrag = await rFrag.json();
            const html = pickPublishedOrData(jFrag);
            if (html && looksLikeHomeFragment(html)) {
              const root = document.getElementById('editableHome');
              if (root) {
                root.innerHTML = sanitizePublicHtml(html);
                pruneHomeSections(root);
                appliedHomeFragment = true;
              }
            }
          }
          if (appliedHomeFragment && rCss.ok) {
            const jCss = await rCss.json();
            const css = pickPublishedOrData(jCss);
            if (css) {
              const st = document.getElementById('pageCustomCss') || document.createElement('style');
              st.id = 'pageCustomCss';
              st.textContent = css;
              document.head.appendChild(st);
            }
          }
        } catch {}
        // Header
        try {
          const rHFrag = await fetch(getApiBaseUrl() + '/api/content/page_header_fragment', { headers: getContentHeaders() });
          const rHCss = await fetch(getApiBaseUrl() + '/api/content/page_header_styles', { headers: getContentHeaders() });
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
              if (hRoot) hRoot.innerHTML = sanitizePublicHtml(htmlH);
            }
          }
        } catch {}
        // Footer
        try {
          const rFFrag = await fetch(getApiBaseUrl() + '/api/content/page_footer_fragment', { headers: getContentHeaders() });
          const rFCss = await fetch(getApiBaseUrl() + '/api/content/page_footer_styles', { headers: getContentHeaders() });
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
              if (fRoot) fRoot.innerHTML = sanitizePublicHtml(htmlF);
            }
          }
        } catch {}
        try { ensureDefaultFooterFromConfig(publicConfigCache); } catch {}
        // List Top/Bottom
        try {
          const rLT = await fetch(getApiBaseUrl() + '/api/content/page_list_top_fragment', { headers: getContentHeaders() });
          const rLTs = await fetch(getApiBaseUrl() + '/api/content/page_list_top_styles', { headers: getContentHeaders() });
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
              if (ltRoot) ltRoot.innerHTML = sanitizeHtmlForPublicInsert(htmlLT);
            }
          }
        } catch {}
        try {
          const rLB = await fetch(getApiBaseUrl() + '/api/content/page_list_bottom_fragment', { headers: getContentHeaders() });
          const rLBs = await fetch(getApiBaseUrl() + '/api/content/page_list_bottom_styles', { headers: getContentHeaders() });
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
              if (lbRoot) lbRoot.innerHTML = sanitizeHtmlForPublicInsert(htmlLB);
            }
          }
        } catch {}

        // Filtri
        try {
          const rFF = await fetch(getApiBaseUrl() + '/api/content/page_filters_fragment', { headers: getContentHeaders() });
          const rFFs = await fetch(getApiBaseUrl() + '/api/content/page_filters_styles', { headers: getContentHeaders() });
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
                if (inner) rootF.innerHTML = sanitizeHtmlForPublicInsert(inner);
              }
            }
          }
        } catch {}

        // Dialog dettagli
        try {
          const rDD = await fetch(getApiBaseUrl() + '/api/content/page_detail_dialog_fragment', { headers: getContentHeaders() });
          const rDDs = await fetch(getApiBaseUrl() + '/api/content/page_detail_dialog_styles', { headers: getContentHeaders() });
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
                if (d) d.innerHTML = sanitizeHtmlForPublicInsert(inner);
              }
            }
          }
        } catch {}

        // Template card
        try {
          const rCT = await fetch(getApiBaseUrl() + '/api/content/page_card_template_fragment', { headers: getContentHeaders() });
          const rCTs = await fetch(getApiBaseUrl() + '/api/content/page_card_template_styles', { headers: getContentHeaders() });
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
        ensureContrastOverrides();
      }
      } finally {
        document.documentElement.removeAttribute('data-hydrating');
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
            if (shareTitle) document.title = (siteSeoDefaultTitle || siteBrandName || 'Roulotte online') + ' – ' + shareTitle;
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
              alert(tr('errors.loadDetail', { defaultValue: 'Impossibile caricare la scheda. Riprova più tardi.' }));
            }
          }
        }

      } catch (error) {
        console.error("Errore durante l'inizializzazione dello store:", error);
        dataLoadError = true;
        setEmptyStateMessage(tr('errors.loadData', { defaultValue: "Si è verificato un errore nel caricamento dei dati. Riprova più tardi." }), { show: true, showRetry: true });
      } finally {
        hideCardsLoading();
      }
    }
    boot();
