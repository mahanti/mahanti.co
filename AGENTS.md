# Share images

Public pages use the Link Previews editor to make Open Graph and X share images.

- Update `_data/link_previews.json` when adding, moving, or removing a public page. Give a new page a stable ID, its real title and path, and a source from the page itself if it has imagery. Copy sources into `scripts/link-previews/sources/`. Keep the original ID when moving a page. When removing a page, remove its entry and flag the unused PNG for review.
- Run `node scripts/link-previews/server.mjs` and open `http://127.0.0.1:4178/link-previews`. Check the draft and save it. Re-save when the title or the main image changes. Confirm `og/<id>.png` exists before reporting it as done.
- Pages using `_includes/head.html` get metadata automatically. Standalone HTML pages need Jekyll front matter and `{% include link-preview.html %}` in the head. Jekyll picks up saves on the next build.
- Keep the editor, its routes, and its sources local. Jekyll excludes `scripts/` from the published site.
