import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';

function CheckDials() {
  const values = useDialKit('Check gallery', {
    carousel: {
      rotation: [14.75, -45, 45, 0.25], perspective: [3000, 600, 3000, 25],
      skew: [0, -12, 12, 0.25], edgeScale: [0.96, 0.75, 1.15, 0.01],
      blur: [0.9, 0, 8, 0.05], edgeStart: [0.725, 0, 0.95, 0.025],
      falloff: [0.4, 0.4, 3, 0.05], scrollSpeed: [1.05, 0.1, 5, 0.05],
    },
    speedWarp: {
      enabled: true, threshold: [900, 200, 2500, 50], speedRange: [3000, 1000, 6000, 100],
      compression: [0.18, 0, 0.4, 0.01], curvature: [38, 0, 60, 1],
      depth: [120, 0, 300, 10], blur: [0.4, 0, 3, 0.1], recovery: [0.32, 0.25, 0.8, 0.025],
    },
    layout: { spacing: [1.4, 0.4, 2.5, 0.05], phoneScale: [1, 0.65, 1.2, 0.025], captionGap: [22, 0, 80, 1], textScale: [1, 0.85, 1.6, 0.025] },
    phone: { cornerExtra: [10, 0, 60, 1] },
    buttons: { verticalPadding: [7.5, 4, 24, 0.5], horizontalPadding: [13, 6, 48, 1] },
    replay: { startScale: [0.8, 0.75, 1, 0.01], blur: [6, 0, 6, 0.25], duration: [260, 100, 900, 10], bounce: [1.45, 1, 2.5, 0.05] },
    colors: { lightBackground: '#f9f9f9', darkBackground: '#111111' },
  }, { id: 'check-gallery', persist: true });

  useLayoutEffect(() => {
    const page = document.querySelector('.chessmono-horizontal-page');
    const variables = {
      '--check-spacing': values.layout.spacing,
      '--check-phone-scale': values.layout.phoneScale,
      '--check-caption-gap': `${values.layout.captionGap}px`,
      '--check-text-scale': values.layout.textScale,
      '--check-corner-extra': values.phone.cornerExtra,
      '--check-button-y': `${values.buttons.verticalPadding}px`,
      '--check-button-x': `${values.buttons.horizontalPadding}px`,
      '--check-replay-scale': values.replay.startScale,
      '--check-replay-blur': `${values.replay.blur}px`,
      '--check-replay-duration': `${values.replay.duration}ms`,
      '--check-replay-bounce': values.replay.bounce,
    };
    Object.entries(variables).forEach(([key, value]) => page.style.setProperty(key, String(value)));
    document.documentElement.style.setProperty('--check-light-background', values.colors.lightBackground);
    document.documentElement.style.setProperty('--check-dark-background', values.colors.darkBackground);
    window.checkGalleryTuning = { ...values.carousel, speedWarp: values.speedWarp };
    window.dispatchEvent(new Event('check-gallery-tune'));
  }, [values]);
  return <DialRoot productionEnabled defaultOpen position="bottom-right" />;
}
const host = document.createElement('div');
host.id = 'check-dials';
document.body.append(host);
createRoot(host).render(<CheckDials />);
