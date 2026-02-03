const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
};

function safeJSONParse(v, fallback = null){
  try { return JSON.parse(v); } catch { return fallback; }
}

function getProfile(){
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}
function setProfile(profile){
  localStorage.setItem(MB_KEYS.profile, JSON.stringify(profile));
}

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

// --- assets prefix (root vs /quizzes/*) ---
const MB_ASSET_PREFIX = location.pathname.includes("/quizzes/") ? "../assets/" : "assets/";
const MB_AVATAR_PLACEHOLDER = MB_ASSET_PREFIX + "avatar-placeholder.jpg";

// ====== Year ======
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// ====== Topbar profile pill render ======
function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const avatarImg = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = getProfile();

  const hasAvatar = !!(p?.avatar && p.avatar.startsWith("data:"));

  if (avatarImg){
    avatarImg.src = hasAvatar ? p.avatar : MB_AVATAR_PLACEHOLDER;
    avatarImg.classList.toggle("isPlaceholder", !hasAvatar);
  }

  if (!p){
    if (nameEl) nameEl.textContent = "Create profile";
    if (hintEl) hintEl.textContent = "Click to set";
    return;
  }

  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit";
}

// ====== Profile modal logic ======
function openProfileModal(force = false){
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  modal.classList.add("isOpen");

  const p = getProfile();

  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const preview = document.getElementById("profilePreview");
  const avatarBox = document.getElementById("avatarBox");
  const startBtn = document.getElementById("profileSaveBtn");

  if (nameInput) nameInput.value = p?.name || "";
  if (fileInput) fileInput.value = "";

  // Preview avatar: profile avatar або placeholder
  const hasAvatar = !!(p?.avatar && p.avatar.startsWith("data:"));
  if (preview){
    preview.src = hasAvatar ? p.avatar : MB_AVATAR_PLACEHOLDER;
    preview.dataset.isPlaceholder = hasAvatar ? "0" : "1";
  }
  if (avatarBox){
    avatarBox.classList.toggle("isPlaceholder", !hasAvatar);
  }

  // when forced and no profile, disable close X
  const closeBtn = document.getElementById("profileCloseBtn");
  if (closeBtn){
    closeBtn.style.display = (force && !p) ? "none" : "flex";
  }

  if (startBtn) startBtn.disabled = false;
}

function closeProfileModal(){
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  modal.classList.remove("isOpen");
}

function initProfileModal(){
  const modal = document.getElementById("profileModal");
  if (!modal) return;

  const closeBtn = document.getElementById("profileCloseBtn");
  const saveBtn = document.getElementById("profileSaveBtn");
  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const uploadBtn = document.getElementById("profileUploadBtn");
  const preview = document.getElementById("profilePreview");
  const avatarBox = document.getElementById("avatarBox");

  closeBtn?.addEventListener("click", closeProfileModal);

  // важливо: тільки ОДНЕ відкриття file picker
  uploadBtn?.addEventListener("click", () => {
    fileInput?.click();
  });

  fileInput?.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataURL(f);

    if (preview){
      preview.src = dataUrl;
      preview.dataset.isPlaceholder = "0";
    }
    avatarBox?.classList.remove("isPlaceholder");
  });

  saveBtn?.addEventListener("click", () => {
    const pOld = getProfile() || {};
    const name = (nameInput?.value || "").trim() || "Player";

    // якщо preview = placeholder -> не зберігаємо як аватар, беремо старий (або пусто)
    const isPlaceholder = preview?.dataset?.isPlaceholder === "1";
    const avatar = isPlaceholder ? (pOld.avatar || "") : (preview?.src || (pOld.avatar || ""));

    setProfile({ name, avatar });
    renderTopProfile();
    closeProfileModal();
  });

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
}

// ====== Quiz cards (home) ======
function isDone(key){ return localStorage.getItem(key) === "1"; }

function updateBadges(){
  const map = {
    song: MB_KEYS.doneSong,
    movie: MB_KEYS.doneMovie,
    magicblock: MB_KEYS.doneMagic,
  };

  let allDone = true;

  Object.entries(map).forEach(([k, storageKey]) => {
    const done = isDone(storageKey);
    if (!done) allDone = false;

    const badge = document.querySelector(`[data-badge="${k}"]`);
    if (badge) badge.style.display = done ? "inline-flex" : "none";

    const btn = document.querySelector(`[data-start="${k}"]`);
    if (btn) btn.textContent = done ? "Open" : "Start";
  });

  const champ = document.getElementById("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";
}

function initHomeButtons(){
  const pill = document.getElementById("profilePill");
  if (pill) pill.addEventListener("click", () => openProfileModal(false));

  document.querySelectorAll("[data-start]").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-start");
      if (k === "song") location.href = "quizzes/song.html";
      if (k === "movie") location.href = "quizzes/movie.html";
      if (k === "magicblock") location.href = "quizzes/magicblock.html";
    });
  });

  const champBtn = document.getElementById("openChampionBtn");
  champBtn?.addEventListener("click", () => location.href = "champion.html");
}

// ====== Bootstrap (home only) ======
renderTopProfile();
initProfileModal();
updateBadges();
initHomeButtons();

const mustCreate = document.body.getAttribute("data-require-profile") === "1";
if (mustCreate && !getProfile()){
  openProfileModal(true);
}
