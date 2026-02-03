const DONE_KEY  = "mb_done_movie";
const SCORE_KEY = "mb_score_movie";
const TOTAL_KEY = "mb_total_movie";
const WHEN_KEY  = "mb_when_movie";

const PROFILE_NAME_KEY = "mb_profile_name";
const PROFILE_AVATAR_KEY = "mb_profile_avatar";

const letters = ["A", "B", "C", "D"];

// Put your images into: /assets/movies/
// Example names: 01.jpg ... 10.jpg (or .png)
const questions = [
  { frame: "../assets/movies/01.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { frame: "../assets/movies/02.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { frame: "../assets/movies/03.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { frame: "../assets/movies/04.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { frame: "../assets/movies/05.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { frame: "../assets/movies/06.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { frame: "../assets/movies/07.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { frame: "../assets/movies/08.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { frame: "../assets/movies/09.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { frame: "../assets/movies/10.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
];

let idx = 0;
let correct = 0;
let selectedIndex = null;

const frameEl = document.getElementById("frame");
const choicesEl = document.getElementById("choices");
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
const resultWhen = document.getElementById("resultWhen");
const resultName = document.getElementById("resultName");
const resultAvatar = document.getElementById("resultAvatar");

const genCardBtn = document.getElementById("genCard");

function nowText(){ return new Date().toLocaleString(); }

function setNextText(){
  nextBtn.textContent = (idx === questions.length - 1) ? "Finish →" : "Next →";
}

function popNext(){
  nextBtn.classList.remove("is-pop");
  void nextBtn.offsetWidth;
  nextBtn.classList.add("is-pop");
}

function clearSelectionUI(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.classList.remove("selected"));
}

function render(){
  selectedIndex = null;
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Progress: ${idx} / ${questions.length}`;

  nextBtn.style.display = "none";
  nextBtn.classList.remove("is-pop");

  frameEl.src = q.frame;

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

function pick(i){
  selectedIndex = i;
  clearSelectionUI();
  const btn = choicesEl.querySelectorAll("button")[i];
  if (btn) btn.classList.add("selected");

  setNextText();
  nextBtn.style.display = "inline-flex";
  popNext();
}

function next(){
  if (selectedIndex === null) return;

  const q = questions[idx];
  if (selectedIndex === q.correctIndex) correct += 1;

  if (idx < questions.length - 1){
    idx += 1;
    render();
  } else {
    finish();
  }
}

function showResult(){
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
  resultWhen.textContent = when ? `Completed: ${when}` : "";

  const name = (localStorage.getItem(PROFILE_NAME_KEY) || "Player").trim() || "Player";
  const avatar = localStorage.getItem(PROFILE_AVATAR_KEY) || "";

  resultName.textContent = name;
  if (avatar) {
    resultAvatar.src = avatar;
    resultAvatar.style.display = "block";
  } else {
    resultAvatar.style.display = "none";
  }
}

function finish(){
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem(SCORE_KEY, String(correct));
  localStorage.setItem(TOTAL_KEY, String(questions.length));
  localStorage.setItem(WHEN_KEY, nowText());
  showResult();
}

function boot(){
  if (localStorage.getItem(DONE_KEY) === "1"){
    lockedMsg.style.display = "block";
    lockedMsg.textContent = "You already completed this quiz.";
    showResult();
  } else {
    nextBtn.addEventListener("click", next);
    render();
  }

  if (genCardBtn) {
    genCardBtn.addEventListener("click", async () => {
      const total = Number(localStorage.getItem(TOTAL_KEY) || questions.length);
      const c = Number(localStorage.getItem(SCORE_KEY) || correct);
      const scoreText = `Score: ${c} / ${total}`;

      if (typeof window.MB_generateQuizCard === "function") {
        await window.MB_generateQuizCard({ quizTitle: "Guess the Movie", scoreText });
      }
    });
  }
}

boot();
