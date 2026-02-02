// Footer year
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// Some browsers need a manual play() attempt even with autoplay+muted
function forcePlay(selector){
  const v = document.querySelector(selector);
  if (!v) return;

  const tryPlay = () => v.play().catch(() => {});
  tryPlay();

  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}

forcePlay(".bg__video");
forcePlay(".brand__logo");

// Completed badges on Home
function isDone(key){
  return localStorage.getItem(key) === "1";
}

function updateBadges(){
  const map = {
    song: "mb_done_song",
    movie: "mb_done_movie",
    magicblock: "mb_done_magicblock",
  };

  document.querySelectorAll("[data-badge]").forEach(el => {
    const k = el.getAttribute("data-badge");
    const storageKey = map[k];
    if (!storageKey) return;

    const done = isDone(storageKey);
    el.style.display = done ? "inline-flex" : "none";

    const card = document.getElementById(`card-${k}`);
    if (card) {
      card.classList.toggle("card--done", done);
    }

    // Optional: change Start to "View results"
    const start = document.querySelector(`[data-start="${k}"]`);
    if (start && done) start.textContent = "View results";
  });
}

updateBadges();
