#mahanti.github.io

Personal site.
Development started March 2015.

## Link previews

Run `node scripts/link-previews/server.mjs` with Node.js 18.13 or later, then open
[Link Previews](http://127.0.0.1:4178/link-previews). Pick a page to edit its
title, crop, or source, or open Template to try a different design. Save writes the
PNG to `og/` and updates `_data/link_previews.json`. Jekyll reads that data on its
next build. The development editor and its source images live in the excluded
`scripts/` directory.

The images use the site's Allo font stack. Install Allo locally for captures
that use it. Otherwise, the browser uses the next available font in the stack.
