// Exact Display P3 components from Approach's Assets.xcassets/Core Colors/
// Approach*.colorset/Contents.json (universal/light appearance).
(() => {
  const palette = [
    [0, 138, 255], // ApproachBlue
    [125, 75, 40], // ApproachBrown
    [80, 90, 0], // ApproachDarkGreen
    [235, 80, 120], // ApproachFuschia
    [241, 163, 59], // ApproachGold
    [70, 144, 14], // ApproachGreen
    [120, 188, 58], // ApproachLime
    [235, 115, 0], // ApproachOrange
    [145, 40, 150], // ApproachPurple
    [238, 58, 36], // ApproachRed
    [220, 185, 140], // ApproachTan
    [156, 225, 222], // ApproachTeal
    [255, 184, 5], // ApproachYellow
  ].map(rgb => `color(display-p3 ${rgb.map(value => value / 255).join(' ')})`);
  if (!CSS.supports('color', palette[0])) return;
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');

  document.querySelectorAll('.logo-link').forEach(link => {
    let lastIndex = -1;
    let pointerInside = false;
    let keyboardFocused = false;

    function chooseColor() {
      // Uniform selection among every color except the previous one.
      let index = Math.floor(Math.random() * (palette.length - (lastIndex >= 0 ? 1 : 0)));
      if (lastIndex >= 0 && index >= lastIndex) index += 1;
      lastIndex = index;
      link.style.setProperty('--logo-play-color', palette[index]);
    }
    function render() {
      link.classList.toggle('logo-playful', pointerInside || keyboardFocused);
    }
    link.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || !hover.matches) return;
      pointerInside = true;
      chooseColor();
      render();
    });
    const leave = () => { pointerInside = false; render(); };
    link.addEventListener('pointerleave', leave);
    link.addEventListener('pointercancel', leave);
    link.addEventListener('focus', () => {
      keyboardFocused = link.matches(':focus-visible');
      if (keyboardFocused) chooseColor();
      render();
    });
    link.addEventListener('blur', () => { keyboardFocused = false; render(); });
    link.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') {
        pointerInside = keyboardFocused = false;
        render();
      }
    });
    hover.addEventListener('change', () => { if (!hover.matches) leave(); });
    window.addEventListener('pagehide', () => {
      pointerInside = keyboardFocused = false;
      render();
    });
  });
})();
