/* Dependency-free, reusable <perspective-lines> element.
 * Geometry is measured from the reference in a 704 × 369 coordinate system.
 * The curve, not a per-frame easing function, creates the apparent deceleration.
 */
(() => {
  const ROWS = [
    // y, width
    [28, 356], [34.5, 374], [43.5, 388], [53.5, 401],
    [63.5, 414], [74.5, 426], [86, 440], [99.5, 453],
    [113.5, 467], [129.5, 481], [147.5, 498], [166.5, 515],
    [188, 534], [212.5, 552], [238.5, 574], [267.5, 595],
    [299.5, 619], [334, 644],
  ];
  const COUNT = ROWS.length - 1;

  // Cubic interpolation preserves continuous velocity between measured rows.
  function sample(position, axis) {
    const i = Math.min(Math.floor(position), COUNT - 1);
    const t = position - i;
    const a = ROWS[i][axis], b = ROWS[i + 1][axis];
    const before = i > 0 ? ROWS[i - 1][axis] : 2 * a - b;
    const after = i + 2 <= COUNT ? ROWS[i + 2][axis] : 2 * b - a;
    return a + .5 * t * (b - before + t * (2 * before - 5 * a + 4 * b - after + t * (3 * (a - b) + after - before)));
  }

  class PerspectiveLines extends HTMLElement {
    #canvas; #ctx; #resize; #intersection; #abort;
    #motion = matchMedia('(prefers-reduced-motion: reduce)');
    #paused = this.#motion.matches;
    #visible = false;
    #frame = 0;
    #lastTime = null;
    #phase = 0;
    #width = 0;
    #height = 0;
    #ratio = 1;
    speed = 1;

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>:host{display:block;aspect-ratio:704/369;overflow:hidden;background:#a5aac8 var(--perspective-background,none) center/cover no-repeat}canvas{display:block;width:100%;height:100%}</style><canvas aria-hidden="true"></canvas>';
      this.#canvas = root.querySelector('canvas');
      this.#ctx = this.#canvas.getContext('2d');
    }

    get paused() { return this.#paused; }
    set paused(value) {
      this.#paused = Boolean(value);
      this.#sync();
      this.dispatchEvent(new Event('playstatechange'));
    }

    connectedCallback() {
      this.#abort = new AbortController();
      const options = { signal: this.#abort.signal };
      document.addEventListener('visibilitychange', this.#sync, options);
      this.#motion.addEventListener('change', event => { this.paused = event.matches; }, options);
      window.addEventListener('resize', this.#measure, options);
      this.#resize = new ResizeObserver(this.#measure);
      this.#resize.observe(this);
      this.#intersection = new IntersectionObserver(entries => {
        this.#visible = entries[0].isIntersecting;
        this.#sync();
      });
      this.#intersection.observe(this);
    }

    disconnectedCallback() {
      this.#abort.abort();
      this.#resize.disconnect();
      this.#intersection.disconnect();
      this.#visible = false;
      this.#sync();
    }

    #measure = () => {
      const { width, height } = this.getBoundingClientRect();
      this.#width = width;
      this.#height = height;
      // Bound the backing store on high-density mobile displays.
      this.#ratio = Math.min(devicePixelRatio || 1, 2);
      this.#canvas.width = Math.max(1, Math.round(width * this.#ratio));
      this.#canvas.height = Math.max(1, Math.round(height * this.#ratio));
      this.#draw();
      this.#sync();
    };

    #sync = () => {
      const running = this.isConnected && this.#visible && !document.hidden && !this.#paused && this.#width > 0 && this.#height > 0;
      if (running && !this.#frame) {
        this.#lastTime = null;
        this.#frame = requestAnimationFrame(this.#tick);
      } else if (!running) {
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
        this.#lastTime = null;
      }
    };

    #tick = time => {
      // Elapsed time keeps the same speed at 60 / 120 Hz. Clamp interruptions.
      const delta = this.#lastTime === null ? 0 : Math.min(time - this.#lastTime, 64);
      this.#lastTime = time;
      const speed = Number.isFinite(this.speed) ? Math.max(0, this.speed) : 1;
      this.#phase = (this.#phase + delta * .0005 * speed) % 1;
      this.#draw();
      this.#frame = requestAnimationFrame(this.#tick);
    };

    #draw() {
      if (!this.#width || !this.#height) return;
      const ctx = this.#ctx;
      const sx = this.#canvas.width / 704, sy = this.#canvas.height / 369;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      // Keep the photo in CSS so only the transparent line layer is redrawn.
      ctx.clearRect(0, 0, 704, 369);
      ctx.lineWidth = .85;
      ctx.strokeStyle = '#b8b295';
      ctx.beginPath();
      for (let i = 1; i <= COUNT; i++) {
        const position = i - this.#phase;
        const y = sample(position, 0);
        const half = sample(position, 1) / 2;
        ctx.moveTo(352 - half, y);
        ctx.lineTo(352 + half, y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#c46626';
      ctx.beginPath();
      ctx.moveTo(174, 28);
      ctx.lineTo(530, 28);
      ctx.stroke();
    }
  }

  if (!customElements.get('perspective-lines')) customElements.define('perspective-lines', PerspectiveLines);
})();
