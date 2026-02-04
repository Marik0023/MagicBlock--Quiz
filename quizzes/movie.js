const MB_KEYS = {
  profile: "mb_profile",
  doneMovie: "mb_done_movie",
  resMovie: "mb_result_movie",
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

function makeId(prefix){
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i=0;i<5;i++) s += letters[Math.floor(Math.random()*letters.length)];
  return `MB-${prefix}-${s}`;
}

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
}
forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");

function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;
  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");
  const p = getProfile();
  if (!p){
    if (img) img.src = "";
    if (nameEl) nameEl.textContent = "No profile";
    if (hintEl) hintEl.textContent = "Go Home";
    pill.addEventListener("click", () => location.href = "../index.html");
    return;
  }
  if (img) img.src = p.avatar || "";
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit on Home";
  pill.addEventListener("click", () => location.href = "../index.html");
}
renderTopProfile();

/**
 * TODO: підстав свої фрейми.
 */
const QUESTIONS = [
  { frame: "../assets/movies/f1.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
  { frame: "../assets/movies/f2.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
  { frame: "../assets/movies/f3.jpg", options: ["A", "B", "C", "D"], correctIndex: 2 },
  { frame: "../assets/movies/f4.jpg", options: ["A", "B", "C", "D"], correctIndex: 3 },
  { frame: "../assets/movies/f5.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
  { frame: "../assets/movies/f6.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
  { frame: "../assets/movies/f7.jpg", options: ["A", "B", "C", "D"], correctIndex: 2 },
  { frame: "../assets/movies/f8.jpg", options: ["A", "B", "C", "D"], correctIndex: 3 },
  { frame: "../assets/movies/f9.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
  { frame: "../assets/movies/f10.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
];

const quizPanel = document.getElementById("quizPanel");
const resultPanel = document.getElementById("resultPanel");

const qTitle = document.getElementById("qTitle");
const progressText = document.getElementById("progressText");
const frameImg = document.getElementById("frameImg");
const optionsEl = document.getElementById("options");
const nextBtn = document.getElementById("nextBtn");

const rName = document.getElementById("rName");
const rTotal = document.getElementById("rTotal");
const rCorrect = document.getElementById("rCorrect");
const rAcc = document.getElementById("rAcc");

const genBtn = document.getElementById("genBtn");
const cardZone = document.getElementById("cardZone");
const cardCanvas = document.getElementById("cardCanvas");
const dlBtn = document.getElementById("dlBtn");

let idx = 0;
let correct = 0;
let selectedIndex = null;

const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
const done = localStorage.getItem(MB_KEYS.doneMovie) === "1";

if (done && saved){
  showResult(saved);
} else {
  renderQuestion();
}

function renderQuestion(){
  selectedIndex = null;
  nextBtn.disabled = true;
  nextBtn.classList.remove("isShow");

  const q = QUESTIONS[idx];
  qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

  frameImg.src = q.frame || "../assets/covers/placeholder.jpg";

  optionsEl.innerHTML = "";
  q.options.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.className = "optionBtn";
    btn.type = "button";
    btn.textContent = `${String.fromCharCode(65+i)}) ${label}`;
    btn.addEventListener("click", () => {
      selectedIndex = i;
      updateSelectedUI();
      nextBtn.disabled = false;
      nextBtn.classList.add("isShow");
    });
    optionsEl.appendChild(btn);
  });
}

function updateSelectedUI(){
  [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, i) => {
    b.classList.toggle("isSelected", i === selectedIndex);
  });
}

nextBtn.addEventListener("click", () => {
  if (selectedIndex === null) return;

  const q = QUESTIONS[idx];
  if (selectedIndex === q.correctIndex) correct++;

  idx++;
  if (idx < QUESTIONS.length){
    renderQuestion();
    return;
  }

  const total = QUESTIONS.length;
  const acc = Math.round((correct / total) * 100);
  const p = getProfile();

  // ✅ ID once per user result
  const result = {
    total, correct, acc,
    name: p?.name || "Player",
    id: makeId("MagicViewer"),
    ts: Date.now()
  };

  localStorage.setItem(MB_KEYS.doneMovie, "1");
  localStorage.setItem(MB_KEYS.resMovie, JSON.stringify(result));

  showResult(result);
});

function showResult(result){
  quizPanel.style.display = "none";
  resultPanel.style.display = "block";

  rName.textContent = result.name || "Player";
  rTotal.textContent = String(result.total);
  rCorrect.textContent = String(result.correct);
  rAcc.textContent = `${result.acc}%`;
}

/* ========= RESULT CARD (same as song style) ========= */

genBtn.addEventListener("click", async () => {
  const p = getProfile();
  let r = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
  if (!r) return;

  // якщо раптом старий результат без id — додамо і збережемо
  if (!r.id){
    r.id = makeId("MagicViewer");
    localStorage.setItem(MB_KEYS.resMovie, JSON.stringify(r));
  }

  await drawQuizResultCard(cardCanvas, {
    quizName: "Guess the Movie by the Frame",
    name: p?.name || "Player",
    avatar: p?.avatar || "",
    correct: r.correct,
    total: r.total,
    acc: r.acc,
    id: r.id,
    logoSrc: "../assets/logo.webm",
  });

  cardZone.classList.add("isOpen");
  cardZone.scrollIntoView({ behavior:"smooth", block:"start" });
});

dlBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "magicblock-movie-result.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

/* ========= Drawing ========= */

async function drawQuizResultCard(canvas, d){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // transparent outside
  ctx.clearRect(0,0,W,H);

  // drop shadow for the card
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 22;

  // card base
  roundRectPath(ctx, 180, 180, W-360, H-360, 92);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
  ctx.restore();

  // inner plate
  roundRectPath(ctx, 210, 210, W-420, H-420, 84);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  // border
  roundRectPath(ctx, 180, 180, W-360, H-360, 92);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // subtle vignette
  const vg = ctx.createRadialGradient(W*0.55, H*0.35, 20, W*0.55, H*0.35, W*0.7);
  vg.addColorStop(0, "rgba(255,255,255,0.10)");
  vg.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = vg;
  roundRectPath(ctx, 210, 210, W-420, H-420, 84);
  ctx.fill();

  // texture noise (only on card)
  ctx.save();
  roundRectPath(ctx, 210, 210, W-420, H-420, 84);
  ctx.clip();
  drawNoise(ctx, W, H, 0.08);
  ctx.restore();

  // wave lines (right side)
  ctx.save();
  roundRectPath(ctx, 210, 210, W-420, H-420, 84);
  ctx.clip();
  drawWaves(ctx, W*0.70, H*0.36, W*0.22, H*0.22, 18, 10, 0.10);
  drawWaves(ctx, W*0.32, H*0.70, W*0.22, H*0.22, 18, 10, 0.07);
  ctx.restore();

  // logo (webm frame)
  const logo = await loadWebmFrame(d.logoSrc);
  if (logo){
    const lw = 260, lh = 80;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, 250, 250, lw, lh);
    ctx.globalAlpha = 1;
  }

  // title centered
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 74px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText(d.quizName, W/2, 320);

  // avatar (left)
  await drawAvatarRounded(ctx, d.avatar, 320, 430, 320, 320, 84);

  // text block
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Your Name:", 760, 520);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "900 66px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.name, 760, 600);

  // divider line
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(760, 635);
  ctx.lineTo(W-420, 635);
  ctx.stroke();

  // score
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Score", 760, 725);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "950 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${d.correct} / ${d.total}`, 760, 820);

  // bottom divider
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(320, 900);
  ctx.lineTo(W-320, 900);
  ctx.stroke();

  // ID
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("ID Name:", 760, 960);

  // pill
  roundRectPath(ctx, 760, 990, W-1160, 92, 34);
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.font = "900 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.id, 800, 1052);

  // accuracy bottom-left
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, 250, H-230);
}

function roundRectPath(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

async function drawAvatarRounded(ctx, dataUrl, x, y, w, h, r){
  // bg
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();
  ctx.clip();

  if (dataUrl && dataUrl.startsWith("data:")){
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();

  // border
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadWebmFrame(src){
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;

    const done = () => resolve(v);
    const fail = () => resolve(null);

    v.addEventListener("loadeddata", done, { once:true });
    v.addEventListener("error", fail, { once:true });

    // trigger load
    v.load();
  });
}

function drawNoise(ctx, W, H, alpha=0.08){
  const n = document.createElement("canvas");
  n.width = 240; n.height = 240;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(n.width, n.height);

  for (let i=0;i<img.data.length;i+=4){
    const v = 180 + Math.random()*50;
    img.data[i] = v;
    img.data[i+1] = v;
    img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  nctx.putImageData(img,0,0);

  const pat = ctx.createPattern(n, "repeat");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pat;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

function drawWaves(ctx, x, y, w, h, lines=18, amp=10, alpha=0.10){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 2;

  for (let i=0;i<lines;i++){
    const yy = y + (i/(lines-1))*h;
    ctx.beginPath();
    for (let t=0;t<=60;t++){
      const px = x + (t/60)*w;
      const phase = (i*0.35) + (t*0.22);
      const py = yy + Math.sin(phase)*amp;
      if (t===0) ctx.moveTo(px,py);
      else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
