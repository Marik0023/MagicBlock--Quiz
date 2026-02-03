const $ = (id) => document.getElementById(id);

/* Autoplay helper */
function forcePlayAll(selector){
  const videos = document.querySelectorAll(selector);
  if (!videos.length) return;

  const tryPlay = () => videos.forEach(v => v.play().catch(() => {}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}

/* Profile storage */
const PROFILE_NAME_KEY = "mb_profile_name";
const PROFILE_AVATAR_KEY = "mb_profile_avatar"; // dataURL

function getProfile(){
  return {
    name: localStorage.getItem(PROFILE_NAME_KEY) || "",
    avatar: localStorage.getItem(PROFILE_AVATAR_KEY) || ""
  };
}
function setProfile(name, avatar){
  localStorage.setItem(PROFILE_NAME_KEY, name.trim());
  if (avatar) localStorage.setItem(PROFILE_AVATAR_KEY, avatar);
}

/* Profile UI */
function renderProfile(){
  const { name, avatar } = getProfile();

  const slot = $("profileSlot");
  const nameEl = $("profileName");
  const img = $("profileAvatarImg");
  const fallback = $("profileAvatarFallback");

  if (!slot || !nameEl || !img || !fallback) return;

  if (!name){
    slot.style.display = "none";
    return;
  }

  slot.style.display = "inline-flex";
  nameEl.textContent = name;

  if (avatar){
    img.src = avatar;
    img.style.display = "block";
    fallback.style.display = "none";
  } else {
    img.style.display = "none";
    fallback.style.display = "flex";
    fallback.textContent = (name.slice(0,2) || "MB").toUpperCase();
  }
}

function openGate(prefill = true){
  const gate = $("profileGate");
  if (!gate) return;

  gate.classList.add("is-open");
  gate.setAttribute("aria-hidden", "false");

  const { name, avatar } = getProfile();

  const nameInput = $("gateName");
  const avatarImg = $("gateAvatarImg");
  const avatarText = $("gateAvatarText");

  if (prefill && nameInput) nameInput.value = name || "";

  if (avatar && avatarImg && avatarText){
    avatarImg.src = avatar;
    avatarImg.style.display = "block";
    avatarText.style.display = "none";
  } else if (avatarImg && avatarText){
    avatarImg.style.display = "none";
    avatarText.style.display = "flex";
  }
}

function closeGate(){
  const gate = $("profileGate");
  if (!gate) return;

  gate.classList.remove("is-open");
  gate.setAttribute("aria-hidden", "true");
}

/* ✅ Done check (fix for Completed) */
function isDone(key){
  const v = localStorage.getItem(key);
  if (v === null) return false;
  // accept multiple representations
  if (v === "0" || v === "false") return false;
  return true;
}

function updateBadges(){
  const map = {
    song: "mb_done_song",
    movie: "mb_done_movie",
    magicblock: "mb_done_magicblock",
  };

  let allDone = true;

  Object.entries(map).forEach(([k, storageKey]) => {
    const done = isDone(storageKey);
    if (!done) allDone = false;

    const card = document.getElementById(`card-${k}`);
    if (card) card.classList.toggle("card--done", done);

    const btn = document.querySelector(`[data-start="${k}"]`);
    if (btn && done) btn.textContent = "Open";
    if (btn && !done) btn.textContent = "Start";
  });

  const champ = $("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";
}

/* init */
document.addEventListener("DOMContentLoaded", () => {
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();

  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  forcePlayAll(".resultLogo");

  renderProfile();
  updateBadges();

  /* Gate wiring */
  const gate = $("profileGate");
  if (gate){
    const require = document.body.getAttribute("data-require-profile") === "1";
    const { name } = getProfile();
    if (require && !name) openGate(false);

    const closeBtn = $("gateClose");
    if (closeBtn){
      closeBtn.addEventListener("click", () => {
        const { name: n } = getProfile();
        if (require && !n) return;
        closeGate();
      });
    }

    const avatarInput = $("gateAvatarInput");
    const avatarImg = $("gateAvatarImg");
    const avatarText = $("gateAvatarText");
    if (avatarInput){
      avatarInput.addEventListener("change", () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          if (avatarImg && avatarText){
            avatarImg.src = dataUrl;
            avatarImg.style.display = "block";
            avatarText.style.display = "none";
          }
          localStorage.setItem(PROFILE_AVATAR_KEY, dataUrl);
          renderProfile();
        };
        reader.readAsDataURL(file);
      });
    }

    const startBtn = $("gateStart");
    if (startBtn){
      startBtn.addEventListener("click", () => {
        const nameInput = $("gateName");
        const n = (nameInput?.value || "").trim();
        if (!n) return;

        setProfile(n, "");
        renderProfile();
        closeGate();
      });
    }

    const profileSlot = $("profileSlot");
    if (profileSlot){
      profileSlot.addEventListener("click", () => openGate(true));
    }
  }
});
