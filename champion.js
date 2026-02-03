// champion.js (UPDATED)

const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
};

function safeJSONParse(v, fallback = null) {
  try { return JSON.parse(v); } catch { return fallback; }
}
function getProfile() {
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

function forcePlayAll(selector) {
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(() => {}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}
forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");

// ===== Top profile pill =====
function renderTopProfile() {
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = getProfile();
  if (!p) {
    if (img) img.src = "";
    if (nameEl) nameEl.textContent = "No profile";
    if (hintEl) hintEl.textContent = "Go Home";
    pill.addEventListener("click", () => (location.href = "index.html"));
    return;
  }

  if (img) img.src = p.avatar || "";
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit on Home";
  pill.addEventListener("click", () => (location.href = "index.html"));
}
renderTopProfile();

// ===== DOM =====
const sumName = document.getElementById("sumName");
const sumDone = document.getElementById("sumDone");
const sumTotal = document.getElementById("sumTotal");
const sumCorrect = document.getElementById("sumCorrect");
const sumAcc = document.getElementById("sumAcc");

const genBtn = document.getElementById("genChampBtn");
const cardZone = document.getElementById("cardZone");
const cardCanvas = document.getElementById("cardCanvas");
const dlBtn = document.getElementById("dlBtn");

function isDone(k) { return localStorage.getItem(k) === "1"; }
function loadResult(key) { return safeJSONParse(localStorage.getItem(key), null); }

function getTierByCorrect(correct) {
  if (correct >= 25) return "gold";
  if (correct >= 15) return "silver";
  return "bronze";
}

const TIER_THEME = {
  gold:   { label: "Gold",   base: "#d2a24d", dark: "#b37f2f" },
  silver: { label: "Silver", base: "#bdbdbd", dark: "#9a9a9a" },
  bronze: { label: "Bronze", base: "#9b561e", dark: "#7a3f13" },
};

// ===== Summary =====
function computeSummary() {
  const p = getProfile();
  if (sumName) sumName.textContent = p?.name || "Player";

  const doneFlags = [
    isDone(MB_KEYS.doneSong),
    isDone(MB_KEYS.doneMovie),
    isDone(MB_KEYS.doneMagic),
  ];
  const doneCount = doneFlags.filter(Boolean).length;
  if (sumDone) sumDone.textContent = `${doneCount} / 3`;

  const r1 = loadResult(MB_KEYS.resSong);
  const r2 = loadResult(MB_KEYS.resMovie);
  const r3 = loadResult(MB_KEYS.resMagic);

  const results = [r1, r2, r3].filter(Boolean);
  const total = results.reduce((a, r) => a + (r.total || 0), 0);
  const correct = results.reduce((a, r) => a + (r.correct || 0), 0);
  const acc = total ? Math.round((correct / total) * 100) : 0;

  if (sumTotal) sumTotal.textContent = String(total);
  if (sumCorrect) sumCorrect.textContent = String(correct);
  if (sumAcc) sumAcc.textContent = `${acc}%`;

  const unlocked = doneCount === 3 && results.length === 3 && !!p;
  if (genBtn) genBtn.disabled = !unlocked;

  const tier = getTierByCorrect(correct);
  return { unlocked, total, correct, acc, profile: p, tier };
}

// ===== Actions =====
genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  await drawChampionCard(s);

  cardZone?.classList.add("isOpen");
  cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
});

