const DONE_KEY = "mb_done_song";
const RESULT_KEY = "mb_result_song";
const PROFILE_NAME_KEY = "mb_profile_name";
const PROFILE_AVATAR_KEY = "mb_profile_avatar";

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
}

function getProfile(){
  return {
    name: localStorage.getItem(PROFILE_NAME_KEY) || "Player",
    avatar: localStorage.getItem(PROFILE_AVATAR_KEY) || ""
  };
}

function renderProfilePill(){
  const slot = document.getElementById("profileSlot");
  const nameEl = document.getElementById("profileName");
  const img = document.getElementById("profileAvatarImg");
  const fallback = document.getElementById("profileAvatarFallback");
  if (!slot || !nameEl || !img || !fallback) return;

  const { name, avatar } = getProfile();
  slot.style.display = "inline-flex";
  nameEl.textContent = name;

  if (avatar){
    img.src = avatar;
    img.style.display = "block";
    fallback.style.display = "none";
  } else {
    img.style.display = "flex";
    fallback.style.display = "flex";
    fallback.textContent = (name.slice(0,2) || "MB").toUpperCase();
  }

  slot.addEventListener("click", () => location.href = "../index.html");
}

function qs(name){ return new URLSearchParams(location.search).get(name); }

function resetIfAsked(){
  if (qs("reset") === "1"){
    localStorage.removeItem(DONE_KEY);
    localStorage.removeItem(RESULT_KEY);
    location.replace(location.pathname);
  }
}

function loadResult(){
  try{
    const raw = localStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{
    return null;
  }
}

function saveResult(result){
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

function showResultScreen(result){
  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");
  const resultText = document.getElementById("resultText");
  if (!quizPanel || !resultPanel || !resultText) return;

  quizPanel.style.display = "none";
  resultPanel.style.display = "block";

  const prof = getProfile();
  if (!result){
    resultText.innerHTML = `
      <div class="small">Saved result not found. You can reset and retake:</div>
      <div class="small"><b>Open:</b> song.html?reset=1</div>
    `;
    return;
  }

  const date = new Date(result.completedAt);
  const when = isNaN(date.getTime()) ? "" : date.toLocaleString();

  resultText.innerHTML = `
    <div class="small"><b>${prof.name}</b></div>
    <div class="small">Completed: ${when}</div>
    <div style="height:10px;"></div>
    <div class="small"><b>Total</b> ${result.total}</div>
    <div class="small"><b>Correct</b> ${result.correct}</div>
    <div class="small"><b>Wrong</b> ${result.wrong}</div>
    <div class="small"><b>Accuracy</b> ${result.accuracy}%</div>
  `;

  const genBtn = document.getElementById("genCardBtn");
  if (genBtn){
    genBtn.onclick = () => generateCard(result);
  }
}

function formatTime(sec){
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

/**
 * EDIT HERE: add your real audio + (optional) cover.
 * Put files into:
 *  - assets/songs/*.mp3
 *  - assets/covers/*.jpg (optional)
 */
const QUESTIONS = [
  { audio: "../assets/songs/01.mp3", cover: "../assets/covers/01.jpg", options: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], answer: 1 },
  { audio: "../assets/songs/02.mp3", cover: "", options: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], answer: 2 },
  { audio: "../assets/songs/03.mp3", cover: "", options: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], answer: 0 },
  { audio: "../assets/songs/04.mp3", cover: "", options: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], answer: 3 },
  { audio: "../assets/songs/05.mp3", cover: "", options: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], answer: 1 },
  { audio: "../assets/songs/06.mp3", cover: "", options: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], answer: 2 },
  { audio: "../assets/songs/07.mp3", cover: "", options: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], answer: 0 },
  { audio: "../assets/songs/08.mp3", cover: "", options: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], answer: 3 },
  { audio: "../assets/songs/09.mp3", cover: "", options: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], answer: 1 },
  { audio: "../assets/songs/10.mp3", cover: "", options: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], answer: 2 },
];

let idx = 0;
let correct = 0;
let selected = null;

function setNextVisible(visible){
  const nextBtn = document.getElementById("nextBtn");
  if (!nextBtn) return;
  if (visible){
    nextBtn.classList.add("is-visible");
  } else {
    nextBtn.classList.remove("is-visible");
    nextBtn.style.opacity = "0";
    nextBtn.style.transform = "translateY(6px)";
  }
}

