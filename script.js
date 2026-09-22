(() => {
  "use strict";

  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");
  const btn = document.getElementById("bloomBtn");
  const scene = document.querySelector(".scene");

  const GOLD = "#ffe14d";
  const GOLD_DEEP = "#ffb300";
  const GREEN = "#c8ff93";

  /* ---------------------------------------------------------------
     Frases dedicatorias (máquina de escribir, en bucle)
  --------------------------------------------------------------- */
  const dedic = document.getElementById("dedic");
  const phrases = [
    "para alguien muy especial ",
    "las flores también piensan en ti ",
    "eres luz en la oscuridad ",
    "tus sonrisas hacen crecer jardines ",
    "que estas flores te acompañen siempre ",
    "gracias por existir ",
    "te mereces flores todos los días ",
    "siempre es buen momento para flores ",
    "guarda en esta flor tus mejores momentos ",
    "brillas incluso en el silencio ",
    "cada pétalo es un deseo para ti ",
    "eres una gran persona ",
    "nunca desaparezcas de mi vida ",
    "tus esfuerzos darán frutos ",
    "no te rindas ",
  ];
  let dedicTimer = null;

  function typeLoop() {
    let pi = -1;
    let ci = 0;
    let deleting = false;

    function nextPhrase() {
      let n;
      do {
        n = Math.floor(Math.random() * phrases.length);
      } while (n === pi && phrases.length > 1);
      pi = n;
      ci = 0;
      deleting = false;
    }

    nextPhrase();

    function step() {
      const word = phrases[pi];
      if (!deleting) {
        ci += Math.max(1, Math.round(Math.random() * 2));
        if (ci >= word.length) {
          ci = word.length;
          defer(() => {
            deleting = true;
            step();
          }, 2400);
          return;
        }
        dedic.textContent = word.slice(0, ci);
        defer(step, 55 + Math.random() * 65);
      } else {
        ci -= 2;
        if (ci <= 0) {
          ci = 0;
          nextPhrase();
          defer(step, 450);
          return;
        }
        dedic.textContent = word.slice(0, ci);
        defer(step, 24);
      }
    }

    function defer(fn, ms) {
      dedicTimer = setTimeout(fn, ms);
    }

    step();
  }

  /* ---------------------------------------------------------------
     Utilidades de dibujo (líneas reveladas, estilo collage)
  --------------------------------------------------------------- */
  const lenCache = new WeakMap();

  function pathLen(pts) {
    let L = lenCache.get(pts);
    if (L !== undefined) return L;
    L = 0;
    for (let i = 1; i < pts.length; i++) {
      L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    lenCache.set(pts, L);
    return L;
  }

  function strokePart(ctx, pts, need) {
    ctx.beginPath();
    let acc = 0;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + seg < need) {
        ctx.lineTo(b[0], b[1]);
        acc += seg;
      } else {
        const fr = Math.max(0, Math.min(1, (need - acc) / seg));
        ctx.lineTo(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr);
        break;
      }
    }
    ctx.stroke();
  }

  function revealPath(ctx, pts, t, color, lineW, blur, dashShift) {
    if (t <= 0) return;
    const need = pathLen(pts) * Math.min(1, t);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (dashShift !== undefined) {
      const b = 4 + lineW * 3;
      ctx.setLineDash([b * 1.3, b * 0.7, b * 2.1, b * 0.5, b * 1.0, b * 1.7]);
      ctx.lineDashOffset = -dashShift;
    }
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW * 3;
    ctx.globalAlpha = 0.18;
    ctx.shadowBlur = blur * 1.5;
    strokePart(ctx, pts, need);
    ctx.shadowBlur = blur * 0.55;
    ctx.lineWidth = lineW;
    ctx.globalAlpha = 0.95;
    strokePart(ctx, pts, need);
    ctx.restore();
  }

  function revealLine(ctx, a, b, t, color, lineW, blur) {
    if (t <= 0) return;
    const total = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (total === 0) return;
    const need = total * Math.min(1, t);
    const fr = need / total;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.lineWidth = lineW;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr);
    ctx.stroke();
    ctx.restore();
  }

  function fillPath(ctx, pts, gradientFn, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = gradientFn(ctx);
    ctx.shadowColor = "rgba(255,190,60,0.7)";
    ctx.shadowBlur = 16 * alpha;
    ctx.fill();
    ctx.restore();
  }

  function polar(cx, cy, r, a) {
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }

  function petalPoints(cx, cy, r0, R, ang, w) {
    const N = 16;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = r0 + (R - r0) * t;
      const hw = w * Math.pow(Math.sin(Math.PI * t), 0.82);
      pts.push(polar(cx, cy, r, ang - hw / r));
    }
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const r = r0 + (R - r0) * t;
      const hw = w * Math.pow(Math.sin(Math.PI * t), 0.82);
      pts.push(polar(cx, cy, r, ang + hw / r));
    }
    pts.push(pts[0].slice());
    return pts;
  }

  function circlePoints(cx, cy, r, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(polar(cx, cy, r, (i / n) * Math.PI * 2));
    return pts;
  }

  /* ---------------------------------------------------------------
     Geometría de la flor (local al centro, vista superior, collage)
  --------------------------------------------------------------- */
  const state = {
    cx: 0,
    cy: 0,
    R: 0,
    discR: 0,
    petals: [],
    leaves: [],
    seeds: [],
    guide: [],
    discOutline: [],
    rings: [],
    spokes: [],
    seedOffset: Math.random() * Math.PI * 2,
  };

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0;
  let H = 0;

  function buildGeometry() {
    state.cx = W / 2;
    state.cy = H / 2 + 8;
    state.R = Math.max(80, Math.min(W, H) * 0.32);
    state.discR = state.R * 0.42;

    const R = state.R;
    const discR = state.discR;

    state.discOutline = circlePoints(0, 0, discR, 72);
    state.rings = [circlePoints(0, 0, discR * 0.56, 48), circlePoints(0, 0, discR * 0.28, 36)];
    state.spokes = [];
    const SN = 10;
    for (let i = 0; i < SN; i++) {
      const a = (i / SN) * Math.PI * 2 + state.seedOffset * 0.3;
      state.spokes.push([
        [0, 0],
        polar(0, 0, discR * 0.92, a),
      ]);
    }

    /* pétalos amarillos simétricos: 3 aros (grandes, medianos, pequeños) */
    state.petals = [];
    const rings = [
      { n: 14, lenR: 0.62, wF: 0.085, phase: 0 },
      { n: 14, lenR: 0.84, wF: 0.1, phase: Math.PI / 14 },
      { n: 14, lenR: 1.06, wF: 0.12, phase: Math.PI / 28 },
    ];
    let delay = 0;
    rings.forEach((ring, ri) => {
      const baseAng = state.seedOffset + ring.phase;
      const len = R * ring.lenR;
      const w = R * ring.wF;
      for (let i = 0; i < ring.n; i++) {
        const ang = baseAng + (i / ring.n) * Math.PI * 2;
        const pts = petalPoints(0, 0, discR * 0.93, len, ang, w);

        const veins = [];
        const rA = discR + (len - discR) * 0.18;
        const rB = discR + (len - discR) * 0.52;
        const rC = discR + (len - discR) * 0.68;
        const rD = discR + (len - discR) * 0.98;
        veins.push([polar(0, 0, rA, ang), polar(0, 0, rB, ang)]);
        veins.push([polar(0, 0, rC, ang), polar(0, 0, rD, ang)]);

        const hwMid = w * Math.pow(Math.sin(Math.PI * 0.5), 0.82);
        const rMid = discR + (len - discR) * 0.5;
        const tick = [
          polar(0, 0, rMid, ang - (hwMid * 0.55) / rMid),
          polar(0, 0, rMid, ang + (hwMid * 0.55) / rMid),
        ];

        state.petals.push({
          pts,
          ang,
          tip: polar(0, 0, len * 0.96, ang),
          base: polar(0, 0, discR + 2, ang),
          veins,
          tick,
          fill: true,
          dashShift: (i / ring.n) * 60 + ri * 20,
          delay,
          wob: 0.03 + ri * 0.01,
          phase: ang * 0.5,
        });
        delay++;
      }
    });

    /* hojas verdes discretas: atrás, pequeñas, casi ocultas */
    state.leaves = [];
    const leafAngles = [0.45, 1.15, 1.9, 2.65, 3.35, 4.05, 4.75, 5.5];
    for (let i = 0; i < leafAngles.length; i++) {
      const ang = leafAngles[i] + state.seedOffset * 0.5;
      const lenj = R * (0.28 + (i % 3) * 0.06);
      const baseR = R * 0.55;
      const wl = R * 0.13 * (1 + (i % 2) * 0.1);
      state.leaves.push({
        pts: petalPoints(0, 0, baseR, baseR + lenj, ang, wl),
        tip: polar(0, 0, baseR + lenj * 0.95, ang),
        base: polar(0, 0, baseR, ang),
        wob: 0.02 + (i % 3) * 0.008,
        phase: i * 2.3,
      });
    }

    /* semillas en espiral: muchas y pequeñas */
    state.seeds = [];
    const NS = 175;
    const golden = 2.399963;
    for (let k = 1; k <= NS; k++) {
      const a = k * golden + state.seedOffset;
      const r = discR * 0.92 * Math.sqrt(k / NS);
      state.seeds.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        ang: a,
        s: discR * 0.055 * (0.6 + (k / NS) * 0.55),
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildGeometry();
    makeStars();
    comets.length = 0;
  }
  window.addEventListener("resize", resize);

  /* ---------------------------------------------------------------
     Campo de estrellas
  --------------------------------------------------------------- */
  let stars = [];
  function makeStars() {
    stars = [];
    const n = Math.round((W * H) / 11500);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1,
        blue: Math.random() < 0.25,
      });
    }
  }

  function drawStars(now) {
    ctx.save();
    for (const s of stars) {
      const a = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.002 * s.speed + s.phase));
      const col = s.blue ? "185, 200, 255" : "255, 240, 215";
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(${col},1)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     Cometas blancos veloces
  --------------------------------------------------------------- */
  const comets = [];

  function spawnComet() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -80 : W + 80;
    const y = Math.random() * H * 0.9;
    const spread = 0.5 + Math.random() * 0.45;
    const base = fromLeft ? 0.35 : Math.PI - 0.35;
    const ang = base + (Math.random() - 0.5) * spread;
    const speed = 11 + Math.random() * 12;
    comets.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      len: 140 + Math.random() * 220,
      life: 1 + Math.random() * 0.5,
      w: 1.4 + Math.random() * 1,
    });
  }

  function drawComets(dt) {
    if (comets.length < 5 && Math.random() < dt / 850) spawnComet();

    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      const k = dt / 16.67;
      c.x += c.vx * k;
      c.y += c.vy * k;
      c.life -= dt * 0.0012;
      if (c.life <= 0 || c.x < -280 || c.x > W + 280) {
        comets.splice(i, 1);
        continue;
      }
      const mag = Math.hypot(c.vx, c.vy) || 1;
      const tx = (c.vx / mag) * c.len;
      const ty = (c.vy / mag) * c.len;
      const a = Math.max(0, Math.min(1, c.life));
      const g = ctx.createLinearGradient(c.x, c.y, c.x - tx, c.y - ty);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
      g.addColorStop(0.45, `rgba(235,240,255,${0.35 * a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = g;
      ctx.lineWidth = c.w;
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - tx, c.y - ty);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------
     Efectos menores: chispas + anillo
  --------------------------------------------------------------- */
  const sparks = [];
  const rings = [];

  function spawnSpark(x, y) {
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9 - 0.4,
      life: 1,
      r: 1 + Math.random() * 1.8,
    });
  }

  function spawnRing(x, y, max) {
    rings.push({ x, y, r: 8, max, life: 1 });
  }

  function drawEffects(now, dt) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const rg = rings[i];
      rg.r += (rg.max - rg.r) * 0.22;
      rg.life -= dt * 0.002;
      if (rg.life <= 0) {
        rings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, rg.life);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(255, 217, 61, 0.9)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.03;
      s.life -= dt * 0.0018;
      if (s.life <= 0 || s.y > H + 10) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.shadowColor = "rgba(255, 226, 120, 0.9)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ffe98a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const mouse = { x: -999, y: -999, over: false };
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  btn.addEventListener("pointerenter", () => (mouse.over = true));
  btn.addEventListener("pointerleave", () => (mouse.over = false));

  /* ---------------------------------------------------------------
     Animación: la flor se dibuja en collage y respira / se mece
  --------------------------------------------------------------- */
  const T = {
    petalStart: 0.15,
    petalDur: 0.5,
    petalGap: 0.04,
    discStart: 2.5,
    discDur: 0.4,
    spokesStart: 2.8,
    spokesDur: 0.5,
    ringsStart: 3.1,
    ringsDur: 0.3,
    fillStart: 2.9,
    fillDur: 0.9,
    seedStart: 3.45,
    seedStep: 0.01,
    leavesStart: 5.4,
    leavesDur: 0.7,
  };

  let bloomStart = -1;

  function drawLeafPts(pts, t, fillA) {
    revealPath(ctx, pts, t, GREEN, 1.6, 12, undefined);
    fillPath(ctx, pts, (c) => {
      const g = c.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      g.addColorStop(0, `rgba(70,185,115,${fillA})`);
      g.addColorStop(1, `rgba(16,85,52,${fillA})`);
      return g;
    }, 0.4 * fillA);
  }

  function flowerFrame(now) {
    const t = (now - bloomStart) / 1000;
    const { cx, cy, R, discR } = state;

    /* halo cálido muy sutil */
    const halo = Math.min(1, t / 1.6) * (0.06 + 0.03 * Math.sin(now * 0.0015));
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2);
    hg.addColorStop(0, `rgba(255,190,60,${halo})`);
    hg.addColorStop(1, "rgba(255,190,60,0)");
    ctx.save();
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* movimiento global: respiración + balanceo */
    const s = 1 + 0.022 * Math.sin(t * 0.8);
    const sway = 0.035 * Math.sin(t * 0.55);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.rotate(sway);

    /* hojas verdes: detrás de la flor, brotan al final */
    state.leaves.forEach((leaf, i) => {
      const st = T.leavesStart + i * 0.09;
      const local = (t - st) / T.leavesDur;
      if (local <= 0) return;
      const pr = Math.min(1, local / 0.9);
      const fa = Math.min(1, Math.max(0, (local - 0.8) / 0.2));
      ctx.save();
      ctx.rotate(leaf.wob * Math.sin(t * 0.8 + leaf.phase));
      drawLeafPts(leaf.pts, pr, fa);
      ctx.restore();
    });

    /* 1) pétalos amarillos con ondas propias */
    state.petals.forEach((p) => {
      const st = T.petalStart + p.delay * T.petalGap;
      const local = (t - st) / T.petalDur;
      if (local <= 0) return;
      const pr = Math.min(1, local / 0.85);
      const shimmer = 0.9 + 0.1 * Math.sin(t * 1.3 + p.phase);

      ctx.save();
      ctx.rotate(p.wob * Math.sin(t * 0.9 + p.phase));
      revealPath(ctx, p.pts, pr, GOLD, 2, 20 * shimmer, p.dashShift);

      if (local > 0.55) {
        const vl = Math.min(1, (local - 0.55) / 0.4);
        p.veins.forEach((v, vi) =>
          revealLine(ctx, v[0], v[1], vl * 2 - vi * 0.7, GOLD_DEEP, 1.2, 10)
        );
      }
      if (local > 0.7) {
        const tl = Math.min(1, (local - 0.7) / 0.3);
        revealLine(ctx, p.tick[0], p.tick[1], tl, GOLD, 1.4, 12);
      }
      if (p.fill && local > 0.8) {
        const fa = Math.min(1, (local - 0.8) / 0.2);
        fillPath(ctx, p.pts, (c) => {
          const g = c.createLinearGradient(p.tip[0], p.tip[1], p.base[0], p.base[1]);
          g.addColorStop(0, `rgba(255,216,76,${fa})`);
          g.addColorStop(0.6, `rgba(255,172,42,${fa})`);
          g.addColorStop(1, `rgba(228,112,22,${fa})`);
          return g;
        }, 0.5 * fa);
      }
      ctx.restore();
    });

    /* 2) centro del girasol */
    {
      const local = (t - T.discStart) / T.discDur;
      if (local > 0) revealPath(ctx, state.discOutline, local, GOLD, 2, 18, 26);
    }

    state.spokes.forEach((sp, i) => {
      const st = T.spokesStart + (i / state.spokes.length) * T.spokesDur * 0.8;
      const local = (t - st) / T.spokesDur;
      if (local <= 0) return;
      revealLine(ctx, sp[0], sp[1], local, GOLD_DEEP, 1.1, 8);
    });

    state.rings.forEach((rp, i) => {
      const st = T.ringsStart + i * 0.18;
      const local = (t - st) / T.ringsDur;
      if (local > 0) revealPath(ctx, rp, local, GOLD_DEEP, 1.2, 12, 12 + i * 10);
    });

    {
      const local = (t - T.fillStart) / T.fillDur;
      if (local > 0) {
        const a = Math.min(1, local);
        fillPath(ctx, state.discOutline, (c) => {
          const g = c.createRadialGradient(0, 0, 0, 0, 0, discR);
          g.addColorStop(0, `rgba(70,34,12,${0.5 * a})`);
          g.addColorStop(0.6, `rgba(48,22,8,${0.5 * a})`);
          g.addColorStop(1, `rgba(20,9,3,${0.5 * a})`);
          return g;
        }, 0.85 * a);
      }
    }

    /* 3) semillas del girasol: muchas, pequeñas */
    state.seeds.forEach((sd, i) => {
      const st = T.seedStart + i * T.seedStep;
      const local = (t - st) / 0.07;
      if (local <= 0) return;
      const s2 = Math.min(1, local);
      const ring = i % 4 !== 0;
      ctx.save();
      ctx.translate(sd.x, sd.y);
      ctx.rotate(sd.ang + 0.02 * Math.sin(t * 1.1 + i * 0.3));
      ctx.scale(s2, Math.min(1, s2 * 1.4));
      if (ring) {
        ctx.shadowColor = "rgba(255,205,70,0.7)";
        ctx.shadowBlur = 5;
        ctx.strokeStyle = "rgba(255,205,70,0.85)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, sd.s, sd.s * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(214,170,110,0.5)";
        ctx.beginPath();
        ctx.ellipse(-sd.s * 0.18, -sd.s * 0.12, sd.s * 0.3, sd.s * 0.18, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = "rgba(220,180,110,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "rgba(40,18,6,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, sd.s, sd.s * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    /* 4) (las hojas ya se dibujan al fondo, antes que los pétalos) */

    ctx.restore();
  }

  /* ---------------------------------------------------------------
     Clic en el botón
  --------------------------------------------------------------- */
  btn.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    if (bloomStart < 0) {
      bloomStart = performance.now();
      scene.classList.add("faded");
      btn.disabled = true;
      btn.classList.add("clicked");
      for (let i = 0; i < 18; i++) spawnSpark(cx, cy);
      spawnRing(cx, cy, Math.min(W, H) * 0.4);
      setTimeout(() => (btn.style.opacity = 0), 120);
      if (!dedicTimer) setTimeout(typeLoop, 900);
    } else {
      spawnRing(cx, cy, 60);
      for (let i = 0; i < 8; i++) spawnSpark(cx, cy);
    }
  });

  /* ---------------------------------------------------------------
     Bucle principal
  --------------------------------------------------------------- */
  let last = performance.now();

  resize();
  spawnComet();
  spawnComet();
  spawnComet();

  function frame(now) {
    const dt = Math.min(48, now - last);
    last = now;

    ctx.clearRect(0, 0, W, H);
    drawStars(now);
    drawComets(dt);

    if (bloomStart >= 0) flowerFrame(now);

    drawEffects(now, dt);

    if (mouse.over && bloomStart < 0 && Math.random() < 0.3) {
      spawnSpark(mouse.x + (Math.random() - 0.5) * 90, mouse.y + (Math.random() - 0.5) * 30);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();