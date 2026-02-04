const MB_KEYS = {
  profile: "mb_profile",
  doneMovie: "mb_done_movie",
  resMovie: "mb_result_movie",
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
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

function makeSerial(len=5){
  const s = Math.random().toString(36).slice(2).toUpperCase();
  return s.slice(0, len).padEnd(len, "X");
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  /**
   * TODO: підстав свої фрейми.
   * frame: шлях відносно quizzes/ (тобто ../assets/....)
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

    // один раз генеруємо ID і зберігаємо
    const idName = `MB-MagicViewer-${makeSerial(5)}`;

    const result = {
      total,
      correct,
      acc,
      name: p?.name || "Player",
      idName,
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

  genBtn.addEventListener("click", async () => {
    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
    if (!r) return;

    await drawQuizResultCard(cardCanvas, {
      quizTitle: "Guess the Movie by the Frame",
      logoSrc: "../assets/logo.webm",
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idName: r.idName || `MB-MagicViewer-${makeSerial(5)}`
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
});

/* =========================
   CARD DRAW (wide, like Song)
========================= */

async function drawQuizResultCard(canvas, d){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0,0,W,H);

  // ---- card box ----
  const pad = Math.round(W * 0.06);         // outer padding
  const card = {
    x: pad,
    y: Math.round(H * 0.12),
    w: W - pad*2,
    h: Math.round(H * 0.70),
    r: Math.round(H * 0.10)
  };

  // ---- background transparent (важливо) ----
  // нічого не малюємо як фон

  // ---- card fill (silver) ----
  const g = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
  g.addColorStop(0, "#D9D9D9");
  g.addColorStop(0.35, "#CFCFCF");
  g.addColorStop(1, "#C7C7C7");

  roundRect(ctx, card.x, card.y, card.w, card.h, card.r, true, false, g);

  // subtle inner overlay
  ctx.save();
  ctx.globalAlpha = 0.12;
  const g2 = ctx.createRadialGradient(
    card.x + card.w*0.35, card.y + card.h*0.30, 10,
    card.x + card.w*0.55, card.y + card.h*0.50, card.w*0.75
  );
  g2.addColorStop(0, "#FFFFFF");
  g2.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g2;
  roundRect(ctx, card.x+8, card.y+8, card.w-16, card.h-16, card.r-10, true, false);
  ctx.restore();

  // border
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,.20)";
  ctx.lineWidth = 3;
  roundRect(ctx, card.x+3, card.y+3, card.w-6, card.h-6, card.r-8, false, true);
  ctx.restore();

  // inner thin line
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, card.x+10, card.y+10, card.w-20, card.h-20, card.r-14, false, true);
  ctx.restore();

  // ---- layout helpers ----
  const left = card.x + Math.round(card.w * 0.06);
  const top  = card.y + Math.round(card.h * 0.08);
  const padX = Math.round(card.w * 0.05);

  // ---- logo (NO squash) ----
  const logoBox = { w: 280, h: 84 }; // трохи більше щоб було читабельніше
  const logoX = left;
  const logoY = top;

  const logoFrame = await loadVideoFrame(d.logoSrc);
  if (logoFrame){
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawContain(ctx, logoFrame, logoX, logoY, logoBox.w, logoBox.h);
    ctx.restore();
  }

  // ---- title (never overlaps logo) ----
  const titleAreaLeft  = logoX + logoBox.w + 44;
  const titleAreaRight = card.x + card.w - padX;
  const titleCx = (titleAreaLeft + titleAreaRight) / 2;
  const titleMaxW = (titleAreaRight - titleAreaLeft);

  const titleY = top + 58; // по центру “шапки”
  ctx.fillStyle = "rgba(255,255,255,.92)";
  drawCenteredFitText(ctx, d.quizTitle, titleCx, titleY, titleMaxW, 66, 42, "900");

  // ---- avatar ----
  const avSize = Math.round(card.h * 0.42);
  const avX = left + 20;
  const avY = card.y + Math.round(card.h * 0.26);

  await drawAvatarRounded(ctx, d.avatar, avX, avY, avSize, Math.round(avSize * 0.25));

  // ---- text blocks ----
  const contentX = avX + avSize + Math.round(card.w * 0.06);
  const contentY = card.y + Math.round(card.h * 0.30);

  // labels
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Your Name:", contentX, contentY);

  // name
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(String(d.name || "Player"), contentX, contentY + 64);

  // divider line
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, contentY + 92);
  ctx.lineTo(card.x + card.w - padX, contentY + 92);
  ctx.stroke();
  ctx.restore();

  // score label
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Score", contentX, contentY + 150);

  // score value
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.font = "950 74px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${d.correct} / ${d.total}`, contentX, contentY + 232);

  // bottom line
  const bottomLineY = card.y + card.h - Math.round(card.h * 0.22);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, bottomLineY);
  ctx.lineTo(card.x + card.w - padX, bottomLineY);
  ctx.stroke();
  ctx.restore();

  // Accuracy bottom-left
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, card.x + Math.round(card.w*0.06), card.y + card.h - Math.round(card.h*0.10));

  // ID label + pill
  const idLabelY = card.y + card.h - Math.round(card.h * 0.16);
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("ID Name:", contentX, idLabelY);

  const pillX = contentX;
  const pillY = idLabelY + 22;
  const pillW = Math.round(card.w * 0.52);
  const pillH = 66;
  const pillR = 28;

  ctx.fillStyle = "rgba(0,0,0,.38)";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillR, true, false);

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(String(d.idName || ""), pillX + 22, pillY + 44);

  // ---- tiny noise (optional, makes it feel “card”) ----
  ctx.save();
  ctx.globalAlpha = 0.05;
  const imgData = ctx.getImageData(card.x, card.y, card.w, card.h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4){
    const n = (Math.random() - 0.5) * 18;
    data[i]     = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, card.x, card.y);
  ctx.restore();
}

