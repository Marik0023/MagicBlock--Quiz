const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  resSong: "mb_result_song",
};

const QUIZ_ID_TYPE = "MagicListener"; // ✅ музика

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

function makeSerial(len = 6){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0; i<len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function ensureCardId(resultObj, type){
  if (resultObj?.cardId) return resultObj.cardId;
  const id = `MB-${type}-${makeSerial(6)}`;
  if (resultObj) resultObj.cardId = id;
  return id;
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

  // ===== Audio UI =====
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

  // ===== Load saved =====
  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  const done = localStorage.getItem(MB_KEYS.doneSong) === "1";

  if (done && saved){
    // якщо старий сейв без cardId — додамо
    ensureCardId(saved, QUIZ_ID_TYPE);
    localStorage.setItem(MB_KEYS.resSong, JSON.stringify(saved));
    showResult(saved);
  } else {
    renderQuestion();
  }

  function renderQuestion(){
    const q = QUESTIONS[idx];
    if (!q){
      console.error("[Song Quiz] QUESTIONS is empty or idx out of range.");
      return;
    }

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

    const result = {
      total,
      correct,
      acc,
      name: p?.name || "Player",
      ts: Date.now(),
      cardId: `MB-${QUIZ_ID_TYPE}-${makeSerial(6)}`
    };

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

  // ===== Card =====
  genBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
    if (!r) return;

    const quizName = document.querySelector(".quizHero h1")?.textContent?.trim() || "Song Quiz";
    const cardId = ensureCardId(r, QUIZ_ID_TYPE);
    localStorage.setItem(MB_KEYS.resSong, JSON.stringify(r));

    await drawQuizResultCard(cardCanvas, {
      quizName,
      playerName: p?.name || r.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      cardId
    });

    cardZone?.classList.add("isOpen");
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-song-card.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  // =========================
  // CANVAS DRAW (NEW QUIZ CARD)
  // =========================
  async function drawQuizResultCard(canvas, d){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.imageSmoothingEnabled = true;

    const M = 70;
    const x = M, y = M;
    const w = W - M*2;
    const h = H - M*2;
    const R = 86;

    // shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 55;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = "rgba(0,0,0,0.001)"; // трюк щоб тінь рендерилась
    roundRect(ctx, x, y, w, h, R, true, false);
    ctx.restore();

    // card base
    const baseGrad = ctx.createLinearGradient(x, y, x+w, y+h);
    baseGrad.addColorStop(0, "#3e3f41");
    baseGrad.addColorStop(1, "#343537");
    ctx.fillStyle = baseGrad;
    roundRect(ctx, x, y, w, h, R, true, false);

    // inner vignette
    ctx.save();
    ctx.globalAlpha = 0.9;
    const rad = ctx.createRadialGradient(x+w*0.46, y+h*0.46, 40, x+w*0.46, y+h*0.46, Math.max(w,h));
    rad.addColorStop(0, "rgba(255,255,255,0.08)");
    rad.addColorStop(0.55, "rgba(255,255,255,0.02)");
    rad.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = rad;
    roundRect(ctx, x+14, y+14, w-28, h-28, R-18, true, false);
    ctx.restore();

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    roundRect(ctx, x+10, y+10, w-20, h-20, R-22, false, true);

    // clip to card for decorations
    ctx.save();
    roundRectPath(ctx, x, y, w, h, R);
    ctx.clip();

    // soft highlight
    const hl = ctx.createRadialGradient(x+w*0.35, y+h*0.28, 30, x+w*0.35, y+h*0.28, w*0.85);
    hl.addColorStop(0, "rgba(255,255,255,0.12)");
    hl.addColorStop(0.55, "rgba(255,255,255,0.03)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, w, h);

    // waves (top-right & bottom-left)
    drawWaves(ctx, x+w*0.64, y+40, x+w-60, y+h*0.52, 0.10);
    drawWaves(ctx, x+40, y+h*0.62, x+w*0.46, y+h-40, 0.08);

    // ===== Header: MagicBlock + Quiz pill
    const brandX = x + 78;
    const brandY = y + 92;

    // маленька "іконка" (простий ромб)
    ctx.save();
    ctx.translate(brandX-28, brandY-18);
    ctx.rotate(-0.2);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(24, 12);
    ctx.lineTo(12, 24);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("MagicBlock", brandX, brandY);

    // Quiz pill
    const pillText = "Quiz";
    ctx.font = "800 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const pillW = Math.ceil(ctx.measureText(pillText).width) + 30;
    const pillH = 34;
    const pillX = brandX + Math.ceil(ctx.measureText("MagicBlock").width) + 14;
    const pillY = brandY - 26;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(ctx, pillX, pillY, pillW, pillH, 16, true, false);
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.textBaseline = "middle";
    ctx.fillText(pillText, pillX + 15, pillY + pillH/2);

    // ===== Center title (Quiz Name)
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "500 48px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(d.quizName || "Quiz Name", x + w/2, y + 108);

    // ===== Avatar box
    const avSize = 290;
    const avX = x + 140;
    const avY = y + 210;
    const avR = 72;

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    roundRect(ctx, avX, avY, avSize, avSize, avR, true, false);

    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 4;
    roundRect(ctx, avX, avY, avSize, avSize, avR, false, true);

    // avatar image (cover)
    if (d.avatar){
      try{
        const img = await loadImage(d.avatar);
        ctx.save();
        roundRectPath(ctx, avX, avY, avSize, avSize, avR);
        ctx.clip();

        const iw = img.width, ih = img.height;
        const scale = Math.max(avSize/iw, avSize/ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = avX + (avSize - dw)/2;
        const dy = avY + (avSize - dh)/2;

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      } catch {
        // fallback text
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "700 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("AVATAR", avX + avSize/2, avY + avSize/2);
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "700 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AVATAR", avX + avSize/2, avY + avSize/2);
    }

    // ===== Right info
    const rx = x + 540;
    const rightPad = x + w - 140;

    function divider(yy){
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, yy);
      ctx.lineTo(rightPad, yy);
      ctx.stroke();
    }

    // Your Name
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Your Name:", rx, y + 290);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.playerName || "Player", rx, y + 355);

    divider(y + 395);

    // Score
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", rx, y + 470);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${d.correct} / ${d.total}`, rx, y + 545);

    divider(y + 585);

    // ID Name
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("ID Name:", rx, y + 660);

    // ID pill
    const idText = d.cardId || "MB-XXXXXX-000000";
    ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const idW = Math.min(rightPad - rx, Math.ceil(ctx.measureText(idText).width) + 46);
    const idH = 64;
    const idX = rx;
    const idY = y + 688;

    ctx.fillStyle = "rgba(0,0,0,0.20)";
    roundRect(ctx, idX, idY, idW, idH, 26, true, false);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textBaseline = "middle";
    ctx.fillText(idText, idX + 22, idY + idH/2);

    ctx.restore(); // clip

    // final tiny noise overlay (very subtle)
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i=0; i<2200; i++){
      const px = Math.random()*W;
      const py = Math.random()*H;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.restore();
  }

  function drawWaves(ctx, x1, y1, x2, y2, alpha){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 1;

    const lines = 26;
    const width = (x2 - x1);
    const height = (y2 - y1);

    for (let i=0; i<lines; i++){
      const t = i/(lines-1);
      const yy = y1 + t*height;
      ctx.beginPath();
      const amp = 20 + t*18;
      const steps = 9;
      for (let s=0; s<=steps; s++){
        const tt = s/steps;
        const xx = x1 + tt*width;
        const wob = Math.sin((tt*2.8 + t*1.8) * Math.PI) * amp;
        if (s === 0) ctx.moveTo(xx, yy + wob);
        else ctx.lineTo(xx, yy + wob);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function loadImage(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
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
  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    roundRectPath(ctx, x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
});

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
 
