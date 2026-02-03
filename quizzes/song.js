const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  resSong: "mb_result_song",
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

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");

  renderTopProfile();

  // ⚠️ Тут підстав свої реальні файли (якщо їх нема — НЕ зламається)
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

  // ===== DOM (все з null-guards щоб не ламалось) =====
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

  // Якщо раптом ключових елементів нема — не падаємо
  const criticalOk = !!(quizPanel && qTitle && progressText && optionsEl && nextBtn && audio);
  if (!criticalOk){
    console.error("[Song Quiz] Missing critical DOM nodes. Check IDs in song.html.");
    return;
  }

  // ===== State =====
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
    showResult(saved);
  } else {
    renderQuestion();
  }

  // ===== Quiz render =====
  function renderQuestion(){
    const q = QUESTIONS[idx];
    if (!q){
      // якщо раптом масив поламаний — зробимо дефолт і не зламаємось
      console.error("[Song Quiz] QUESTIONS is empty or idx out of range.");
      return;
    }

    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

    // audio
    audio.pause();
    audio.currentTime = 0;
    audio.src = q.audio || "";
    syncPlayIcon();
    if (seekBar) seekBar.value = "0";
    if (playerTime) playerTime.textContent = "0:00 / 0:00";

    // options
    optionsEl.innerHTML = "";
    (q.options || ["A","B","C","D"]).forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.type = "button";
      btn.textContent = `${String.fromCharCode(65+i)}) ${label}`;

      btn.addEventListener("click", () => {
        // ✅ ДО Next — можна міняти вибір скільки хочеш
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

  // ===== Card (optional, не ламає quiz якщо нема canvas) =====
  genBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;
    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
    if (!r) return;

    await drawSimpleCard(cardCanvas, {
      title: "Song Quiz",
      name: p?.name || "Player",
      correct: r.correct,
      total: r.total,
      acc: r.acc
    });

    cardZone?.classList.add("isOpen");
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-song-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  async function drawSimpleCard(canvas, d){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0,0,W,H);
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, "#0b0d12");
    g.addColorStop(1, "#05060a");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, 70, 70, W-140, H-140, 70, true, false);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "950 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("MagicBlock Quiz", 160, 240);

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.title, 160, 320);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.name, 160, 520);

    ctx.font = "800 46px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(`Correct: ${d.correct} / ${d.total}`, 160, 650);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(`Accuracy: ${d.acc}%`, 160, 725);
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
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
