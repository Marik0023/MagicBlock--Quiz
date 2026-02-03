// ===== Keys & helpers =====
const MB_KEYS = {
  profile: "mb_profile",
  done: "mb_done_song",
  result: "mb_result_song",
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

// ===== Profile pill =====
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

// ===== Questions (replace with your real songs) =====
const QUESTIONS = [
  { audio: "../assets/songs/q1.mp3", choices: ["A", "B", "C", "D"], correctIndex: 1 },
  { audio: "../assets/songs/q2.mp3", choices: ["A", "B", "C", "D"], correctIndex: 2 },
  { audio: "../assets/songs/q3.mp3", choices: ["A", "B", "C", "D"], correctIndex: 0 },
  { audio: "../assets/songs/q4.mp3", choices: ["A", "B", "C", "D"], correctIndex: 3 },
  { audio: "../assets/songs/q5.mp3", choices: ["A", "B", "C", "D"], correctIndex: 1 },
  { audio: "../assets/songs/q6.mp3", choices: ["A", "B", "C", "D"], correctIndex: 2 },
  { audio: "../assets/songs/q7.mp3", choices: ["A", "B", "C", "D"], correctIndex: 0 },
  { audio: "../assets/songs/q8.mp3", choices: ["A", "B", "C", "D"], correctIndex: 1 },
  { audio: "../assets/songs/q9.mp3", choices: ["A", "B", "C", "D"], correctIndex: 3 },
  { audio: "../assets/songs/q10.mp3", choices: ["A", "B", "C", "D"], correctIndex: 2 },
];

// ===== UI refs =====
const quizView = document.getElementById("quizView");
const resultView = document.getElementById("resultView");
const qStatus = document.getElementById("qStatus");
const progressText = document.getElementById("progressText");
const optionsEl = document.getElementById("options");
const nextBtn = document.getElementById("nextBtn");

const playBtn = document.getElementById("playBtn");
const seek = document.getElementById("seek");
const timeText = document.getElementById("timeText");
const trackTitle = document.getElementById("trackTitle");

// Result refs
const resName = document.getElementById("resName");
const resDone = document.getElementById("resDone");
const resTotal = document.getElementById("resTotal");
const resCorrect = document.getElementById("resCorrect");
const resWrong = document.getElementById("resWrong");
const resAcc = document.getElementById("resAcc");
const genBtn = document.getElementById("genBtn");
const cardZone = document.getElementById("cardZone");
const cardCanvas = document.getElementById("cardCanvas");
const dlBtn = document.getElementById("dlBtn");

// ===== Audio =====
const audio = new Audio();
audio.preload = "auto";
audio.volume = 1;

let idx = 0;
let correct = 0;
let locked = false;
let pickedIndex = null;

function fmtTime(s){
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2,"0")}`;
}

function setPlayIcon(){
  playBtn.textContent = audio.paused ? "►" : "❚❚";
}

playBtn.addEventListener("click", async () => {
  try{
    if (audio.paused) await audio.play();
    else audio.pause();
  }catch{}
  setPlayIcon();
});

audio.addEventListener("timeupdate", () => {
  const p = audio.duration ? (audio.currentTime / audio.duration) : 0;
  seek.value = Math.round(p * 100);
  timeText.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
});
audio.addEventListener("loadedmetadata", () => {
  timeText.textContent = `${fmtTime(0)} / ${fmtTime(audio.duration)}`;
});
audio.addEventListener("ended", () => setPlayIcon());

seek.addEventListener("input", () => {
  if (!audio.duration) return;
  const t = (Number(seek.value) / 100) * audio.duration;
  audio.currentTime = t;
});

// ===== Quiz flow =====
function render(){
  locked = false;
  pickedIndex = null;
  nextBtn.classList.remove("isShow");

  qStatus.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  progressText.textContent = `Progress: ${idx} / ${QUESTIONS.length}`;

  const q = QUESTIONS[idx];

  // load audio
  audio.pause();
  audio.currentTime = 0;
  audio.src = q.audio;
  setPlayIcon();
  seek.value = 0;
  timeText.textContent = `0:00 / 0:00`;
  trackTitle.textContent = "Guess the song";

  optionsEl.innerHTML = "";
  q.choices.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "optionBtn";
    btn.textContent = `${String.fromCharCode(65+i)}) ${c}`;
    btn.addEventListener("click", () => pick(i, btn));
    optionsEl.appendChild(btn);
  });

  nextBtn.textContent = (idx === QUESTIONS.length - 1) ? "Finish" : "Next";
}

function pick(i){
  if (locked) return;
  locked = true;
  pickedIndex = i;

  const q = QUESTIONS[idx];
  const ok = i === q.correctIndex;
  if (ok) correct += 1;

  // mark buttons
  const buttons = [...optionsEl.querySelectorAll("button")];
  buttons.forEach((b, bi) => {
    b.disabled = true;
    if (bi === q.correctIndex) b.classList.add("isCorrect");
    if (bi === i && !ok) b.classList.add("isWrong");
  });

  // show Next with glow
  nextBtn.classList.add("isShow");
  progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;
}

nextBtn.addEventListener("click", () => {
  if (!locked) return; // must answer before next
  if (idx < QUESTIONS.length - 1){
    idx += 1;
    render();
  } else {
    finish();
  }
});

// ===== Result =====
function finish(){
  const total = QUESTIONS.length;
  const wrong = total - correct;
  const accuracy = Math.round((correct / total) * 100);
  const completedAt = new Date().toISOString();

  const result = { quiz:"song", total, correct, wrong, accuracy, completedAt };
  localStorage.setItem(MB_KEYS.result, JSON.stringify(result));
  localStorage.setItem(MB_KEYS.done, "1");

  showResult(result);
}

function showResult(result){
  quizView.style.display = "none";
  resultView.style.display = "block";

  const p = getProfile();
  resName.textContent = p?.name || "Player";

  const d = new Date(result.completedAt);
  resDone.textContent = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;

  resTotal.textContent = String(result.total);
  resCorrect.textContent = String(result.correct);
  resWrong.textContent = String(result.wrong);
  resAcc.textContent = `${result.accuracy}%`;

  // ensure card zone closed by default (no giant)
  cardZone.classList.remove("isOpen");
}

// ===== Card generation (canvas, fixed size, preview scaled by CSS) =====
genBtn.addEventListener("click", async () => {
  const result = safeJSONParse(localStorage.getItem(MB_KEYS.result), null);
  if (!result) return;

  await drawCard({
    title: "MagicBlock Quiz\nSong Result",
    result,
    accent: "song",
  });
  cardZone.classList.add("isOpen");
  cardZone.scrollIntoView({ behavior:"smooth", block:"start" });
});

dlBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "magicblock-song-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

async function drawCard({ title, result }){
  const ctx = cardCanvas.getContext("2d");
  const W = cardCanvas.width, H = cardCanvas.height;

  // bg
  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, "#0b0d12");
  g.addColorStop(1, "#05060a");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // vignette
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 70, 70, W-140, H-140, 70, true, false);

  // inner
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(ctx, 110, 110, W-220, H-220, 64, true, false);

  // title
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 74px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  drawMultiline(ctx, title, 160, 230, 82);

  // profile
  const p = getProfile() || { name:"Player", avatar:"" };
  ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(p.name || "Player", 260, 520);

  // avatar circle
  await drawAvatarCircle(ctx, p.avatar, 160, 472, 74);

  // stats
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(`Correct: ${result.correct} / ${result.total}`, 160, 640);
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText(`Accuracy: ${result.accuracy}%`, 160, 710);

  const d = new Date(result.completedAt);
  const done = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "700 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Completed: ${done}`, 160, 780);

  // bottom pill
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 160, H-220, W-320, 96, 48, true, false);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "900 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("magicblock quiz card", 210, H-155);
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

function drawMultiline(ctx, text, x, y, lineH){
  const lines = String(text).split("\n");
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i*lineH));
}

async function drawAvatarCircle(ctx, dataUrl, cx, cy, r){
  // circle bg
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.clip();

  if (dataUrl && dataUrl.startsWith("data:")){
    const img = await loadImage(dataUrl);
    const size = r*2;
    ctx.drawImage(img, cx-r, cy-r, size, size);
  }
  ctx.restore();

  // border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
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

// ===== On load: if done -> show result =====
(function boot(){
  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.result), null);
  const done = localStorage.getItem(MB_KEYS.done) === "1";
  if (done && saved){
    showResult(saved);
    return;
  }
  render();
})();
