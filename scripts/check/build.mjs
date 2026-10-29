import { build } from 'esbuild';
await build({entryPoints:['scripts/check/dials.jsx'], bundle:true, minify:true, format:'esm', define:{'process.env.NODE_ENV':'"production"'}, outfile:'assets/js/check-dials.js'});
