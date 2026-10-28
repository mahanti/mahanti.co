(() => {
  // The legacy 404 loader can execute the shared head scripts a second time.
  if (window.__siteClockUpdate) {
    window.__siteClockUpdate();
    return;
  }
  // Approximate sunrise/sunset in the same local time shown in the footer.
  const sunriseHour = 6;
  const sunsetHour = 18;
  const pad = value => String(value).padStart(2, '0');

  function update() {
    const now = new Date();
    const hour = now.getHours();
    const theme = hour >= sunriseHour && hour < sunsetHour ? 'day' : 'night';
    const root = document.documentElement;
    if (root.dataset.theme !== theme) root.dataset.theme = theme;

    if (document.body) {
      document.body.classList.toggle('day', theme === 'day');
      document.body.classList.toggle('night', theme === 'night');
    }
    document.querySelectorAll('[data-year]').forEach(el => {
      el.textContent = String(now.getFullYear());
    });
    document.querySelectorAll('[data-time]').forEach(clock => {
      for (const [part, value] of Object.entries({
        hours: hour, minutes: now.getMinutes(), seconds: now.getSeconds()
      })) {
        const el = clock.querySelector(`.${part}`);
        if (el) el.textContent = pad(value);
      }
    });
  }

  // Set root colors before the body paints; initialize the clock once it exists.
  window.__siteClockUpdate = update;
  update();
  document.addEventListener('DOMContentLoaded', update, { once: true });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  setInterval(update, 1000);
})();
