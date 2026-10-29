#mahanti.github.io

Personal site.
Development started March 2015.

### Live homepage tuning

The homepage mounts the React DialKit panel **Portfolio**, mirrored into Mainframe's
Properties sidebar. Layout, typography, and carousel controls start at the existing
site values; desktop and mobile image dimensions have separate controls. Mainframe
owns per-view persistence (browser-wide persistence is disabled).

Edit `scripts/site-dials.jsx` and `scripts/site-dials.css`, then run `npm ci` and
`npm run build:dials`. The generated `assets/dials/` files are checked in so the
existing Jekyll preview and deployment need no Node build step. Use DialKit's Copy
control to capture chosen values before applying them as source defaults.
