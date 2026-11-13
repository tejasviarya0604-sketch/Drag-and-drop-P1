function fitPrototypeDesktop() {
  const desktop = document.getElementById('prototype-desktop');
  const scale = Math.min(window.innerWidth / desktop.clientWidth, window.innerHeight / desktop.clientHeight);
  desktop.style.setProperty('--desktop-scale', scale);
}

fitPrototypeDesktop();
window.addEventListener('resize', fitPrototypeDesktop);
