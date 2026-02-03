const DONE_SONG = localStorage.getItem("mb_done_song") === "1";
const DONE_MOVIE = localStorage.getItem("mb_done_movie") === "1";
const DONE_MB = localStorage.getItem("mb_done_magicblock") === "1";

const locked = document.getElementById("locked");
const unlocked = document.getElementById("unlocked");

const allDone = DONE_SONG && DONE_MOVIE && DONE_MB;

function getNum(key, fallback=0){
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
}

function setText(id, text){
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

if (!allDone){
  locked.style.display = "block";
} else {
  unlocked.style.display = "block";

  const songC = getNum("mb_score_song", 0);
  const movieC = getNum("mb_score_movie", 0);
  const mbC = getNum("mb_score_magicblock", 0);

  const songT = getNum("mb_total_song", 10);
  const movieT = getNum("mb_total_movie", 10);
  const mbT = getNum("mb_total_magicblock", 10);

  const total = songT + movieT + mbT;
  const correct = songC + movieC + mbC;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  setText("cTotal", String(total));
  setText("cCorrect", String(correct));
  setText("cPercent", `${percent}%`);

  const NAME_KEY = "mb_champion_name";
  const AVATAR_KEY = "mb_champion_avatar";

  const cName = document.getElementById("cName");
  const cAvatarFile = document.getElementById("cAvatarFile");
  const cAvatarPreview = document.getElementById("cAvatarPreview");

  cName.value = localStorage.getItem(NAME_KEY) || "";
  cName.addEventListener("input", () => {
    localStorage.setItem(NAME_KEY, cName.value || "");
  });

  cAvatarPreview.src = localStorage.getItem(AVATAR_KEY) || "";

  cAvatarFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      cAvatarPreview.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