dlBtn?.addEventListener("click", () => {
  if (!cardCanvas) return;
  const a = document.createElement("a");
  a.download = "magicblock-champion-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

// ===== Canvas drawing =====
let _noisePattern = null;

async function drawChampionCard(summary) {
  if (!cardCanvas) return;
  const ctx = cardCanvas.getContext("2d");
  const W = cardCanvas.width;
  const H = cardCanvas.height;

  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;

  // --- background (dark) ---
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#070812");
  bg.addColorStop(1, "#05060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // subtle mesh waves on whole canvas
  drawMesh(ctx, W, H, 0.10);

  // light vignette
  const vign = ctx.createRadialGradient(W * 0.5, H * 0.45, 120, W * 0.5, H * 0.55, H * 0.95);
  vign.addColorStop(0, "rgba(255,255,255,0.04)");
  vign.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // --- main card area (LANDSCAPE card inside portrait canvas) ---
  const card = {
    x: 70,
    y: 250,
    w: W - 140,
    h: 700,
    r: 90,
  };

  // card gradient (tier color)
  const cg = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
  cg.addColorStop(0, theme.base);
  cg.addColorStop(1, theme.dark);

  ctx.fillStyle = cg;
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r, true, false);

  // inner soft glow
  const inner = ctx.createRadialGradient(
    card.x + card.w * 0.45, card.y + card.h * 0.35, 80,
    card.x + card.w * 0.55, card.y + card.h * 0.50, card.h * 0.95
  );
  inner.addColorStop(0, "rgba(255,255,255,0.18)");
  inner.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = inner;
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r, true, false);

  // border
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r, false, true);

  // mesh on card
  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.clip();
  drawMesh(ctx, W, H, 0.16);
  ctx.restore();

  // grain
  ensureNoisePattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = _noisePattern;
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r, true, false);
  ctx.restore();

  // --- top-left brand inside card ---
  const brandX = card.x + 64;
  const brandY = card.y + 82;

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MagicBlock", brandX, brandY);

  // small "Quiz" pill
  drawPill(ctx, brandX + 320, brandY - 34, 120, 48, "Quiz");

  // --- center title ---
  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.font = "700 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Champion Card", card.x + card.w * 0.62, card.y + 120);
  ctx.textAlign = "left";

  // --- avatar box ---
  const ax = card.x + 90;
  const ay = card.y + 210;
  const as = 340;
  const ar = 78;

  // outer outline (dark)
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, ax, ay, as, as, ar, false, true);

  // inner fill
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, ax + 8, ay + 8, as - 16, as - 16, ar - 10, true, false);

  // draw avatar (profile image dataURL), else fallback
  const avatarSrc = summary.profile?.avatar || "";
  await drawAvatarRounded(ctx, avatarSrc, ax + 12, ay + 12, as - 24, as - 24, ar - 14);

  // --- right text blocks ---
  const tx = card.x + 500;
  let ty = card.y + 250;

  const name = (summary.profile?.name || "Player").trim();
  const scoreText = `${summary.correct} / ${summary.total}`;
  const tierLabel = theme.label;

  // helper: label + value
  function drawLabelValue(label, value, y) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(label, tx, y);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(value, tx, y + 70);
  }

  drawLabelValue("Your Name:", name, ty);
  ty += 180;

  drawLabelValue("Total Score", scoreText, ty);
  ty += 180;

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Card status:", tx, ty);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = "950 56px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(tierLabel, tx + 250, ty);

  // small footer (optional)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${summary.acc}%`, card.x + 64, card.y + card.h - 56);
}

// ===== Drawing helpers =====
function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  roundedRectPath(ctx, x, y, w, h, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawPill(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 999, true, true);

  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.font = "900 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawMesh(ctx, W, H, alpha = 0.12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  // horizontal waves
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  const rows = 22;
  for (let i = 0; i < rows; i++) {
    const baseY = (H * 0.12) + i * (H * 0.035);
    ctx.beginPath();
    for (let x = -30; x <= W + 30; x += 18) {
      const t = x / W;
      const wobble =
        Math.sin(t * Math.PI * 2 + i * 0.22) * 16 +
        Math.sin(t * Math.PI * 6 + i * 0.12) * 6;
      const y = baseY + wobble;
      if (x <= -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // vertical waves (lighter)
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  const cols = 16;
  for (let i = 0; i < cols; i++) {
    const baseX = (W * 0.08) + i * (W * 0.055);
    ctx.beginPath();
    for (let y = -30; y <= H + 30; y += 18) {
      const t = y / H;
      const wobble =
        Math.sin(t * Math.PI * 2 + i * 0.28) * 14 +
        Math.sin(t * Math.PI * 5 + i * 0.14) * 5;
      const x = baseX + wobble;
      if (y <= -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function ensureNoisePattern(ctx) {
  if (_noisePattern) return;

  const n = document.createElement("canvas");
  n.width = 160;
  n.height = 160;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(n.width, n.height);

  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);

  _noisePattern = ctx.createPattern(n, "repeat");
}

async function drawAvatarRounded(ctx, src, x, y, w, h, r) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();

  // fallback if no avatar
  if (!src || !src.startsWith("data:")) {
    // if you have a placeholder file in assets:
    // put it at: assets/uploadavatar.jpg
    try {
      const fallback = await loadImage("assets/uploadavatar.jpg");
      ctx.filter = "blur(7px)";
      drawCover(ctx, fallback, x, y, w, h);
      ctx.filter = "none";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y, w, h);
    } catch {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    return;
  }

  try {
    const img = await loadImage(src);
    ctx.filter = "none";
    drawCover(ctx, img, x, y, w, h);
  } catch {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawCover(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const ir = iw / ih;
  const rr = w / h;

  let dw, dh, dx, dy;
  if (ir > rr) {
    dh = h;
    dw = h * ir;
    dx = x - (dw - w) / 2;
    dy = y;
  } else {
    dw = w;
    dh = w / ir;
    dx = x;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// initial summary render
computeSummary();