function renderQuestion(){
  const q = QUESTIONS[idx];
  const qMeta = document.getElementById("qMeta");
  const progress = document.getElementById("progress");
  const audio = document.getElementById("audio");
  const coverImg = document.getElementById("coverImg");
  const choices = document.getElementById("choices");
  const nextBtn = document.getElementById("nextBtn");
  const missing = document.getElementById("missingMedia");

  if (!q || !qMeta || !progress || !audio || !choices || !nextBtn || !missing || !coverImg) return;

  qMeta.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  progress.textContent = `Progress: ${idx} / ${QUESTIONS.length}`;

  // media
  missing.style.display = "none";
  missing.textContent = "";

  audio.src = q.audio || "";
  audio.load();

  if (q.cover){
    coverImg.src = q.cover;
    coverImg.style.display = "block";
    coverImg.onerror = () => {
      coverImg.style.display = "none";
    };
  } else {
    coverImg.style.display = "none";
  }

  audio.onerror = () => {
    missing.style.display = "block";
    missing.textContent = `Audio file missing. Put mp3 to ${q.audio}`;
  };

  // answers
  choices.innerHTML = "";
  selected = null;
  nextBtn.disabled = true;
  setNextVisible(false);

  const letters = ["A", "B", "C", "D"];
  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.textContent = `${letters[i]}) ${text}`;

    btn.addEventListener("click", () => {
      selected = i;
      [...choices.children].forEach(ch => ch.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      nextBtn.disabled = false;

      // show Next with glow animation
      nextBtn.style.opacity = "1";
      nextBtn.style.transform = "translateY(0)";
      nextBtn.classList.add("is-visible");
    });

    choices.appendChild(btn);
  });

  nextBtn.onclick = () => {
    if (selected === null) return;

    if (selected === q.answer) correct += 1;

    idx += 1;
    if (idx >= QUESTIONS.length){
      finish();
    } else {
      renderQuestion();
    }
  };
}

function finish(){
  const total = QUESTIONS.length;
  const wrong = total - correct;
  const accuracy = Math.round((correct / total) * 100);

  const result = {
    quizId: "song",
    total,
    correct,
    wrong,
    accuracy,
    completedAt: new Date().toISOString()
  };

  saveResult(result);
  showResultScreen(result);
}

function generateCard(result){
  const wrap = document.getElementById("cardPreviewWrap");
  const canvas = document.getElementById("cardCanvas");
  const link = document.getElementById("downloadLink");
  if (!wrap || !canvas || !link) return;

  wrap.style.display = "block";

  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // background
  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, "#0b0b0f");
  g.addColorStop(1, "#111118");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // glow
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.ellipse(W*0.75, H*0.22, 380, 260, 0, 0, Math.PI*2);
  ctx.fill();

  // frame
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 6;
  roundRect(ctx, 48, 48, W-96, H-96, 48);
  ctx.stroke();

  const prof = getProfile();

  // title
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 72px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("MagicBlock Quiz", 90, 150);

  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Song Result", 90, 230);

  // avatar circle
  const ax = 140, ay = 360, ar = 90;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI*2);
  ctx.clip();

  if (prof.avatar){
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, ax-ar, ay-ar, ar*2, ar*2);
      ctx.restore();
      drawStats();
    };
    img.src = prof.avatar;
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(ax-ar, ay-ar, ar*2, ar*2);
    ctx.restore();
    drawStats();
  }

  function drawStats(){
    // name
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 52px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(prof.name, 260, 380);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "500 38px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(`Correct: ${result.correct} / ${result.total}`, 90, 520);
    ctx.fillText(`Accuracy: ${result.accuracy}%`, 90, 580);

    const d = new Date(result.completedAt);
    const when = isNaN(d.getTime()) ? "" : d.toLocaleString();
    ctx.fillText(`Completed: ${when}`, 90, 640);

    // button-like footer
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 90, H-220, W-180, 110, 38);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 42px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("magicblock quiz card", 140, H-150);

    const url = canvas.toDataURL("image/png");
    link.href = url;
    link.style.display = "inline-flex";
    link.textContent = "Download PNG";
  }
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

(function init(){
  resetIfAsked();
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderProfilePill();

  const done = localStorage.getItem(DONE_KEY) === "1";
  if (done){
    showResultScreen(loadResult());
    return;
  }

  renderQuestion();
})();
