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
 * TODO: підстав свої реальні аудіо/варіанти.
 * audio: шлях відносно quizzes/ (тобто ../assets/....)
 */
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

let idx = 0;
let correct = 0;
let selectedIndex = null;

/* якщо вже пройдено — показуємо результат */
const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
const done = localStorage.getItem(MB_KEYS.doneSong) === "1";
if (done && saved){
  showResult(saved);
} else {
  renderQuestion();
}

/* ===== Audio UI ===== */
playBtn.addEventListener("click", async () => {
  try{
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  } catch {}
  syncPlayIcon();
});

audio.addEventListener("play", syncPlayIcon);
audio.addEventListener("pause", syncPlayIcon);

audio.addEventListener("loadedmetadata", () => {
  updateTime();
});
audio.addEventListener("timeupdate", () => {
  updateTime();
  if (!isNaN(audio.duration) && audio.duration > 0){
    seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 100));
  }
});
seekBar.addEventListener("input", () => {
  if (!isNaN(audio.duration) && audio.duration > 0){
    const t = (Number(seekBar.value) / 100) * audio.duration;
    audio.currentTime = t;
  }
});

function syncPlayIcon(){
  playBtn.textContent = audio.paused ? "▶" : "⏸";
}
function formatTime(s){
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2,"0")}`;
}
function updateTime(){
  playerTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
}

/* ===== Quiz logic ===== */
function renderQuestion(){
  selectedIndex = null;
  nextBtn.disabled = true;
  nextBtn.classList.remove("isShow");

  const q = QUESTIONS[idx];
  qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

  // load audio
  audio.pause();
  audio.currentTime = 0;
  audio.src = q.audio;
  syncPlayIcon();
  seekBar.value = "0";
  playerTime.textContent = "0:00 / 0:00";

  // options
  optionsEl.innerHTML = "";
  q.options.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.className = "optionBtn";
    btn.type = "button";
    btn.textContent = `${String.fromCharCode(65+i)}) ${label}`;
    btn.addEventListener("click", () => {
      // ДО Next — можна міняти вибір скільки хочеш
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
  resultPanel.style.display = "block";

  rName.textContent = result.name || "Player";
  rTotal.textContent = String(result.total);
  rCorrect.textContent = String(result.correct);
  rAcc.textContent = `${result.acc}%`;
}

/* ===== Card generation ===== */
genBtn.addEventListener("click", async () => {
  const p = getProfile();
  const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  if (!r) return;

  await drawResultCard({
    title: "Song Quiz",
    profile: p,
    total: r.total,
    correct: r.correct,
    acc: r.acc
  });

  cardZone.classList.add("isOpen");
  cardZone.scrollIntoView({ behavior:"smooth", block:"start" });
});

dlBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "magicblock-song-result.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

async function drawResultCard(data){
  const ctx = cardCanvas.getContext("2d");
  const W = cardCanvas.width, H = cardCanvas.height;

  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, "#0b0d12");
  g.addColorStop(1, "#05060a");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 70, 70, W-140, H-140, 70, true, false);

  c
