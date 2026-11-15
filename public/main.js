(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const page = $('page');
  const probe = $('probe');
  const coralEl = $('coral');
  const traceEl = $('lorenz-trace');
  const headsEl = $('lorenz-heads');
  const captionEl = $('caption');
  const hintEl = $('hint');
  const switchBtn = $('switch');
  const modeBtns = document.querySelectorAll('[data-set-mode]');

  const media = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const darkMq = media('(prefers-color-scheme: dark)');
  const reduce = media('(prefers-reduced-motion: reduce)').matches;
  const touch = media('(pointer: coarse)').matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ---------- color mode: follows the system until one is picked

  const BG = { day: '#f6f7f5', night: '#0f1624' };
  let picked = null;

  function syncMode() {
    const mode = picked || (darkMq.matches ? 'night' : 'day');
    if (picked) root.dataset.mode = picked; else delete root.dataset.mode;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setMode === mode)));
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = picked ? BG[picked] : (m.media.includes('dark') ? BG.night : BG.day);
    });
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => { picked = b.dataset.setMode; syncMode(); }));
  if (darkMq.addEventListener) darkMq.addEventListener('change', syncMode);
  syncMode();

  // ---------- layout: the coral grid fills 92% x 88% of the page, centered

  let cw = 0, lh = 0, COLS = 0, ROWS = 0;

  function measure() {
    const R = page.getBoundingClientRect();
    const p = probe.getBoundingClientRect();
    if (!R.width || !p.width) return false;
    cw = p.width / 50; lh = p.height;
    const cols = Math.max(40, Math.floor(R.width * 0.92 / cw));
    const rows = Math.max(20, Math.floor(R.height * 0.88 / lh));
    coralEl.style.left = Math.round((R.width - cols * cw) / 2) + 'px';
    coralEl.style.top = Math.round((R.height - rows * lh) / 2) + 'px';
    if (Math.abs(cols - COLS) > 2 || Math.abs(rows - ROWS) > 1) { COLS = cols; ROWS = rows; return true; }
    return false;
  }

  // ---------- coral (Gray–Scott), simulated in a worker

  let worker = null;

  function coralStart() {
    if (!COLS) return;
    if (!worker) {
      worker = new Worker('/coral.worker.js');
      worker.onmessage = (e) => {
        if (scene !== 'rd') return;
        coralEl.textContent = e.data.art;
        captionEl.textContent = 'Gray–Scott reaction–diffusion, iteration ' + e.data.iter.toLocaleString('en-US');
      };
    }
    worker.postMessage({ type: 'init', cols: COLS, rows: ROWS, still: reduce });
    if (document.hidden) worker.postMessage({ type: 'pause' });
  }

  function seedAt(e) {
    if (!worker || !COLS) return;
    const r = coralEl.getBoundingClientRect();
    const q = Math.floor((e.clientX - r.left) / cw), w = Math.floor((e.clientY - r.top) / lh);
    if (q < 0 || w < 0 || q >= COLS || w >= ROWS) return;
    worker.postMessage({ type: 'seed', x: q, y: w });
  }

  // ---------- Lorenz attractor: two particles that start 0.00001 apart

  const LC = 200, LR = 64;            // fixed grid, never scaled
  const DT = 0.005, MAXPTS = 60000, TRAIL = 40;
  const LZ_TICKS = 4500;              // ~3 min of motion, then rest until clicked
  const DENSITY = ' .:-=+*#%@';
  const pts = new Float64Array(MAXPTS * 3);
  let npts = 0, head = 0;
  let la, lb, trA, trB, lt, theta = 0.5, lzTimer = 0, lzLeft = 0;

  function lzReset() {
    const x0 = (Math.random() - 0.5) * 10, y0 = (Math.random() - 0.5) * 10, z0 = 20 + Math.random() * 10;
    la = [x0, y0, z0]; lb = [x0 + 1e-5, y0, z0];
    npts = 0; head = 0; trA = []; trB = []; lt = 0;
  }

  function d(x, y, z) { return [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z]; }
  function rk4(p) {
    const k1 = d(p[0], p[1], p[2]);
    const k2 = d(p[0] + DT / 2 * k1[0], p[1] + DT / 2 * k1[1], p[2] + DT / 2 * k1[2]);
    const k3 = d(p[0] + DT / 2 * k2[0], p[1] + DT / 2 * k2[1], p[2] + DT / 2 * k2[2]);
    const k4 = d(p[0] + DT * k3[0], p[1] + DT * k3[1], p[2] + DT * k3[2]);
    return [
      p[0] + DT / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      p[1] + DT / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      p[2] + DT / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ];
  }

  function lzSteps(n) {
    for (let i = 0; i < n; i++) {
      la = rk4(la); lb = rk4(lb); lt += DT;
      pts[head * 3] = la[0]; pts[head * 3 + 1] = la[1]; pts[head * 3 + 2] = la[2];
      head = (head + 1) % MAXPTS; if (npts < MAXPTS) npts++;
    }
    trA.push(la); trB.push(lb);
    if (trA.length > TRAIL) { trA.shift(); trB.shift(); }
  }

  function lzRender() {
    const ct = Math.cos(theta), st = Math.sin(theta), sx = 200 / 62, sz = 64 / 55;
    const px = (x, y) => Math.round(LC / 2 + (x * ct - y * st) * sx);
    const py = (z) => Math.round(LR / 2 + (28.8 - z * sz));
    const G = new Float32Array(LC * LR);
    let mx = 0;
    for (let i = 0; i < npts; i++) {
      const c = px(pts[i * 3], pts[i * 3 + 1]), r = py(pts[i * 3 + 2]);
      if (c >= 0 && c < LC && r >= 0 && r < LR) { const k = r * LC + c; if (++G[k] > mx) mx = G[k]; }
    }
    const A = new Array(LC * LR), B = new Array(LC * LR).fill(' ');
    const lm = Math.log(1 + mx);
    for (let k = 0; k < A.length; k++) {
      const v = G[k];
      A[k] = v ? DENSITY[Math.min(9, Math.max(1, Math.round(Math.pow(Math.log(1 + v) / lm, 0.9) * 9)))] : ' ';
    }
    const put = (p, ch) => {
      const c = px(p[0], p[1]), r = py(p[2]);
      if (c >= 0 && c < LC && r >= 0 && r < LR) { B[r * LC + c] = ch; A[r * LC + c] = ' '; }
    };
    for (let i = 0; i < trA.length; i++) { put(trA[i], i > 30 ? '*' : '.'); put(trB[i], i > 30 ? 'x' : '.'); }
    put(la, '@'); put(lb, 'O');
    const rowsOf = (arr) => { const out = []; for (let r = 0; r < LR; r++) out.push(arr.slice(r * LC, r * LC + LC).join('')); return out.join('\n'); };
    traceEl.textContent = rowsOf(A);
    headsEl.textContent = rowsOf(B);
    const dist = Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
    captionEl.textContent = '@ and O started 0.00001 apart. Now ' + (dist < 0.01 ? dist.toExponential(1) : dist.toFixed(2)) + ' apart, t = ' + lt.toFixed(1);
  }

  function lzTick() {
    lzSteps(npts < 3000 ? 60 : 24);
    theta += 0.004;
    lzRender();
    if (--lzLeft <= 0) lzStop();
  }
  function lzRun() { if (!lzTimer && !reduce && !document.hidden && lzLeft > 0) lzTimer = setInterval(lzTick, 40); }
  function lzStop() { if (lzTimer) { clearInterval(lzTimer); lzTimer = 0; } }
  function lzRestart() {
    lzReset();
    if (reduce) { for (let i = 0; i < 300; i++) lzSteps(60); lzRender(); return; }
    lzLeft = LZ_TICKS;
    lzRender();
    lzRun();
  }

  // ---------- scenes: coral and Lorenz alternate between visits

  let scene = store.get('scene') === 'rd' ? 'lorenz' : 'rd';
  store.set('scene', scene);

  function showScene(s) {
    scene = s;
    captionEl.textContent = '';
    if (s === 'rd') {
      lzStop(); traceEl.textContent = ''; headsEl.textContent = '';
      hintEl.textContent = touch ? 'tap to seed coral' : 'click or drag to seed coral';
      switchBtn.textContent = 'show Lorenz';
      coralStart();
    } else {
      if (worker) worker.postMessage({ type: 'halt' });
      coralEl.textContent = '';
      hintEl.textContent = touch ? 'tap to restart the experiment' : 'click to restart the experiment';
      switchBtn.textContent = 'show coral';
      lzRestart();
    }
  }

  function toggleScene() {
    showScene(scene === 'rd' ? 'lorenz' : 'rd');
    store.set('scene', scene);
  }

  // ---------- input

  page.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.patch')) return;
    if (scene === 'rd') seedAt(e); else lzRestart();
  });
  page.addEventListener('pointermove', (e) => {
    if (scene === 'rd' && e.buttons === 1 && e.pointerType === 'mouse') seedAt(e);
  });
  switchBtn.addEventListener('click', toggleScene);
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'l' || e.key === 'L') toggleScene();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lzStop();
      if (worker) worker.postMessage({ type: 'pause' });
    } else {
      if (worker) worker.postMessage({ type: 'resume' });
      if (scene === 'lorenz') lzRun();
    }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (measure() && scene === 'rd') coralStart(); }, 200);
  });

  // ---------- boot: wait for Geist Mono so the grid is measured in the real font

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    measure();
    $('controls').hidden = false;
    showScene(scene);
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('11px "Geist Mono"').then(boot, boot);
    setTimeout(boot, 1500);
    // If the font arrives after the fallback boot, re-measure in the real metrics.
    document.fonts.ready.then(() => { if (booted && measure() && scene === 'rd') coralStart(); });
  } else {
    boot();
  }
})();