/* ============ helpers ============ */

function roundRect(ctx, x, y, w, h, r, fill, stroke, fillStyle){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  if (fill){
    if (fillStyle) ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (stroke) ctx.stroke();
}

function drawCenteredFitText(ctx, text, cx, y, maxW, maxFont, minFont, weight="900"){
  const t = String(text || "");
  let size = maxFont;
  while (size >= minFont){
    ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    if (ctx.measureText(t).width <= maxW) break;
    size -= 2;
  }
  const w = ctx.measureText(t).width;
  ctx.fillText(t, cx - w/2, y);
}

// object-fit: contain (для лого)
function drawContain(ctx, media, x, y, w, h){
  const sw = media.videoWidth || media.naturalWidth || media.width;
  const sh = media.videoHeight || media.naturalHeight || media.height;
  if (!sw || !sh) return;

  const s = Math.min(w / sw, h / sh);
  const dw = sw * s;
  const dh = sh * s;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(media, dx, dy, dw, dh);
}

// object-fit: cover (для аватара)
function drawCover(ctx, img, x, y, w, h){
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) return;

  const s = Math.max(w / sw, h / sh);
  const dw = sw * s;
  const dh = sh * s;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

async function drawAvatarRounded(ctx, dataUrl, x, y, size, radius){
  // background + clip
  ctx.save();
  roundRect(ctx, x, y, size, size, radius, true, false, "rgba(0,0,0,.18)");
  ctx.clip();

  if (dataUrl && dataUrl.startsWith("data:")){
    const img = await loadImage(dataUrl);
    drawCover(ctx, img, x, y, size, size); // <— no squash
  }

  ctx.restore();

  // border
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 4;
  roundRect(ctx, x+2, y+2, size-4, size-4, radius, false, true);
  ctx.restore();
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadVideoFrame(src){
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.src = src;

    const done = () => {
      try{
        // повертаємо сам video-елемент як “кадр”
        resolve(v);
      } catch {
        resolve(null);
      }
      cleanup();
    };

    const cleanup = () => {
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("error", onErr);
    };

    const onErr = () => { resolve(null); cleanup(); };

    const onLoaded = async () => {
      try{
        v.currentTime = 0;
      } catch {}
      done();
    };

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("error", onErr);
    v.load();
  });
}
