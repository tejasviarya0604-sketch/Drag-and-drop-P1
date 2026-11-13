function fitPrototypeDesktop() {
  const desktop = document.getElementById('prototype-desktop');
  const { width, height } = document.documentElement.getBoundingClientRect();
  const scale = Math.min(width / Number(desktop.width), height / Number(desktop.height));
  desktop.style.width = `${width / scale}px`;
  desktop.style.height = `${height / scale}px`;
  desktop.style.setProperty('--desktop-scale', scale);
}

fitPrototypeDesktop();
window.addEventListener('resize', fitPrototypeDesktop);
