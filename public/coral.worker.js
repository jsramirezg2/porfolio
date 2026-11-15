// Gray–Scott reaction–diffusion, rendered as ASCII off the main thread.
// Two chemicals U and V on a periodic grid; V feeds on U (U + 2V -> 3V),
// U is replenished at rate F and V is removed at rate F + k.
'use strict';

const F = 0.037, K = 0.06, DU = 0.21, DV = 0.105;
const RAMP = ' .:-=+*#%';
const GROW = 2600;          // iterations of fast growth before slowing down
const TICK = 50;            // ms between frames
const IDLE_TICKS = 3600;    // keep evolving ~3 min after growth, then rest
const POKE_TICKS = 600;     // a new seed wakes it for at least ~30 s

let cols = 0, rows = 0, W = 0, H = 0;
let U, V, U2, V2;
let iter = 0, per = 4, budget = 0;
let timer = 0, active = false, paused = false, still = false;

function init(c, r) {
  cols = c; rows = r; W = c; H = r * 2;
  U = new Float32Array(W * H).fill(1);
  V = new Float32Array(W * H);
  U2 = new Float32Array(W * H);
  V2 = new Float32Array(W * H);
  let seed = Math.floor(Math.random() * 1e6) + 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n = Math.max(12, Math.round(22 * (W * H) / (200 * 128)));
  for (let s = 0; s < n; s++) drop(Math.floor(W * (0.03 + rnd() * 0.94)), Math.floor(H * (0.06 + rnd() * 0.88)), 3);
  iter = 0;
  per = Math.max(4, Math.min(26, Math.round(1.6e6 / (W * H))));
}

function drop(x, y, rad) {
  for (let a = -rad; a <= rad; a++) {
    for (let b = -rad; b <= rad; b++) {
      if (a * a + b * b > rad * rad + 1) continue;
      const i = ((y + a + H) % H) * W + ((x + b + W) % W);
      V[i] = 0.5; U[i] = 0.5;
    }
  }
}

function steps(n) {
  for (let it = 0; it < n; it++) {
    for (let y = 0; y < H; y++) {
      const ym = ((y + H - 1) % H) * W, yp = ((y + 1) % H) * W, yr = y * W;
      for (let x = 0; x < W; x++) {
        const i = yr + x;
        const l = yr + (x + W - 1) % W, r = yr + (x + 1) % W, up = ym + x, dn = yp + x;
        const u = U[i], v = V[i], uvv = u * v * v;
        U2[i] = u + DU * (U[l] + U[r] + U[up] + U[dn] - 4 * u) - uvv + F * (1 - u);
        V2[i] = v + DV * (V[l] + V[r] + V[up] + V[dn] - 4 * v) + uvv - (F + K) * v;
      }
    }
    let t = U; U = U2; U2 = t;
    t = V; V = V2; V2 = t;
    iter++;
  }
}

// Two simulation rows per text row, since a character is about twice as tall as it is wide.
function art() {
  const lines = new Array(rows);
  const line = new Array(cols);
  for (let r = 0; r < rows; r++) {
    const a = 2 * r * W, b = a + W;
    for (let q = 0; q < cols; q++) {
      const v = (V[a + q] + V[b + q]) / 2;
      const g = v < 0.08 ? 0 : Math.min(1, (v - 0.08) / 0.3);
      line[q] = g <= 0 ? ' ' : RAMP[Math.min(8, Math.max(1, Math.round(g * 8)))];
    }
    lines[r] = line.join('');
  }
  return lines.join('\n');
}

function post() { postMessage({ art: art(), iter }); }

function tick() {
  if (iter < GROW) steps(per);
  else if (budget > 0) { steps(2); budget--; }
  else { stop(); return; }
  post();
}

function start() { if (!timer && active && !paused && !still) timer = setInterval(tick, TICK); }
function stop() { if (timer) { clearInterval(timer); timer = 0; } }

onmessage = (e) => {
  const m = e.data;
  switch (m.type) {
    case 'init':
      stop();
      init(m.cols, m.rows);
      active = true; still = !!m.still; budget = IDLE_TICKS;
      if (still) steps(GROW);
      post();
      start();
      break;
    case 'seed':
      if (!active) return;
      drop(m.x, m.y * 2, 2);
      if (still) { steps(300); post(); return; }
      budget = Math.max(budget, POKE_TICKS);
      post();
      start();
      break;
    case 'halt':
      active = false; stop();
      break;
    case 'pause':
      paused = true; stop();
      break;
    case 'resume':
      paused = false; start();
      break;
  }
};
