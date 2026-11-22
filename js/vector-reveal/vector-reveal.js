import { makeLayers } from './geometry.js';

const css = new URL('./vector-reveal.css?v=hover-divider', import.meta.url);
const clamp = value => Math.max(0, Math.min(100, value));

class VectorReveal extends HTMLElement {
  static observedAttributes = ['src', 'position'];
  #request;
  #pointer;
  #position = 50;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <link rel="stylesheet" href="${css}">
      <div class="stage" role="slider" tabindex="0" aria-label="Filled artwork" aria-valuemin="0" aria-valuemax="100">
        <div class="layer filled" aria-hidden="true"></div>
        <div class="layer drawing" aria-hidden="true"></div>
        <div class="divider" aria-hidden="true"></div>
      </div>
      <span role="status"></span>`;
    const stage = root.querySelector('.stage');
    let touchStart;
    const move = event => {
      const rect = stage.getBoundingClientRect();
      this.position = (event.clientX - rect.left) / rect.width * 100;
    };
    stage.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      this.#pointer = event.pointerId;
      stage.setPointerCapture(event.pointerId);
      stage.toggleAttribute('data-touching', event.pointerType !== 'mouse');
      if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
      else move(event);
    });
    stage.addEventListener('pointermove', event => {
      if (event.pointerId !== this.#pointer && !(event.pointerType === 'mouse' && this.hasAttribute('follow-hover'))) return;
      if (touchStart) {
        const dx = Math.abs(event.clientX - touchStart.x);
        if (dx < 4 || dx < Math.abs(event.clientY - touchStart.y)) return;
        touchStart = undefined;
      }
      move(event);
    });
    stage.addEventListener('pointerup', event => {
      if (event.pointerId !== this.#pointer) return;
      move(event);
      this.#commit();
    });
    stage.addEventListener('lostpointercapture', () => {
      stage.removeAttribute('data-touching');
      this.#pointer = undefined;
      touchStart = undefined;
    });
    stage.addEventListener('pointerleave', event => {
      if (this.#pointer === undefined && event.pointerType === 'mouse' && this.hasAttribute('follow-hover')) this.#commit();
    });
    stage.addEventListener('keydown', event => {
      const step = event.shiftKey ? 10 : 1;
      const positions = { ArrowRight: this.position + step, ArrowLeft: this.position - step, ArrowUp: this.position + step, ArrowDown: this.position - step, Home: 0, End: 100 };
      if (!Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      this.position = positions[event.key];
      this.#commit();
    });
  }

  get position() { return this.#position; }
  set position(value) {
    if (!Number.isFinite(Number(value))) return;
    this.#position = Math.round(clamp(Number(value)) * 100) / 100;
    const stage = this.shadowRoot.querySelector('.stage');
    stage.style.setProperty('--split', this.#position + '%');
    stage.setAttribute('aria-valuenow', String(Math.round(this.#position)));
    stage.setAttribute('aria-valuetext', Math.round(this.#position) + '% filled');
  }

  connectedCallback() {
    this.position = this.getAttribute('position') ?? this.position;
    this.#load();
  }
  disconnectedCallback() { this.#request?.abort(); }
  attributeChangedCallback(name, old, value) {
    if (old === value) return;
    if (name === 'position') this.position = value ?? 50;
    if (name === 'src' && this.isConnected) this.#load();
  }
  #commit() { this.dispatchEvent(new Event('change', { bubbles: true })); }

  async #load() {
    this.#request?.abort();
    const request = this.#request = new AbortController();
    const status = this.shadowRoot.querySelector('[role="status"]');
    const layers = [...this.shadowRoot.querySelectorAll('.layer')];
    for (const layer of layers) layer.replaceChildren();
    status.textContent = '';
    if (!this.hasAttribute('src')) return;
    try {
      const response = await fetch(this.getAttribute('src'), { signal: request.signal });
      if (!response.ok) throw new Error(response.statusText);
      const text = await response.text();
      if (request.signal.aborted) return;
      const artwork = makeLayers(text);
      layers.forEach((layer, i) => layer.replaceChildren(artwork[i]));
    } catch (error) {
      if (!request.signal.aborted) status.textContent = 'This vector could not be loaded.';
    }
  }
}

customElements.define('vector-reveal', VectorReveal);
