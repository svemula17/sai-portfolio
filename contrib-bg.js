/* =========================================================
   Sai Kumar Vemula — Portfolio
   Hero background: GitHub-contributions grid with an
   animated cursor that "commits" cells. Theme-aware,
   pointer-reactive, respects prefers-reduced-motion.
   ========================================================= */

(() => {
  const canvas = document.getElementById("contribCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* grid geometry — GitHub graph proportions */
  const PITCH = 16;   // cell + gap
  const CELL = 12;
  const CORNER = 3;

  /* GitHub-style heatmap ramps, hot = site purple accent */
  const PALETTES = {
    dark: {
      /* purple ramp, matching --accent-2 (#a855f7); level 0 is the
         near-black resting cell, so quiet days stay quiet */
      levels: ["#15121c", "#2e1065", "#5b21b6", "#7c3aed", "#a855f7"],
      hot: "#a855f7",
      cursorFill: "#e6edf3",
      cursorLine: "rgba(10,12,16,.92)"
    },
    light: {
      /* same hue on ivory, ending at the deeper #7c3aed the light theme uses */
      levels: ["#f0efe9", "#e9e2f7", "#cdbaf0", "#a98ae0", "#7c3aed"],
      hot: "#7c3aed",
      cursorFill: "#141413",
      cursorLine: "rgba(250,249,245,.92)"
    }
  };
  /* weighted like a real contributions graph — mostly quiet days */
  const LEVEL_WEIGHTS = [0.82, 0.08, 0.05, 0.03, 0.02];

  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  };

  let pal, levelRgb, hotRgb;
  function loadPalette() {
    const theme = document.documentElement.getAttribute("data-ui") === "dark" ? "dark" : "light";
    pal = PALETTES[theme];
    levelRgb = pal.levels.map(hexToRgb);
    hotRgb = hexToRgb(pal.hot);
  }
  loadPalette();

  /* ----- grid state ----- */
  let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, offX = 0, offY = 0;
  let levels = [];                 // base intensity per cell (0–4)
  let energy = new Map();          // cell index -> transient highlight (0–1)
  const base = document.createElement("canvas");
  const baseCtx = base.getContext("2d");

  function randLevel() {
    let r = Math.random();
    for (let i = 0; i < LEVEL_WEIGHTS.length; i++) {
      if ((r -= LEVEL_WEIGHTS[i]) < 0) return i;
    }
    return 0;
  }

  function roundCell(c, x, y, size, r) {
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, size, size, r); }
    else {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + size, y, x + size, y + size, r);
      c.arcTo(x + size, y + size, x, y + size, r);
      c.arcTo(x, y + size, x, y, r);
      c.arcTo(x, y, x + size, y, r);
      c.closePath();
    }
  }

  function paintBase() {
    base.width = canvas.width;
    base.height = canvas.height;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx.clearRect(0, 0, w, h);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        baseCtx.fillStyle = pal.levels[levels[row * cols + col]];
        roundCell(baseCtx, offX + col * PITCH, offY + row * PITCH, CELL, CORNER);
        baseCtx.fill();
      }
    }
  }

  function resize() {
    /* fixed to the viewport now, not to the hero box */
    w = Math.max(1, Math.round(window.innerWidth));
    h = Math.max(1, Math.round(window.innerHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / PITCH);
    rows = Math.ceil(h / PITCH);
    offX = (w - cols * PITCH + (PITCH - CELL)) / 2;
    offY = (h - rows * PITCH + (PITCH - CELL)) / 2;
    levels = new Array(cols * rows);
    for (let i = 0; i < levels.length; i++) levels[i] = randLevel();
    energy.clear();
    paintBase();
    if (motionQuery.matches) drawStatic();
  }

  function cellCenter(col, row) {
    return [offX + col * PITCH + CELL / 2, offY + row * PITCH + CELL / 2];
  }

  function exciteCell(col, row, amount) {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    const idx = row * cols + col;
    const cur = energy.get(idx) || 0;
    if (amount > cur) energy.set(idx, Math.min(amount, 1));
  }

  /* ----- ripples on "commit" clicks ----- */
  let ripples = [];
  function addRipple(x, y) {
    ripples.push({ x, y, t: 0 });
  }

  /* ----- automated cursor ----- */
  const cursor = {
    x: Math.random() * 400,
    y: Math.random() * 300,
    tx: 0, ty: 0,
    queue: [],          // upcoming cells to visit
    waitUntil: 0,
    pressT: -1,         // >=0 while press animation runs
    alpha: 0
  };

  /* keep auto-cursor away from the headline area */
  function inCenterZone(col, row) {
    const [x, y] = cellCenter(col, row);
    const nx = (x - w * 0.5) / (w * 0.30);
    const ny = (y - h * 0.44) / (h * 0.30);
    return nx * nx + ny * ny < 1;
  }

  function pickTargets() {
    let col = 0, row = 0;
    for (let tries = 0; tries < 24; tries++) {
      col = Math.floor(Math.random() * cols);
      row = Math.floor(Math.random() * rows);
      if (!inCenterZone(col, row)) break;
    }
    cursor.queue.push([col, row]);
    /* sometimes draw a streak of commits, like painting the graph */
    if (Math.random() < 0.4) {
      const horizontal = Math.random() < 0.5;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const len = 3 + Math.floor(Math.random() * 5);
      for (let i = 1; i < len; i++) {
        const c = horizontal ? col + i * dir : col;
        const r = horizontal ? row : row + i * dir;
        if (c < 0 || r < 0 || c >= cols || r >= rows || inCenterZone(c, r)) break;
        cursor.queue.push([c, r]);
      }
    }
  }

  function commitAt(col, row) {
    exciteCell(col, row, 1);
    exciteCell(col - 1, row, 0.35);
    exciteCell(col + 1, row, 0.35);
    exciteCell(col, row - 1, 0.35);
    exciteCell(col, row + 1, 0.35);
    const [x, y] = cellCenter(col, row);
    addRipple(x, y);
  }

  function drawCursor(x, y, press, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (press > 0) {
      const s = 1 - 0.12 * Math.sin(press * Math.PI);
      ctx.scale(s, s);
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(4.2, 13.4);
    ctx.lineTo(7, 19.5);
    ctx.lineTo(9.7, 18.2);
    ctx.lineTo(6.9, 12.3);
    ctx.lineTo(12.4, 12.3);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = pal.cursorFill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = pal.cursorLine;
    ctx.stroke();
    ctx.restore();
  }

  /* ----- real pointer takes over ----- */
  let pointerX = -1, pointerY = -1, pointerAt = -Infinity;
  /* the canvas is viewport-fixed, so client coords are already canvas coords */
  window.addEventListener("pointermove", (e) => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    pointerAt = performance.now();
  }, { passive: true });

  function excitePointer() {
    const RADIUS = 30;
    const minCol = Math.floor((pointerX - RADIUS - offX) / PITCH);
    const maxCol = Math.ceil((pointerX + RADIUS - offX) / PITCH);
    const minRow = Math.floor((pointerY - RADIUS - offY) / PITCH);
    const maxRow = Math.ceil((pointerY + RADIUS - offY) / PITCH);
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const [x, y] = cellCenter(col, row);
        const d = Math.hypot(x - pointerX, y - pointerY);
        if (d < RADIUS) exciteCell(col, row, 1 - d / RADIUS);
      }
    }
  }

  /* ----- frame loop ----- */
  let last = performance.now();
  let twinkleAcc = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    /* ambient activity so the graph feels alive */
    twinkleAcc += dt;
    if (twinkleAcc > 0.28) {
      twinkleAcc = 0;
      exciteCell(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), 0.3 + Math.random() * 0.3);
    }

    const pointerActive = now - pointerAt < 3500;
    if (pointerActive) excitePointer();

    /* auto cursor: fade out while the real pointer is around */
    const targetAlpha = pointerActive ? 0 : 1;
    cursor.alpha += (targetAlpha - cursor.alpha) * Math.min(1, dt * 5);

    if (!pointerActive || cursor.alpha > 0.02) {
      if (cursor.pressT >= 0) {
        cursor.pressT += dt / 0.16;
        if (cursor.pressT >= 1) cursor.pressT = -1;
      } else if (now >= cursor.waitUntil) {
        if (!cursor.queue.length) pickTargets();
        const [col, row] = cursor.queue[0];
        const [tx, ty] = cellCenter(col, row);
        cursor.x += (tx - cursor.x) * Math.min(1, dt * 3.6);
        cursor.y += (ty - cursor.y) * Math.min(1, dt * 3.6);
        if (Math.hypot(tx - cursor.x, ty - cursor.y) < 2.5) {
          cursor.queue.shift();
          commitAt(col, row);
          cursor.pressT = 0;
          cursor.waitUntil = now + (cursor.queue.length ? 60 : 400 + Math.random() * 1200);
        }
      }
    }

    /* draw */
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, 0, 0, w, h);

    const decay = Math.exp(-dt * 1.5);
    for (const [idx, e] of energy) {
      const next = e * decay;
      if (next < 0.02) { energy.delete(idx); continue; }
      energy.set(idx, next);
      const col = idx % cols;
      const row = (idx - col) / cols;
      const grow = 1 + 0.18 * next;
      const size = CELL * grow;
      const off = (size - CELL) / 2;
      ctx.fillStyle = mix(levelRgb[levels[idx]], hotRgb, Math.min(1, next * 0.95));
      roundCell(ctx, offX + col * PITCH - off, offY + row * PITCH - off, size, CORNER * grow);
      ctx.fill();
    }

    ripples = ripples.filter(rp => (rp.t += dt / 0.5) < 1);
    for (const rp of ripples) {
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 5 + rp.t * 18, 0, Math.PI * 2);
      ctx.strokeStyle = pal.hot;
      ctx.globalAlpha = 0.45 * (1 - rp.t);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (cursor.alpha > 0.02) {
      drawCursor(cursor.x, cursor.y, cursor.pressT >= 0 ? cursor.pressT : 0, cursor.alpha);
    }

    rafId = requestAnimationFrame(frame);
  }

  /* reduced motion: a calm static graph, no cursor */
  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, 0, 0, w, h);
  }

  let rafId = 0;
  function start() {
    cancelAnimationFrame(rafId);
    if (motionQuery.matches) { drawStatic(); return; }
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  /* theme switches repaint the base layer */
  new MutationObserver(() => {
    loadPalette();
    paintBase();
    if (motionQuery.matches) drawStatic();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-ui"] });

  motionQuery.addEventListener?.("change", start);

  /* ----- scroll fade -----
     Full strength over the hero, easing down to a whisper for the rest of
     the page so the grid reads as texture behind content, never competition. */
  const HERO_ALPHA = 0.55;
  const PAGE_ALPHA = 0.10;
  let fadeQueued = false;

  function applyFade() {
    fadeQueued = false;
    const span = Math.max(1, window.innerHeight * 0.85);
    const t = Math.min(1, Math.max(0, window.scrollY / span));
    const eased = t * t * (3 - 2 * t); // smoothstep
    canvas.style.opacity = (HERO_ALPHA + (PAGE_ALPHA - HERO_ALPHA) * eased).toFixed(3);
  }
  function queueFade() {
    if (fadeQueued) return;
    fadeQueued = true;
    requestAnimationFrame(applyFade);
  }
  window.addEventListener("scroll", queueFade, { passive: true });

  /* a full-page animation shouldn't keep burning frames in a background tab */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else start();
  });

  window.addEventListener("resize", () => { resize(); applyFade(); });

  resize();
  applyFade();
  start();
})();
