/* =====================================================================
   LensAI · Sprint 2 · FIAP Challenge JOVI
   Lógica da jornada interativa (HTML + CSS + JS + Tailwind)
   Autor: Victor Holanda — RM571263
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------- Helpers ------------------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };

  /* ------------------------- Dados ------------------------- */
  const SCENES = [
    { id: 'palm',      name: 'Silhuetas tropicais', cls: 'scene--palm',      tags: ['por-do-sol'],          base: { light: 62, comp: 86, depth: 70 }, score: 79 },
    { id: 'sunset',    name: 'Baía ao pôr do sol',  cls: 'scene--sunset',    tags: ['por-do-sol'],          base: { light: 76, comp: 84, depth: 66 }, score: 81 },
    { id: 'turquoise', name: 'Praia turquesa',      cls: 'scene--turquoise', tags: ['praia'],               base: { light: 90, comp: 74, depth: 58 }, score: 80 },
    { id: 'golden',    name: 'Mar dourado',         cls: 'scene--golden',    tags: ['praia', 'por-do-sol'], base: { light: 84, comp: 72, depth: 56 }, score: 78 },
    { id: 'violet',    name: 'Entardecer violeta',  cls: 'scene--violet',    tags: ['noite'],               base: { light: 42, comp: 78, depth: 64 }, score: 65 },
    { id: 'night',     name: 'Crepúsculo',          cls: 'scene--night',     tags: ['noite'],               base: { light: 26, comp: 70, depth: 60 }, score: 55 },
  ];
  const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];

  // Distâncias focais reais do modo Retrato do JOVI V70
  const FOCALS = [
    { mm: '23mm', label: 'Paisagem',     scale: 1.00 },
    { mm: '35mm', label: 'Rua',          scale: 1.18 },
    { mm: '50mm', label: 'Clássico',     scale: 1.42 },
    { mm: '85mm', label: 'Teleobjetiva', scale: 1.75 },
  ];

  const ADJ = {
    exposure: { id: 'exposure', label: 'Aumentar exposição +30%', sub: 'ISO 800 → +1000 · EV +0.8',  boost: 8,  metric: 'light', gain: 14, f: { b: 0.30, c: 0.05, s: 0 },   ico: 'sun' },
    night:    { id: 'night',    label: 'Ativar Modo Noite',       sub: 'Reduz ruído · Longa exposição', boost: 11, metric: 'light', gain: 22, f: { b: 0.20, c: 0, s: 0.18 }, ico: 'moon' },
    ois:      { id: 'ois',      label: 'Estabilização OIS',       sub: 'Reduz borrão em baixa luz',    boost: 5,  metric: 'depth', gain: 12, f: { b: 0, c: 0.10, s: 0 },   ico: 'target' },
  };
  const ADJ_LIST = ['exposure', 'night', 'ois'];

  const ICONS = {
    sun:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
    moon:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>',
    target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  // Ícone "brilho LensAI" (substitui o emoji ✨)
  const SPARK = (s = 12, c = 'var(--amber)') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="M12 2l1.7 5.1L19 8.8l-5.3 1.7L12 16l-1.7-5.5L5 8.8l5.3-1.7L12 2Z"/></svg>`;
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /* ------------------------- Estado ------------------------- */
  const state = {
    screen: 'splash',
    sceneIdx: 0,
    mode: 'foto',
    adj: { exposure: false, night: false, ois: false },
    focalScale: 1,
    shot: false,
    gallery: store.get('lensai_gallery_v2', null),
    settings: store.get('lensai_settings', { autoSuggest: true, autoNight: true, grid: false, saveMeta: true, haptics: true }),
    viewingId: null,
    perfMs: 0,
  };

  /* ------------------------- Filtros / Score ------------------------- */
  function combine(adj) {
    let b = 1, c = 1, s = 1;
    ADJ_LIST.forEach((k) => { if (adj[k]) { b += ADJ[k].f.b; c += ADJ[k].f.c; s += ADJ[k].f.s; } });
    return { b, c, s };
  }
  function filterStr(adj, edit) {
    const { b, c, s } = combine(adj);
    const e = edit || { bright: 100, contrast: 100, sat: 100 };
    return `brightness(${(b * e.bright / 100).toFixed(2)}) contrast(${(c * e.contrast / 100).toFixed(2)}) saturate(${(s * e.sat / 100).toFixed(2)})`;
  }
  function liveScore(scene, adj) {
    let sc = scene.score;
    ADJ_LIST.forEach((k) => { if (adj[k]) sc += ADJ[k].boost; });
    return clamp(Math.round(sc), 0, 98);
  }
  function liveMeters(scene, adj) {
    const m = { light: scene.base.light, comp: scene.base.comp, depth: scene.base.depth };
    ADJ_LIST.forEach((k) => { if (adj[k]) m[ADJ[k].metric] += ADJ[k].gain; });
    m.comp += (adj.exposure || adj.night ? 4 : 0);
    Object.keys(m).forEach((k) => (m[k] = clamp(m[k], 0, 100)));
    return m;
  }

  /* ------------------------- Toast ------------------------- */
  let toastT;
  function toast(msg) {
    if (state.shot) return; // sem toasts durante captura de tela
    const el = $('#toast');
    $('div', el).textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }
  const buzz = (ms = 12) => { if (state.settings.haptics && navigator.vibrate) navigator.vibrate(ms); };

  /* ------------------------- Navegação ------------------------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === screen));
    const navScreens = ['gallery', 'settings'];
    const nav = $('#bottomNav');
    nav.classList.toggle('hidden', !navScreens.includes(screen));
    $$('.nav-item').forEach((n) => {
      const on = n.dataset.nav === screen;
      n.style.color = on ? '#fff' : 'var(--muted)';
    });
    if (screen === 'camera') enterCamera();
    if (screen === 'gallery') renderGallery();
    if (screen === 'settings') renderSettings();
  }

  /* ------------------------- Boot / Splash ------------------------- */
  function boot() {
    const bar = $('#bootBar');
    const status = $('#bootStatus');
    const steps = ['Inicializando IA de câmera…', 'Calibrando sensor 200 MP…', 'Carregando modelos de cena…', 'Pronto!'];
    let p = 0, i = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + 18 + Math.random() * 16);
      bar.style.width = p + '%';
      const idx = Math.min(steps.length - 1, Math.floor((p / 100) * steps.length));
      if (idx !== i) { i = idx; status.textContent = steps[idx]; }
      if (p >= 100) {
        clearInterval(tick);
        status.textContent = `Pronto em ${state.perfMs} ms ⚡`;
        setTimeout(() => { if (state.screen === 'splash') go('permission'); }, 900);
      }
    }, 260);
  }

  /* ------------------------- Câmera ------------------------- */
  function enterCamera() {
    const scene = SCENES[state.sceneIdx];
    if (state.settings.autoNight && scene.base.light < 30 && !state.adj.night) state.adj.night = true;
    paintScene();
    runAnalysis();
    updateSuggestPill();
    $('#vfGrid').classList.toggle('on', !!state.settings.grid);
    if (!enterCamera._once) {
      enterCamera._once = true;
      setTimeout(() => toast(`Interface carregada em ${state.perfMs} ms ⚡`), 400);
    }
  }

  function paintScene() {
    const scene = SCENES[state.sceneIdx];
    const el = $('#cameraScene');
    el.className = 'scene ' + scene.cls;
    el.style.filter = filterStr(state.adj);
    el.style.transform = 'scale(' + state.focalScale + ')';
  }

  function renderFocals(active = 2) {
    $('#focalChips').innerHTML = FOCALS.map((f, i) =>
      `<button class="chip glass px-2.5 py-1 rounded-full text-[11px] ${i === active ? 'active' : ''}" data-focal="${i}">${f.mm}</button>`).join('');
    $$('#focalChips [data-focal]').forEach((b) => b.addEventListener('click', () => selectFocal(+b.dataset.focal)));
  }
  function selectFocal(i) {
    const f = FOCALS[i];
    state.focalScale = f.scale;
    $$('#focalChips .chip').forEach((c, idx) => c.classList.toggle('active', idx === i));
    paintScene();
    buzz(6);
    toast(`${f.mm} · Retrato ${f.label}`);
  }

  function runAnalysis() {
    const scene = SCENES[state.sceneIdx];
    $('#scanline').classList.add('on');
    $('#mLight').style.width = '0%'; $('#mComp').style.width = '0%'; $('#mDepth').style.width = '0%';
    const m = liveMeters(scene, state.adj);
    setTimeout(() => {
      $('#mLight').style.width = m.light + '%'; $('#mLightVal').textContent = m.light + '%';
      $('#mComp').style.width  = m.comp  + '%'; $('#mCompVal').textContent  = m.comp + '%';
      $('#mDepth').style.width = m.depth + '%'; $('#mDepthVal').textContent = m.depth + '%';
    }, 80);
    animateNumber($('#sceneScore'), liveScore(scene, state.adj));
    setTimeout(() => $('#scanline').classList.remove('on'), 2400);
  }

  function animateNumber(el, target, dur = 900) {
    const start = parseInt(el.textContent, 10) || 0;
    const t0 = performance.now();
    (function frame(t) {
      const k = clamp((t - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }

  function updateSuggestPill() {
    const remaining = ADJ_LIST.filter((k) => !state.adj[k]).length;
    const pill = $('#suggestPill');
    if (remaining === 0) {
      pill.querySelector('.text-sm').innerHTML = 'Cena otimizada';
      pill.querySelector('.text-\\[11px\\]').textContent = 'Todos os ajustes aplicados';
    } else {
      pill.querySelector('.text-sm').innerHTML = `LensAI tem <span id="suggestCount">${remaining}</span> sugestões`;
      pill.querySelector('.text-\\[11px\\]').textContent = 'Toque para melhorar esta foto';
    }
    if (state.settings.autoSuggest && remaining > 0) pill.classList.add('pulse');
    else pill.classList.remove('pulse');
  }

  function swapScene() {
    state.sceneIdx = (state.sceneIdx + 1) % SCENES.length;
    state.adj = { exposure: false, night: false, ois: false };
    buzz(8);
    enterCamera();
    toast('Cena: ' + SCENES[state.sceneIdx].name);
  }

  function setMode(mode) {
    state.mode = mode;
    $$('#modeChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.mode === mode));
    const isRetrato = mode === 'retrato';
    $('#focalRow').classList.toggle('hidden', !isRetrato);
    if (isRetrato) { state.focalScale = FOCALS[2].scale; renderFocals(2); }
    else { state.focalScale = 1; }
    if (mode === 'noite') { state.adj.night = true; }
    paintScene(); runAnalysis(); updateSuggestPill();
    $('#shutter').classList.toggle('recording', mode === 'video');
    buzz(6);
  }

  function focusAt(x, y) {
    const ring = $('#focusRing');
    ring.style.left = x + 'px'; ring.style.top = y + 'px';
    ring.classList.remove('show'); void ring.offsetWidth; ring.classList.add('show');
  }

  function capture() {
    buzz(20);
    $('#flash').classList.remove('fire'); void $('#flash').offsetWidth; $('#flash').classList.add('fire');
    const scene = SCENES[state.sceneIdx];
    const tags = new Set();
    if (ADJ_LIST.some((k) => state.adj[k])) tags.add('lensai');
    scene.tags.forEach((t) => tags.add(t));
    if (state.mode === 'noite') tags.add('noite');
    if (state.mode === 'retrato') tags.add('retrato');
    const photo = {
      id: 'p' + Date.now(),
      sceneId: scene.id,
      adj: { ...state.adj },
      score: liveScore(scene, state.adj),
      tags: Array.from(tags),
      ts: Date.now(),
      edit: { bright: 100, contrast: 100, sat: 100 },
    };
    state.gallery.unshift(photo);
    persistGallery();
    refreshThumb();
    setTimeout(() => toast('Foto salva na galeria ✓'), 260);
  }

  function refreshThumb() {
    const latest = state.gallery[0];
    const thumb = $('#galleryThumb .scene');
    if (latest) {
      const sc = sceneById(latest.sceneId);
      thumb.className = 'scene ' + sc.cls;
      thumb.style.filter = filterStr(latest.adj, latest.edit);
    }
  }

  /* ------------------------- Sheet: Sugestões ------------------------- */
  function openSuggest() {
    renderSuggestList();
    $('#sheetBackdrop').classList.add('open');
    $('#suggestSheet').classList.add('open');
  }
  function closeSuggest() {
    $('#sheetBackdrop').classList.remove('open');
    $('#suggestSheet').classList.remove('open');
  }
  function renderSuggestList() {
    const scene = SCENES[state.sceneIdx];
    const list = $('#suggestList');
    list.innerHTML = ADJ_LIST.map((k) => {
      const a = ADJ[k]; const on = state.adj[k];
      return `<button class="w-full glass rounded-xl p-3 flex items-center gap-3 text-left" data-adj="${k}" style="${on ? 'border-color:rgba(52,211,153,.45)' : ''}">
        <span class="w-9 h-9 rounded-full grid place-items-center flex-none" style="background:${on ? 'linear-gradient(135deg,var(--purple),var(--amber))' : 'rgba(255,255,255,.08)'};color:${on ? '#fff' : 'var(--muted)'}">${ICONS[a.ico]}</span>
        <span class="flex-1">
          <span class="block text-sm font-semibold">${a.label}</span>
          <span class="block text-[11px] text-muted">${a.sub}</span>
        </span>
        <span class="switch ${on ? 'on' : ''}"></span>
      </button>`;
    }).join('');
    $('#projScore').textContent = liveScore(scene, state.adj);
    $$('#suggestList [data-adj]').forEach((btn) => btn.addEventListener('click', () => {
      const k = btn.dataset.adj;
      state.adj[k] = !state.adj[k];
      buzz(8);
      paintScene(); runAnalysis(); renderSuggestList(); updateSuggestPill();
    }));
  }
  function applyAll() {
    state.adj = { exposure: true, night: true, ois: true };
    buzz(25);
    paintScene(); runAnalysis(); renderSuggestList(); updateSuggestPill();
    const scene = SCENES[state.sceneIdx];
    toast(`Ajustes aplicados · score ${liveScore(scene, state.adj)} ✓`);
    setTimeout(closeSuggest, 650);
  }

  /* ------------------------- Galeria ------------------------- */
  function seedGallery() {
    const now = Date.now();
    const H = 3600e3, D = 86400e3;
    const seed = [
      { sceneId: 'sunset',    adj: { exposure: true,  night: false, ois: true  }, tags: ['lensai', 'por-do-sol'],          off: 2 * H },
      { sceneId: 'palm',      adj: { exposure: true,  night: false, ois: false }, tags: ['lensai', 'por-do-sol'],          off: 5 * H },
      { sceneId: 'night',     adj: { exposure: false, night: true,  ois: true  }, tags: ['lensai', 'noite'],               off: 8 * H },
      { sceneId: 'turquoise', adj: { exposure: false, night: false, ois: false }, tags: ['praia'],                         off: 1 * D + 3 * H },
      { sceneId: 'golden',    adj: { exposure: true,  night: false, ois: false }, tags: ['lensai', 'praia', 'por-do-sol'], off: 2 * D },
      { sceneId: 'violet',    adj: { exposure: false, night: true,  ois: true  }, tags: ['lensai', 'noite'],               off: 3 * D + 5 * H },
    ];
    return seed.map((s, i) => ({
      id: 'seed' + i, sceneId: s.sceneId, adj: s.adj, tags: s.tags,
      score: liveScore(sceneById(s.sceneId), s.adj), ts: now - s.off,
      edit: { bright: 100, contrast: 100, sat: 100 },
    }));
  }
  function persistGallery() { store.set('lensai_gallery_v2', state.gallery); }

  function fmtDate(ts) {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} de ${MONTHS[d.getMonth()]}, ${d.getFullYear()} · ${h}:${m}`;
  }
  function dayGroup(ts) {
    const now = new Date(); const d = new Date(ts);
    const sameDay = now.toDateString() === d.toDateString();
    if (sameDay) return 'Hoje';
    if (Date.now() - ts < 7 * 86400e3) return 'Esta semana';
    return 'Anteriores';
  }

  let galleryFilter = 'todas';
  function renderGallery() {
    const body = $('#galleryBody');
    const items = state.gallery.filter((p) => galleryFilter === 'todas' || p.tags.includes(galleryFilter));
    $('#galleryCount').textContent = `${state.gallery.length} fotos · ${state.gallery.filter(p => p.tags.includes('lensai')).length} com LensAI`;
    if (!items.length) {
      body.innerHTML = `<div class="text-center text-muted text-sm mt-20">Nenhuma foto neste filtro.<br/>Abra a câmera e toque no obturador para capturar.</div>`;
      return;
    }
    const groups = {};
    items.forEach((p) => { const g = dayGroup(p.ts); (groups[g] = groups[g] || []).push(p); });
    body.innerHTML = ['Hoje', 'Esta semana', 'Anteriores'].filter((g) => groups[g]).map((g) => `
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold">${g}</h3>
          <span class="text-[11px] text-muted">${groups[g].length}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          ${groups[g].map(cell).join('')}
        </div>
      </div>`).join('');
    $$('#galleryBody .photo-cell').forEach((c) => c.addEventListener('click', () => openPhoto(c.dataset.id)));
  }
  function cell(p) {
    const sc = sceneById(p.sceneId);
    const isLens = p.tags.includes('lensai');
    return `<button class="photo-cell relative rounded-xl overflow-hidden aspect-square rise" data-id="${p.id}" aria-label="Foto ${sc.name}, score ${p.score}${isLens ? ', otimizada pela LensAI' : ''}">
      <div class="scene ${sc.cls}" style="position:absolute;filter:${filterStr(p.adj, p.edit)}"></div>
      ${isLens ? `<span class="absolute top-1.5 left-1.5 w-6 h-6 grid place-items-center rounded-full glass">${SPARK(12)}</span>` : ''}
      <span class="absolute bottom-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md count-up" style="background:rgba(0,0,0,.5)">${p.score}</span>
    </button>`;
  }

  /* ------------------------- Detalhe da foto ------------------------- */
  function openPhoto(id) {
    const p = state.gallery.find((x) => x.id === id);
    if (!p) return;
    state.viewingId = id;
    const sc = sceneById(p.sceneId);
    const el = $('#photoScene');
    el.className = 'scene ' + sc.cls;
    el.style.filter = filterStr(p.adj, p.edit);
    $('#photoDate').textContent = fmtDate(p.ts);
    $('#photoScore').textContent = p.score;
    $('#photoTagBadge').innerHTML = p.tags.includes('lensai')
      ? `<span class="inline-flex items-center gap-1">${SPARK(11)} LensAI</span>` : sc.name;

    const chips = [];
    if (p.adj.exposure) chips.push({ t: 'Exposição', v: '+30%' });
    if (p.adj.night)    chips.push({ t: 'Modo Noite', v: 'Ativo' });
    if (p.adj.ois)      chips.push({ t: 'Estabilização', v: 'Ativa' });
    if (!chips.length)  chips.push({ t: 'Original', v: 'Sem IA' });
    $('#photoAdjustments').innerHTML = chips.map((c) => `
      <div class="glass rounded-xl px-2 py-2 text-center">
        <div class="text-[10px] text-muted">${c.t}</div>
        <div class="text-xs font-semibold text-green">${c.v}</div>
      </div>`).join('');

    // reset editor
    $('#editorPanel').classList.add('hidden');
    $('#ctlBright').value = p.edit.bright; $('#valBright').textContent = p.edit.bright + '%';
    $('#ctlContrast').value = p.edit.contrast; $('#valContrast').textContent = p.edit.contrast + '%';
    $('#ctlSat').value = p.edit.sat; $('#valSat').textContent = p.edit.sat + '%';
    resetDelete();
    go('photo');
  }

  function currentPhoto() { return state.gallery.find((x) => x.id === state.viewingId); }

  function liveEdit() {
    const p = currentPhoto(); if (!p) return;
    const edit = { bright: +$('#ctlBright').value, contrast: +$('#ctlContrast').value, sat: +$('#ctlSat').value };
    $('#valBright').textContent = edit.bright + '%';
    $('#valContrast').textContent = edit.contrast + '%';
    $('#valSat').textContent = edit.sat + '%';
    $('#photoScene').style.filter = filterStr(p.adj, edit);
  }
  function saveEdit() {
    const p = currentPhoto(); if (!p) return;
    p.edit = { bright: +$('#ctlBright').value, contrast: +$('#ctlContrast').value, sat: +$('#ctlSat').value };
    persistGallery(); refreshThumb();
    toast('Edições salvas ✓'); buzz(12);
    $('#editorPanel').classList.add('hidden');
  }

  let deleteArmed = false, deleteT;
  function resetDelete() { deleteArmed = false; const b = $('#btnDelete'); if (b) { b.style.color = ''; b.lastChild && (b.lastChild.textContent = 'Excluir'); } }
  function tryDelete() {
    const btn = $('#btnDelete');
    if (!deleteArmed) {
      deleteArmed = true;
      btn.lastChild.textContent = 'Confirmar?';
      btn.style.color = '#ff6b6b';
      clearTimeout(deleteT);
      deleteT = setTimeout(resetDelete, 2600);
      return;
    }
    state.gallery = state.gallery.filter((x) => x.id !== state.viewingId);
    persistGallery(); refreshThumb();
    buzz(20); toast('Foto excluída');
    go('gallery');
  }

  /* ------------------------- Compartilhar ------------------------- */
  function openShare() { $('#shareBackdrop').classList.add('open'); $('#shareSheet').classList.add('open'); }
  function closeShare() { $('#shareBackdrop').classList.remove('open'); $('#shareSheet').classList.remove('open'); }

  /* ------------------------- Configurações ------------------------- */
  const SETTINGS_DEF = [
    { k: 'autoSuggest', label: 'Sugestões automáticas', sub: 'IA sugere ajustes ao abrir a câmera' },
    { k: 'autoNight',   label: 'Modo Noite automático', sub: 'Ativa em ambientes escuros' },
    { k: 'grid',        label: 'Grade de composição',   sub: 'Regra dos terços no visor' },
    { k: 'saveMeta',    label: 'Salvar metadados',      sub: 'Guarda ajustes aplicados na foto' },
    { k: 'haptics',     label: 'Feedback tátil',        sub: 'Vibração ao interagir' },
  ];
  function renderSettings() {
    $('#settingsList').innerHTML = SETTINGS_DEF.map((s) => `
      <button class="w-full flex items-center gap-3 p-4 text-left" data-set="${s.k}">
        <span class="flex-1">
          <span class="block text-sm font-medium">${s.label}</span>
          <span class="block text-[11px] text-muted">${s.sub}</span>
        </span>
        <span class="switch ${state.settings[s.k] ? 'on' : ''}"></span>
      </button>`).join('');
    $('#perfLoad').textContent = state.perfMs + ' ms';
    $('#perfOptimized').textContent = state.gallery.filter((p) => p.tags.includes('lensai')).length;
    $$('#settingsList [data-set]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.set;
      state.settings[k] = !state.settings[k];
      store.set('lensai_settings', state.settings);
      $('.switch', b).classList.toggle('on', state.settings[k]);
      buzz(8);
    }));
  }

  /* ------------------------- Wiring ------------------------- */
  function wire() {
    // navegação por data-go
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

    // bottom nav
    $$('.nav-item').forEach((n) => n.addEventListener('click', () => {
      const t = n.dataset.nav;
      if (t === 'lensai') { go('camera'); setTimeout(openSuggest, 250); }
      else go(t);
    }));

    // câmera
    $('#swapScene').addEventListener('click', swapScene);
    $('#shutter').addEventListener('click', capture);
    $('#galleryThumb').addEventListener('click', () => go('gallery'));
    $('#suggestPill').addEventListener('click', openSuggest);
    $('#btnGrid').addEventListener('click', () => {
      state.settings.grid = !state.settings.grid; store.set('lensai_settings', state.settings);
      $('#vfGrid').classList.toggle('on', state.settings.grid);
    });
    $$('#modeChips .chip').forEach((c) => c.addEventListener('click', () => setMode(c.dataset.mode)));
    $('#cameraScene').addEventListener('click', (e) => {
      const r = $('#device').getBoundingClientRect();
      focusAt(e.clientX - r.left, e.clientY - r.top);
    });

    // sheet sugestões
    $('#applyAll').addEventListener('click', applyAll);
    $('#sheetCancel').addEventListener('click', closeSuggest);
    $('#sheetBackdrop').addEventListener('click', closeSuggest);

    // galeria tabs
    $$('#galleryTabs .chip').forEach((t) => t.addEventListener('click', () => {
      galleryFilter = t.dataset.filter;
      $$('#galleryTabs .chip').forEach((x) => x.classList.toggle('active', x === t));
      renderGallery();
    }));

    // detalhe
    $('#btnShare').addEventListener('click', openShare);
    $('#btnEdit').addEventListener('click', () => $('#editorPanel').classList.toggle('hidden'));
    $('#btnDelete').addEventListener('click', tryDelete);
    $('#editorSave').addEventListener('click', saveEdit);
    ['#ctlBright', '#ctlContrast', '#ctlSat'].forEach((s) => $(s).addEventListener('input', liveEdit));

    // compartilhar
    $('#shareCancel').addEventListener('click', closeShare);
    $('#shareBackdrop').addEventListener('click', closeShare);
    $$('.share-target').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.share;
      closeShare();
      buzz(10);
      toast(t === 'link' ? 'Link copiado ✓' : `Compartilhado no ${t} ✓`);
    }));
  }

  /* ------------------------- Scroll: animações da página ------------------------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1100, t0 = performance.now();
    (function frame(t) {
      const k = clamp((t - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }

  function initScroll() {
    // Revelação + contadores
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.style.transitionDelay = (el.dataset.delay || 0) + 'ms';
          el.classList.add('in');
          $$('[data-count]', el).forEach(animateCount);
          io.unobserve(el);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      $$('.reveal').forEach((el) => io.observe(el));

      // Boot do protótipo quando entra em cena
      const dev = $('#device');
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { boot(); io2.unobserve(dev); } });
      }, { threshold: 0.35 });
      io2.observe(dev);
    } else {
      $$('.reveal').forEach((el) => el.classList.add('in'));
      $$('[data-count]').forEach(animateCount);
      boot();
    }

    // Barra de progresso + navbar
    const prog = $('#scrollProgress');
    const nav = $('#siteNav');
    const ghost = $('#heroGhost');
    const vh = window.innerHeight;
    let ticking = false, lastY = 0;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const h = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
        nav.classList.toggle('scrolled', y > 40);
        // auto-oculta ao descer (libera o protótipo), reaparece ao subir
        nav.classList.toggle('nav-hidden', y > 320 && y > lastY);
        // parallax do wordmark gigante
        if (ghost && y < vh * 1.3) ghost.style.transform = 'translate(-50%, calc(-50% + ' + (y * 0.22) + 'px))';
        lastY = y;
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------- Acessibilidade ------------------------- */
  function a11y() {
    const labels = {
      '#btnGrid': 'Alternar grade de composição',
      '#shutter': 'Capturar foto',
      '#swapScene': 'Trocar cena',
      '#galleryThumb': 'Abrir galeria',
      '#suggestPill': 'Ver sugestões da IA',
    };
    Object.entries(labels).forEach(([sel, lbl]) => { const el = $(sel); if (el) el.setAttribute('aria-label', lbl); });
    $$('[data-go="settings"]').forEach((b) => b.setAttribute('aria-label', 'Abrir configurações'));
    $$('[data-go="camera"]').forEach((b) => { if (!b.textContent.trim()) b.setAttribute('aria-label', 'Voltar para a câmera'); });
    $$('[data-go="gallery"]').forEach((b) => { if (!b.textContent.trim()) b.setAttribute('aria-label', 'Voltar para a galeria'); });
    // botões só-ícone com <svg> decorativo
    $$('button svg, a svg').forEach((s) => s.setAttribute('aria-hidden', 'true'));
    $('#device') && $('#device').setAttribute('aria-label', 'Protótipo interativo do LensAI para JOVI V70');
  }

  /* ------------------------- Init ------------------------- */
  function init() {
    // tempo real de carregamento (DOM pronto), para o feedback de performance
    state.perfMs = Math.max(1, Math.round(performance.now()));
    if (!Array.isArray(state.gallery) || !state.gallery.length) {
      state.gallery = seedGallery();
      persistGallery();
    }
    wire();
    a11y();
    refreshThumb();

    // Modo captura (para gerar screenshots da apresentação) — inerte sem parâmetros
    const params = new URLSearchParams(location.search);
    const scr = params.get('screen');
    state.shot = params.has('shot') || params.has('kiosk') || !!scr;
    if (params.get('kiosk') === '1') document.body.classList.add('kiosk');
    if (state.shot) {
      $$('.reveal').forEach((el) => el.classList.add('in'));
      $$('[data-count]').forEach(animateCount);
      if (scr === 'suggest') { go('camera'); openSuggest(); }
      else if (scr === 'photo') { go('gallery'); if (state.gallery[0]) openPhoto(state.gallery[0].id); }
      else if (scr) { go(scr); }
      else { boot(); }
    } else {
      initScroll();
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
