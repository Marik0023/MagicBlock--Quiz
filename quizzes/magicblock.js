const QUIZ = "magicblock";
const DONE_KEY  = "mb_done_magicblock";
const SCORE_KEY = "mb_score_magicblock";
const TOTAL_KEY = "mb_total_magicblock";
const WHEN_KEY  = "mb_when_magicblock";
const NAME_KEY  = "mb_name_magicblock";
const AVATAR_KEY= "mb_avatar_magicblock";

const letters = ["A", "B", "C", "D"];

// ✅ 10 питань (ти потім просто міняєш text/choices/correctIndex)
const questions = [
  { text: "MagicBlock is…", choices: ["a quiz site", "a band", "a game", "a restaurant"], correctIndex: 0 },
  { text: "This site is hosted on…", choices: ["GitHub Pages", "Steam", "App Store", "Netflix"], correctIndex: 0 },
  { text: "A quiz question has…", choices: ["2 options", "3 options", "4 options", "10 options"], correctIndex: 2 },
  { text: "If you answer wrong, the quiz…", choices: ["restarts", "skips forward", "closes", "opens Home"], correctIndex: 1 },
  { text: "The logo is…", choices: ["static", "animated video", "a PDF", "a font"], correctIndex: 1 },
  { text: "Your result is saved in…", choices: ["localStorage", "a database", "email", "cloud"], correctIndex: 0 },
  { text: "Movie quiz uses…", choices: ["audio", "frames", "text only", "microphone"], correctIndex: 1 },
  { text: "Song quiz uses…", choices: ["audio clips", "movie frames", "camera", "chat"], correctIndex: 0 },
  { text: "Completed quizzes show…", choices: ["a lock", "a badge", "a popup", "a timer"], correctIndex: 1 },
  { text: "After finishing, you can…", choices: ["retake instantly", "edit name/avatar", "delete repo", "change background"], correctIndex: 1 },
];

let idx = 0;
let correct = 0;

const qtext = document.getElementById("qtext");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const statusEl = document.getElementById("status");
const nextBtn = document.getElementById("next");
const qCounter = document.getElementById("qCounter");
const lockedMsg = document.getElementById("lockedMsg");

const quizUI = document.getElementById("quizUI");
const resultUI = document.getElementById("resultUI");

const rTotal = document.getElementById("rTotal");
const rCorrect = document.getElementById("rCorrect");
const rWrong = document.getElementById("rWrong");
const rPercent = document.getElementById("rPercent");
const rWhen = document.getElementById("rWhen");

const playerName = document.getElementById("playerName");
const avatarFile = document.getElementById("avatarFile");
const avatarPreview = document.getElementById("avatarPreview");

function nowText(){
  const d = new Date();
  return d.toLocaleString();
}

function saveProfile(){
  localStorage.setItem(NAME_KEY, playerName.value || "");
}

function showAvatar(dataUrl){
  avatarPreview.src = dataUrl || "";
}

function loadProfile(){
  playerName.value = localStorage.getItem(NAME_KEY) || "";
  const av = localStorage.getItem(AVATAR_KEY) || "";
  showAvatar(av);
}

function lockButtons(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.disabled = true);
}

function render(){
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Score: ${correct} / ${idx}`;
  feedbackEl.textContent = "";
  nextBtn.style.display = "none";

  qtext.textContent = q.text;

  choicesEl.innerHTML = "";
  q.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "btn choiceBtn";
    btn.type = "button";
    btn.textContent = `${letters[i]}) ${text}`;
    btn.addEventListener("click", () => pick(i));
    choicesEl.appendChild(btn);
  });
}

function pick(choiceIndex){
  const q = questions[idx];
  lockButtons();

  const ok = choiceIndex === q.correctIndex;

  if (ok){
    correct += 1;
    feedbackEl.textContent = "✅ Correct!";
    nextBtn.style.display = "inline-flex";
    nextBtn.textContent = (idx === questions.length - 1) ? "Finish" : "Next";
    statusEl.textContent = `Score: ${correct} / ${idx + 1}`;
    return;
  }

  const right = `${letters[q.correctIndex]}) ${q.choices[q.correctIndex]}`;
  feedbackEl.textContent = `❌ Wrong. Correct answer: ${right}. Moving on…`;
  statusEl.textContent = `Score: ${correct} / ${idx + 1}`;

  setTimeout(next, 750);
}

function next(){
  if (idx < questions.length - 1){
    idx += 1;
    render();
  } else {
    finish();
  }
}

function finish(){
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem(SCORE_KEY, String(correct));
  localStorage.setItem(TOTAL_KEY, String(questions.length));
  localStorage.setItem(WHEN_KEY, nowText());

  showResult(true);
}

function showResult(showLockText){
  quizUI.style.display = "none";
  resultUI.style.display = "block";

  const total = Number(localStorage.getItem(TOTAL_KEY) || questions.length);
  const c = Number(localStorage.getItem(SCORE_KEY) || correct);
  const wrong = total - c;
  const percent = total ? Math.round((c / total) * 100) : 0;

  rTotal.textContent = String(total);
  rCorrect.textContent = String(c);
  rWrong.textContent = String(wrong);
  rPercent.textContent = `${percent}%`;

  const when = localStorage.getItem(WHEN_KEY) || "";
  rWhen.textContent = when ? `Completed: ${when}` : "";

  if (showLockText) {
    lockedMsg.style.display = "block";
    lockedMsg.textContent = "Quiz completed. You can’t take it again.";
  }

  loadProfile();
}

function boot(){
  if (localStorage.getItem(DONE_KEY) === "1"){
    lockedMsg.style.display = "block";
    lockedMsg.textContent = "You already completed this quiz.";
    showResult(false);
    return;
  }
  render();
}

nextBtn.addEventListener("click", next);

playerName.addEventListener("input", saveProfile);

avatarFile.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    localStorage.setItem(AVATAR_KEY, String(dataUrl));
    showAvatar(String(dataUrl));
  };
  reader.readAsDataURL(file);
});

boot();

