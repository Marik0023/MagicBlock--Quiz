const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  resSong: "mb_result_song",
  idSong: "mb_card_id_song",
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const reminder = () => vids.forEach(v => v.play().catch(()=>{}));
  reminder();
  window.addEventListener("click", reminder, { once:true });
  window.addEventListener("touchstart", reminder, { once:true });
}

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

function randCode(len=6){
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<len;i++) out += abc[Math.floor(Math.random()*abc.length)];
  return out;
}
function getOrCreateCardId(storageKey, prefix){
  try{
    const have = localStorage.getItem(storageKey);
    if (have) return have;
    const id = `MB-${prefix}-${randCode(6)}`;
    localStorage.setItem(storageKey, id);
    return id;
  } catch {
    return `MB-${prefix}-${randCode(6)}`;
  }
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadVideoFrame(src, time=0.05){
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;

    const cleanup = () => {
      v.onloadedmetadata = null;
      v.onseeked = null;
      v.onerror = null;
    };

    v.onerror = (e) => { cleanup(); reject(e); };

    v.onloadedmetadata = () => {
      try{
        v.currentTime = Math.min(Math.max(time, 0), Math.max((v.duration || 1) - 0.05, 0.05));
      }catch{
        cleanup();
        resolve(v);
      }
    };

    v.onseeked = () => { cleanup(); resolve(v); };
  });
}

async function loadLogoAsset(){
  const candidates = [
    "../assets/logo.png",
    "../assets/logo.webp",
    "../assets/logo.svg",
    "../assets/logo.jpg",
    "../assets/logo.jpeg",
  ];

  for (const src of candidates){
    try{
      const img = await loadImage(src);
      return { kind: "img", node: img };
    }catch{}
  }

  try{
    const vid = await loadVideoFrame("../assets/logo.webm", 0.05);
    return { kind: "video", node: vid };
  }catch{}

  return null;
}

function rrPath(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r){ rrPath(ctx,x,y,w,h,r); ctx.fill(); }
function strokeRR(ctx, x, y, w, h, r){ rrPath(ctx,x,y,w,h,r); ctx.stroke(); }

function makeNoisePattern(scale=240){
  const c = document.createElement("canvas");
  c.width = scale; c.height = scale;
  const n = c.getContext("2d");

  const img = n.createImageData(scale, scale);
  for (let i=0; i<img.data.length; i+=4){
    const v = (Math.random()*255)|0;
    img.data[i] = v;
    img.data[i+1] = v;
    img.data[i+2] = v;
    img.data[i+3] = 18;
  }
  n.putImageData(img, 0, 0);
  return c;
}

function drawWaves(ctx, x, y, w, h, amp=10, lines=14, alpha=0.11){
  ctx.save();
  rrPath(ctx, x, y, w, h, 60);
  ctx.clip();

  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;

  const stepY = h / (lines + 2);
  for (let i=0; i<lines; i++){
    const yy = y + stepY*(i+1);
    ctx.beginPath();

    const freq = 90 + i*2.2;
    const phase = i * 0.7;
    for (let xx = 0; xx <= w; xx += 10){
      const t = (xx / freq) + phase;
      const dy = Math.sin(t) * (amp * (0.55 + i/lines*0.55));
      ctx.lineTo(x + xx, yy + dy);
    }
    ctx.stroke();
  }

  ctx.restore();
}

async function drawAvatarRounded(ctx, dataUrl, x, y, size, r){
  ctx.save();
  rrPath(ctx, x, y, size, size, r);
  ctx.clip();

  const g = ctx.createLinearGradient(x, y, x+size, y+size);
  g.addColorStop(0, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, size, size);

  if (dataUrl && dataUrl.startsWith("data:")){
    try{
      const img = await loadImage(dataUrl);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const s = Math.max(size/iw, size/ih);
      const dw = iw*s;
      const dh = ih*s;
      const dx = x + (size - dw)/2;
      const dy = y + (size - dh)/2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }catch{}
  }

  const rg = ctx.createRadialGradient(x+size*0.25, y+size*0.2, 0, x+size*0.25, y+size*0.2, size*0.95);
  rg.addColorStop(0, "rgba(255,255,255,0.20)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(x, y, size, size);

  ctx.restore();

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  strokeRR(ctx, x, y, size, size, r);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.30)";
  strokeRR(ctx, x+7, y+7, size-14, size-14, Math.max(10, r-8));
}

