import '../../js/vector-reveal/vector-reveal.js?v=hover-divider';
import { createDialKit, createDialRoot } from '../../mangostudios/lib/dialkit-2.2.1/index.js';

const preview = document.querySelector('vector-reveal');
const specimens = { Connector: '/img/work/proto/connector.svg', Approach: './specimens/approach.svg', Flower: './specimens/flower.svg', Proto: './specimens/proto-logo.svg' };
const picker = document.querySelector('.specimens');
createDialRoot({ mode: 'inline', target: document.querySelector('#settings'), theme: 'light', versions: 'menu' });

const kit = createDialKit('Vector settings', {
  specimen: { type: 'select', options: Object.keys(specimens), default: 'Connector' },
  split: [12, 0, 100, 1],
  followHover: true,
  artwork: {
    scale: [1, 0.4, 1.25, 0.01], fill: '#000000',
    originalColors: false
  },
  construction: {
    _collapsed: true,
    outline: 'oklch(0.8477 0 106.65)', lineWidth: [1, 0.25, 4, 0.05],
    anchors: true, anchorSize: [8, 2, 14, 0.5],
    handles: true, handleColor: '#f35a00', handleWidth: [0.5, 0.25, 3, 0.05],
    controlSize: [4, 1, 10, 0.5]
  },
  card: {
    _collapsed: true,
    background: '#f7f7f6', aspectRatio: [1.3, 0.8, 2.5, 0.05],
    radius: [28, 0, 64, 1], divider: true, dividerColor: '#d1d1cd'
  },
  approachPhoto: {
    _collapsed: true,
    ink: '#ffffff', fillOpacity: [0.93, 0, 1, 0.01], guideOpacity: [0.90, 0, 1, 0.01],
    handleLineOpacity: [0.58, 0, 1, 0.01], dividerOpacity: [0.38, 0, 1, 0.01],
    shade: [0.14, 0, 0.6, 0.01]
  },
  reset: { type: 'action' }
}, { id: 'vector-reveal-playground-v1', persist: true, onAction: () => kit.resetValues() });

const linkedSpecimen = new URLSearchParams(location.search).get('specimen');
if (Object.hasOwn(specimens, linkedSpecimen)) kit.setValue('specimen', linkedSpecimen);

const coursePhoto = new URL('./specimens/approach-course.jpg', import.meta.url);
for (const [name, file] of Object.entries(specimens)) {
  const button = document.createElement('button');
  button.type = 'button';
  const icon = document.createElement('span');
  icon.className = 'thumb';
  icon.style.setProperty('--icon', `url("${file}")`);
  button.append(icon, name);
  button.dataset.specimen = name;
  button.addEventListener('click', () => kit.setValue('specimen', name));
  picker.append(button);
}

kit.subscribe(({ specimen, split, followHover, artwork, construction, card, approachPhoto }) => {
  const onPhoto = specimen === 'Approach';
  const src = specimens[specimen];
  if (preview.getAttribute('src') !== src) preview.setAttribute('src', src);
  preview.setAttribute('aria-label', specimen);
  for (const button of picker.children) button.setAttribute('aria-pressed', button.dataset.specimen === specimen);
  preview.position = split;
  preview.toggleAttribute('follow-hover', followHover);
  preview.toggleAttribute('source-colors', artwork.originalColors);
  preview.toggleAttribute('hide-anchors', !construction.anchors);
  preview.toggleAttribute('hide-handles', !construction.handles);
  preview.toggleAttribute('hide-divider', !card.divider);
  const styles = {
    '--art-scale': artwork.scale, '--art-fill': onPhoto ? approachPhoto.ink : artwork.fill,
    '--outline': onPhoto ? approachPhoto.ink : construction.outline, '--outline-width': construction.lineWidth + 'px',
    '--anchor-size': construction.anchorSize + 'px', '--handle-color': onPhoto ? approachPhoto.ink : construction.handleColor,
    '--handle-width': construction.handleWidth + 'px', '--control-size': construction.controlSize + 'px',
    '--paper': card.background, '--card-aspect': card.aspectRatio, '--card-radius': card.radius + 'px',
    '--divider-color': onPhoto ? approachPhoto.ink : card.dividerColor,
    '--fill-opacity': onPhoto ? approachPhoto.fillOpacity : 1,
    '--guide-opacity': onPhoto ? approachPhoto.guideOpacity : 1,
    '--handle-line-opacity': onPhoto ? approachPhoto.handleLineOpacity : 1,
    '--divider-opacity': onPhoto ? approachPhoto.dividerOpacity : 1,
    '--anchor-center': onPhoto ? approachPhoto.ink : card.background,
    '--card-image': onPhoto
      ? `linear-gradient(rgb(0 0 0 / ${approachPhoto.shade}), rgb(0 0 0 / ${approachPhoto.shade})), url("${coursePhoto}")`
      : 'none'
  };
  for (const [key, value] of Object.entries(styles)) preview.style.setProperty(key, value);
});
preview.addEventListener('change', () => kit.setValue('split', preview.position));
