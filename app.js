const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// Autoplay helper for ALL matches
function forcePlayAll(selector){
  const videos = document.querySelectorAll(selector);
  if (!videos.length) return;

  const tryPlay = () => {
    videos.forEach(v => v.play().catch(() => {}));
  };

  tryPlay();
  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}

forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");
forcePlayAll(".resultLogo");

// Completed badges on Home + Champion unlock
function isDone(key){
  return localStorage.getItem(key) === "1";
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

    const badge = document.querySelector(`[data-badge="${k}"]`);
    if (badge) badge.style.display = done ? "inline-flex" : "none";

    const card = document.getElementById(`card-${k}`);
    if (card) card.classList.toggle("card--done", done);

    const btn = document.querySelector(`[data-start="${k}"]`);
    if (btn && done) btn.textContent = "Open";
  });

  const champ = document.getElementById("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";
}

updateBadges();
