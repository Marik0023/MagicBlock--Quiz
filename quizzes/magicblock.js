const MB_KEYS = {
  profile: "mb_profile",
  doneMagic: "mb_done_magicblock",
  resMagic: "mb_result_magicblock",
  prevMagic: "mb_prev_magicblock",

  // progress (resume)
  progMagic: "mb_prog_magicblock",          // answered count (store only when >0)
  progMagicState: "mb_prog_magicblock_state",
};

const QUIZ_CARD = {
  title: "How well do you know MagicBlock?",
  idPrefix: "MagicStudent",
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

function makeSerial(len = 6){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function ensureResultId(prefix, existing){
  if (existing && typeof existing === "string" && existing.startsWith("MB-")) return existing;
  return `MB-${prefix}-${makeSerial(6)}`;
}

function hasAnyAnswer(answers){
  return Array.isArray(answers) && answers.some(v => Number.isFinite(v));
}

/* ===== Progress helpers (MagicBlock) ===== */
function saveProgressMagic(idx0, correct, answers){
  const answered = Math.max(0, Math.min(9, Number(idx0) || 0));

  if (answered <= 0 && !hasAnyAnswer(answers)){
    clearProgressMagic();
    return;
  }

  localStorage.setItem(MB_KEYS.progMagic, String(answered));
  localStorage.setItem(MB_KEYS.progMagicState, JSON.stringify({
    idx: Math.max(0, Math.min(9, Number(idx0) || 0)),
    correct: Number.isFinite(correct) ? correct : 0,
    answers: Array.isArray(answers) ? answers : []
  }));
}
function loadProgressMagic(){
  const n = Number(localStorage.getItem(MB_KEYS.progMagic) || "0");
  const state = safeJSONParse(localStorage.getItem(MB_KEYS.progMagicState), null);
  if (!Number.isFinite(n) || n <= 0) return null;

  const idx = Number.isFinite(state?.idx) ? state.idx : n;
  const correct = state?.correct;
  const answers = state?.answers;

  return {
    idx: Math.max(0, Math.min(9, idx)),
    correct: Number.isFinite(correct) ? correct : 0,
    answers: Array.isArray(answers) ? answers : []
  };
}
function clearProgressMagic(){
  localStorage.removeItem(MB_KEYS.progMagic);
  localStorage.removeItem(MB_KEYS.progMagicState);
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  const QUESTIONS = [
    { text: "MagicBlock is…", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "MagicBlock helps with…", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { text: "MagicBlock is built for…", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { text: "MagicBlock main focus is…", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { text: "Question 5", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "Question 6", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { text: "Question 7", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { text: "Question 8", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { text: "Question 9", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "Question 10", options: ["A", "B", "C", "D"], correctIndex: 1 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const progressText = document.getElementById("progressText");
  const questionText = document.getElementById("questionText");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  // ✅ progress DOM
  const quizProg = document.getElementById("quizProg");
  const progFill = document.getElementById("quizProgFill");
  const progPct  = document.getElementById("quizProgPct");

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
  let answers = [];

  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
  const done = localStorage.getItem(MB_KEYS.doneMagic) === "1";

  if (done && saved){
    if (!saved.id){
      saved.id = ensureResultId(QUIZ_CARD.idPrefix, saved.id);
      localStorage.setItem(MB_KEYS.resMagic, JSON.stringify(saved));
    }
    clearProgressMagic();
    showResult(saved);
  } else {
    const prog = loadProgressMagic();
    if (prog){
      idx = prog.idx;
      correct = prog.correct;
      answers = prog.answers;
    }
    renderQuestion();
  }

  window.addEventListener("beforeunload", () => {
    if (localStorage.getItem(MB_KEYS.doneMagic) !== "1"){
      saveProgressMagic(idx, correct, answers);
    }
  });

  function updateQuizProgressUI(){
    if (!quizProg || !progFill || !progPct) return;

    const total = QUESTIONS.length;
    const answered = Math.max(0, Math.min(idx, total));

    if (answered <= 0){
      quizProg.style.display = "none";
      progFill.style.width = "0%";
      progPct.textContent = "0%";
      return;
    }

    const pct = Math.round((answered / total) * 100);
    quizProg.style.display = "flex";
    progFill.style.width = `${pct}%`;
    progPct.textContent = `${pct}%`;
  }

  function renderQuestion(){
    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    const q = QUESTIONS[idx];
    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;
    questionText.textContent = q.text;

    updateQuizProgressUI();

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

    saveProgressMagic(idx, correct, answers);
  }

  function updateSelectedUI(){
    [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, i) => {
      b.classList.toggle("isSelected", i === selectedIndex);
    });
  }

  nextBtn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    const q = QUESTIONS[idx];
    answers[idx] = selectedIndex;

    if (selectedIndex === q.correctIndex) correct++;

    idx++;
    if (idx < QUESTIONS.length){
      saveProgressMagic(idx, correct, answers);
      renderQuestion();
      return;
    }

    const total = QUESTIONS.length;
    const acc = Math.round((correct / total) * 100);
    const p = getProfile();

    const old = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    const id = ensureResultId(QUIZ_CARD.idPrefix, old?.id || null);

    const result = {
      total, correct, acc,
      name: p?.name || "Player",
      id,
      ts: Date.now()
    };

    localStorage.setItem(MB_KEYS.doneMagic, "1");
    localStorage.setItem(MB_KEYS.resMagic, JSON.stringify(result));

    clearProgressMagic();
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

  genBtn?.addEventListener("click", async () => {
    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    if (!r || !cardCanvas) return;

    await drawQuizResultCard(cardCanvas, {
      title: QUIZ_CARD.title,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || ensureResultId(QUIZ_CARD.idPrefix, null),
      logoSrc: "../assets/logo.webm",
    });

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;

    try{
      const prev = exportPreviewDataURL(cardCanvas, 520, 0.85);
      localStorage.setItem(MB_KEYS.prevMagic, prev);
      localStorage.removeItem("mb_png_magicblock");
    }catch(e){
      console.warn("MagicBlock preview save failed:", e);
      try{ localStorage.removeItem(MB_KEYS.prevMagic); }catch{}
    }

    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    if (!r) return;

    await drawQuizResultCard(cardCanvas, {
      title: QUIZ_CARD.title,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || ensureResultId(QUIZ_CARD.idPrefix, null),
      logoSrc: "../assets/logo.webm",
    });

    const a = document.createElement("a");
    a.download = "magicblock-knowledge-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  restoreQuizPreview(MB_KEYS.prevMagic, cardCanvas, cardZone, dlBtn, genBtn);
});

/* ===== preview + canvas helpers (same as yours) ===== */
async function restoreQuizPreview(previewKey, cardCanvas, cardZone, dlBtn, genBtn){
  const prev = localStorage.getItem(previewKey);
  if (!prev || !prev.startsWith("data:image/") || !cardCanvas) return false;

  try{
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = prev;
    });

    cardCanvas.width = img.naturalWidth || img.width;
    cardCanvas.height = img.naturalHeight || img.height;

    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0,0,cardCanvas.width,cardCanvas.height);
    ctx.drawImage(img, 0, 0);

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;
    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    return true;
  }catch(e){
    console.warn("restore magicblock preview failed:", e);
    return false;
  }
}

function exportPreviewDataURL(srcCanvas, maxW = 520, quality = 0.85) {
  const w = srcCanvas.width;
  const scale = Math.min(1, maxW / w);

  const tw = Math.round(w * scale);
  const th = Math.round(srcCanvas.height * scale);

  const t = document.createElement("canvas");
  t.width = tw;
  t.height = th;

  const ctx = t.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, tw, th);

  return t.toDataURL("image/jpeg", quality);
}

/* === drawQuizResultCard + helpers залишаються твої (без змін) === */
/* нижче просто залиш як у тебе: drawQuizResultCard, drawRoundedRect, fitText, drawAvatarRounded, loadWebmFrameAsBitmap, addNoise, renderTopProfile ... */

function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
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
