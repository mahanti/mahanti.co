import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';

function CheckDials() {
  const values = useDialKit('Check cylinder', {
    cylinder: { depth: [1, .3, 1.8, .05], perspective: [3, 1.5, 6, .1], gap: [180, 40, 320, 4] },
    layout: { videoHeight: [76, 40, 82, 1], captionGap: [22, 8, 48, 1], textSize: [14, 12, 20, 1] },
    intro: { iconSize: [64, 40, 120, 2], width: [260, 180, 360, 4], gap: [24, 12, 48, 2] },
    motion: { scrollSpeed: [1, .25, 2.5, .05], momentum: [230, 80, 600, 10] },
    resetPosition: { type: 'action', label: 'Return to intro' },
  }, { id: 'check-cylinder', onAction(path) {
    if (path === 'resetPosition') window.dispatchEvent(new Event('check-cylinder-home'));
  } });
  useLayoutEffect(() => {
    const page = document.querySelector('.chessmono-horizontal-page');
    const vars = {
      '--phone-height': `min(${values.layout.videoHeight}dvh, 760px, 165vw)`,
      '--check-caption-gap': `${values.layout.captionGap}px`,
      '--check-text-size': `${values.layout.textSize}px`,
      '--check-icon-size': `${values.intro.iconSize}px`,
      '--check-intro-width': `${values.intro.width}px`,
      '--check-intro-gap': `${values.intro.gap}px`,
    };
    Object.entries(vars).forEach(([name, value]) => page.style.setProperty(name, value));
    window.dispatchEvent(new CustomEvent('check-cylinder-tune', { detail: values }));
  }, [values]);
  return <DialRoot productionEnabled defaultOpen position="bottom-right" />;
}
const host = document.createElement('div');
host.id = 'check-dials';
document.body.append(host);
createRoot(host).render(<CheckDials />);