// ✅ ВАЖЛИВО: тут фон НЕ малюємо (PNG буде прозорий)
async function drawQuizWideCard(canvas, d){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0,0,W,H); // прозорий фон

  // card occupies full canvas
  const x = 0, y = 0, w = W, h = H;
  const r = 92;

  // main silver panel
  const base = ctx.createLinearGradient(x, y, x+w, y+h);
  base.addColorStop(0, "#8e9094");
  base.addColorStop(0.32, "#6f7277");
  base.addColorStop(0.55, "#70747a");
  base.addColorStop(1, "#5b5e63");
  ctx.fillStyle = base;
  fillRR(ctx, x, y, w, h, r);

  // subtle vignette (inside)
  ctx.save();
  rrPath(ctx, x, y, w, h, r);
  ctx.clip();
  const vg = ctx.createRadialGradient(x+w*0.55, y+h*0.45, 0, x+w*0.55, y+h*0.45, h*0.95);
  vg.addColorStop(0, "rgba(255,255,255,0.10)");
  vg.addColorStop(0.6, "rgba(255,255,255,0.03)");
  vg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // texture/noise
  const noise = makeNoisePattern(260);
  ctx.save();
  rrPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.drawImage(noise, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.restore();

  // border like champion
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  strokeRR(ctx, x+2, y+2, w-4, h-4, r);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  strokeRR(ctx, x+18, y+18, w-36, h-36, r-18);

  // waves (same vibe)
  drawWaves(ctx, x+w*0.66, y+h*0.18, w*0.30, h*0.42, 9, 16, 0.10);
  drawWaves(ctx, x+w*0.08, y+h*0.60, w*0.36, h*0.30, 10, 14, 0.08);

  // logo bigger (top-left)
  const logo = await loadLogoAsset();
  const lx = x + 88;
  const ly = y + 60;
  const lh = 86; // ✅ bigger

  if (logo?.kind === "img"){
    const img = logo.node;
    const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
    const lw = lh * ratio;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(img, lx, ly, lw, lh);
    ctx.globalAlpha = 1;
  } else if (logo?.kind === "video"){
    const v = logo.node;
    const vw = v.videoWidth || 320;
    const vh = v.videoHeight || 120;
    const ratio = vw / (vh || 1);
    const lw = lh * ratio;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(v, lx, ly, lw, lh);
    ctx.globalAlpha = 1;
  }

  // Title centered
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 10;
  ctx.fillText(d.quizTitle || "Quiz", x + w/2, y + 120);
  ctx.restore();

  // avatar
  const avSize = 280;
  const avX = x + 160;
  const avY = y + 270;
  await drawAvatarRounded(ctx, d.avatar, avX, avY, avSize, 70);

  // text layout
  const tx = x + 610;
  const startY = y + 360;

  // separators (not “floating”)
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, y + 500);
  ctx.lineTo(x + w - 180, y + 500);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tx, y + 690);
  ctx.lineTo(x + w - 180, y + 690);
  ctx.stroke();

  // Name
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Your Name:", tx, startY);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 68px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.name || "Player", tx, startY + 84);

  // Score
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Score", tx, startY + 214);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 78px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.scoreText || "0 / 10", tx, startY + 304);

  // ID label
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("ID Name:", tx, startY + 434);

  // ID pill (centered-ish like champion)
  const pillW = 860;
  const pillH = 78;
  const pillX = tx;
  const pillY = startY + 474;

  ctx.fillStyle = "rgba(0,0,0,0.26)";
  fillRR(ctx, pillX, pillY, pillW, pillH, 30);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  strokeRR(ctx, pillX, pillY, pillW, pillH, 30);

  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.font = "900 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.idName || "MB-MagicListener-XXXXXX", pillX + 28, pillY + 54);

  // Accuracy bottom-left like champion
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.accText || "0%"}`, x + 120, y + h - 86);
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  const QUESTIONS = [
    { audio: "../assets/songs/q1.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q2.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { audio: "../assets/songs/q3.mp3", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { audio: "../assets/songs/q4.mp3", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { audio: "../assets/songs/q5.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q6.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { audio: "../assets/songs/q7.mp3", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { audio: "../assets/songs/q8.mp3", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { audio: "../assets/songs/q9.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q10.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const progressText = document.getElementById("progressText");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const seekBar = document.getElementById("seekBar");
  const playerTime = document.getElementById("playerTime");

  const rName = document.getElementById("rName");
  const rTotal = document.getElementById("rTotal");
  const rCorrect = document.getElementById("rCorrect");
  const rAcc = document.getElementById("rAcc");

  const genBtn = document.getElementById("genBtn");
  const cardZone = document.getElementById("cardZone");
  const cardCanvas = document.getElementById("cardCanvas");
  const dlBtn = document.getElementById("dlBtn");

  const criticalOk = !!(quizPanel && qTitle && progressText && optionsEl && nextBtn && audio);
  if (!criticalOk){
    console.error("[Song Quiz] Missing critical DOM nodes. Check IDs in song.html.");
    return;
  }

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;

  // audio ui
  playBtn?.addEventListener("click", async () => {
    try{
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {}
    syncPlayIcon();
  });

  audio.addEventListener("play", syncPlayIcon);
  audio.addEventListener("pause", syncPlayIcon);

  audio.addEventListener("loadedmetadata", updateTime);
  audio.addEventListener("timeupdate", () => {
    updateTime();
    if (!isNaN(audio.duration) && audio.duration > 0 && seekBar){
      seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 100));
    }
  });

  seekBar?.addEventListener("input", () => {
    if (!isNaN(audio.duration) && audio.duration > 0){
      const t = (Number(seekBar.value) / 100) * audio.duration;
      audio.currentTime = t;
    }
  });

  function syncPlayIcon(){
    if (playBtn) playBtn.textContent = audio.paused ? "▶" : "⏸";
  }
  function formatTime(s){
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2,"0")}`;
  }
  function updateTime(){
    if (playerTime) playerTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  // load saved
  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  const done = localStorage.getItem(MB_KEYS.doneSong) === "1";

  if (done && saved){
    showResult(saved);
  } else {
    renderQuestion();
  }

  function renderQuestion(){
    const q = QUESTIONS[idx];
    selectedIndex = null;

    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

    audio.pause();
    audio.currentTime = 0;
    audio.src = q.audio || "";
    syncPlayIcon();
    if (seekBar) seekBar.value = "0";
    if (playerTime) playerTime.textContent = "0:00 / 0:00";

    optionsEl.innerHTML = "";
    (q.options || ["A","B","C","D"]).forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.type = "button";
      btn.textContent = `${String.fromCharCode(65+i)}) ${label}`;

      btn.addEventListener("click", () => {
        selectedIndex = i;
        [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, j) => {
          b.classList.toggle("isSelected", j === selectedIndex);
        });
        nextBtn.disabled = false;
        nextBtn.classList.add("isShow");
      });

      optionsEl.appendChild(btn);
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

    const result = { total, correct, acc, name: p?.name || "Player", ts: Date.now() };

    localStorage.setItem(MB_KEYS.doneSong, "1");
    localStorage.setItem(MB_KEYS.resSong, JSON.stringify(result));

    showResult(result);
  });

  function showResult(result){
    quizPanel.style.display = "none";
    if (resultPanel) resultPanel.style.display = "block";

    rName && (rName.textContent = result.name || "Player");
    rTotal && (rTotal.textContent = String(result.total));
    rCorrect && (rCorrect.textContent = String(result.correct));
    rAcc && (rAcc.textContent = `${result.acc}%`);
  }

  genBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
    if (!r) return;

    const quizTitle = document.querySelector(".quizHero h1")?.textContent?.trim() || "Song Quiz";
    const idName = getOrCreateCardId(MB_KEYS.idSong, "MagicListener");

    await drawQuizWideCard(cardCanvas, {
      quizTitle,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      scoreText: `${r.correct} / ${r.total}`,
      accText: `${r.acc}%`,
      idName
    });

    cardZone?.classList.add("isOpen");
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-song-card.png";
    a.href = cardCanvas.toDataURL("image/png"); // ✅ буде з прозорістю
    a.click();
  });
});
