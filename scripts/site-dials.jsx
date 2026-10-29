import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';
import './site-dials.css';

// Keep the existing static site; React owns only the tuning panel.
function SiteDials() {
  const values = useDialKit('Portfolio', {
    layout: {
      contentWidth: [640, 480, 1000, 8],
      topSpace: [96, 24, 160, 4],
      columnGap: [48, 16, 96, 4],
      headingWidth: [200, 100, 280, 4],
      itemGap: [24, 8, 48, 2],
    },
    typography: {
      size: [14, 12, 20, 0.5],
      lineHeight: [1.65, 1.3, 2, 0.05],
      titleWeight: [600, 400, 800, 100],
    },
    carousel: {
      height: [432, 240, 600, 8],
      mobileHeight: [280, 160, 400, 8],
      gap: [16, 0, 64, 2],
      radius: [32, 0, 64, 2],
      mobileRadius: [20, 0, 48, 2],
      verticalSpace: [40, 0, 80, 4],
    },
  }, { id: 'portfolio', persist: false });

  useLayoutEffect(() => {
    const style = document.documentElement.style;
    for (const [group, entries] of Object.entries(values)) {
      for (const [name, value] of Object.entries(entries)) {
        const unitless = name === 'lineHeight' || name === 'titleWeight';
        style.setProperty(`--dial-${group}-${name}`, `${value}${unitless ? '' : 'px'}`);
      }
    }
  }, [values]);
  return <DialRoot productionEnabled position="bottom-right" />;
}

const host = document.createElement('div');
host.id = 'portfolio-dials';
document.body.append(host);
createRoot(host).render(<SiteDials />);
