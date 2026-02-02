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
