import { families, studies } from './studies.js';
import { drawStudy } from './renderer.js?v=orbit-layers-2';

const $ = selector => document.querySelector(selector);
const gallery=$('#gallery'), viewer=$('#viewer'), hero=$('#hero');
const heroCtx=hero.getContext('2d',{alpha:false});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const records=[], visible=new Set();
// Interleave families so the first screen shows the breadth of the collection.
const displayStudies=Array.from({length:5},(_,variant)=>studies.filter(s=>s.variant===variant)).flat();
let paused=motion.matches, speed=1, elapsed=0, last=null, raf=0, lastPaint=-Infinity;
let selection=null, opener=null, filtered=displayStudies;
let rendererSource;
const pad=id=>String(id).padStart(3,'0');

for(const [id,label] of families) {
  const option=document.createElement('option');option.value=id;option.textContent=label;$('#family').append(option);
}
for(const study of displayStudies) {
  const button=document.createElement('button');
  button.className='study';button.type='button';button.dataset.id=study.id;
  button.setAttribute('aria-label',`${pad(study.id)}. ${study.name}, ${study.label}. Open study`);
  button.style.setProperty('--surface',study.background);button.style.setProperty('--accent',study.accent);
  button.innerHTML=`<span class="swatch"><canvas width="1" height="1" aria-hidden="true"></canvas><span class="expand" aria-hidden="true">↗</span></span><span class="study-meta"><span class="study-name">${study.name}</span><span class="study-number">${pad(study.id)}</span></span><span class="study-family"><span class="accent-dot"></span>${study.label}</span>`;
  const canvas=button.querySelector('canvas');
  const record={study,button,canvas,ctx:canvas.getContext('2d',{alpha:false}),width:0,height:0};
  records.push(record);gallery.append(button);
  button.addEventListener('click',()=>openStudy(study,button));
}
const byCanvas=new Map(records.map(r=>[r.canvas,r]));
function size(record) {
  const box=record.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);
  const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
  if(record.canvas.width!==width||record.canvas.height!==height){record.canvas.width=width;record.canvas.height=height;}
  record.width=width;record.height=height;
}
function paint(record) { drawStudy(record.ctx,record.width,record.height,record.study,elapsed+record.study.id*.31); }
function sizeHero() {
  if(!viewer.open||!selection)return;
  const box=hero.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  hero.width=Math.max(1,Math.round(box.width*ratio));hero.height=Math.max(1,Math.round(box.height*ratio));
  paintHero();
}
function paintHero() { if(selection)drawStudy(heroCtx,hero.width,hero.height,selection,elapsed+selection.id*.31); }
function drawVisible() { if(viewer.open)paintHero();else for(const r of visible)paint(r); }
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const r=byCanvas.get(entry.target);if(entry.isIntersecting&&!r.button.hidden){visible.add(r);size(r);paint(r);}else{visible.delete(r);r.canvas.width=1;r.canvas.height=1;}}
  schedule();
},{threshold:0});
records.forEach(r=>observer.observe(r.canvas));
const resize=new ResizeObserver(entries=>{
  for(const entry of entries){const r=byCanvas.get(entry.target);if(r&&visible.has(r)){size(r);paint(r);}else if(entry.target===hero)sizeHero();}
});
records.forEach(r=>resize.observe(r.canvas));resize.observe(hero);

function schedule() {
  const running=!paused&&!document.hidden&&(viewer.open||visible.size>0);
  if(running&&!raf){last=null;lastPaint=-Infinity;raf=requestAnimationFrame(tick);}
  else if(!running){cancelAnimationFrame(raf);raf=0;last=null;}
}
function tick(now) {
  if(last!==null)elapsed+=Math.min(now-last,80)/1000*speed;
  last=now;
  // Swatches run at 30 fps; the focused study follows the display refresh rate.
  if(viewer.open||now-lastPaint>=1000/30-1){drawVisible();lastPaint=now;}
  raf=requestAnimationFrame(tick);
}
function updatePlayback() {
  $('#pause').textContent=paused?'Play all':'Pause all';
  $('#viewer-pause').textContent=paused?'Play':'Pause';
  schedule();
}
$('#pause').addEventListener('click',()=>{paused=!paused;updatePlayback();});
$('#viewer-pause').addEventListener('click',()=>{paused=!paused;updatePlayback();});
$('#speed').addEventListener('change',event=>{speed=Number(event.target.value);});
motion.addEventListener('change',event=>{paused=event.matches;updatePlayback();});
document.addEventListener('visibilitychange',schedule);
window.addEventListener('resize',()=>{for(const r of visible)size(r);sizeHero();drawVisible();});

function filter() {
  const query=$('#search').value.trim().toLowerCase(),family=$('#family').value;
  filtered=displayStudies.filter(s=>(family==='all'||s.family===family)&&`${s.name} ${s.label} ${pad(s.id)}`.toLowerCase().includes(query));
  const ids=new Set(filtered.map(s=>s.id));
  for(const r of records){r.button.hidden=!ids.has(r.study.id);if(r.button.hidden){visible.delete(r);r.canvas.width=1;r.canvas.height=1;}}
  $('#count').textContent=`${filtered.length} ${filtered.length===1?'study':'studies'}`;
  $('#empty').hidden=filtered.length>0;schedule();
}
$('#search').addEventListener('input',filter);$('#family').addEventListener('change',filter);
$('#clear').addEventListener('click',()=>{$('#search').value='';$('#family').value='all';filter();$('#search').focus();});

function openStudy(study,button=null) {
  if(study.family==='particles'&&study.variant===1){location.href='../orbit-cloud/';return;}
  selection=study;if(button)opener=button;
  $('#viewer-index').textContent=`${pad(study.id)} / 100 — ${study.label}`;
  $('#viewer-title').textContent=study.name;$('#viewer-description').textContent=study.description;
  $('#color-chip').style.background=study.accent;$('#color-chip').title=study.accent;
  $('#export-status').textContent='';
  if(!viewer.open){viewer.showModal();document.body.style.overflow='hidden';}
  history.replaceState(null,'',`#study-${pad(study.id)}`);
  sizeHero();schedule();
}
function step(direction) {
  const pool=filtered.length?filtered:studies;
  const current=pool.findIndex(s=>s.id===selection.id);
  openStudy(pool[(current+direction+pool.length)%pool.length]);
}
$('#previous').addEventListener('click',()=>step(-1));$('#next').addEventListener('click',()=>step(1));
$('#close').addEventListener('click',()=>viewer.close());
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
viewer.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();step(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
});
viewer.addEventListener('close',()=>{
  document.body.style.overflow='';selection=null;
  history.replaceState(null,'',location.pathname+location.search);
  if(opener&&!opener.hidden)opener.focus({preventScroll:true});
  drawVisible();schedule();
});

$('#download').addEventListener('click',async()=>{
  const study=selection,button=$('#download');button.disabled=true;
  try {
    if(!rendererSource){const response=await fetch('./renderer.js?v=orbit-layers-2');if(!response.ok)throw new Error('Renderer unavailable');rendererSource=(await response.text()).replace('export function drawStudy','function drawStudy');}
    const source=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${study.name}</title><style>html,body{margin:0;background:${study.background};height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}button{position:fixed;bottom:20px;left:20px;background:#222;color:white;border:1px solid #555;border-radius:4px;padding:8px 12px;cursor:pointer}</style><canvas aria-label="${study.name}: ${study.description}" role="img"></canvas><button>Pause</button><script>${rendererSource}\nconst study=${JSON.stringify(study)},canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:false}),button=document.querySelector('button'),motion=matchMedia('(prefers-reduced-motion: reduce)');let time=0,last=null,frame=0,paused=motion.matches;function paint(){drawStudy(ctx,canvas.width,canvas.height,study,time)}function size(){canvas.width=innerWidth*Math.min(devicePixelRatio||1,2);canvas.height=innerHeight*Math.min(devicePixelRatio||1,2);paint()}function tick(now){if(last!==null)time+=Math.min(now-last,80)/1000;last=now;paint();frame=requestAnimationFrame(tick)}function sync(){cancelAnimationFrame(frame);last=null;button.textContent=paused?'Play':'Pause';if(!paused&&!document.hidden)frame=requestAnimationFrame(tick)}button.onclick=()=>{paused=!paused;sync()};motion.addEventListener('change',e=>{paused=e.matches;sync()});addEventListener('resize',size);document.addEventListener('visibilitychange',sync);size();sync();<\/script></html>`;
    const url=URL.createObjectURL(new Blob([source],{type:'text/html'}));
    const link=document.createElement('a');link.href=url;link.download=`${pad(study.id)}-${study.name.toLowerCase().replaceAll(' ','-')}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#export-status').textContent='Downloaded a standalone HTML file with no dependencies.';
  } catch { $('#export-status').textContent='Download failed. Please try again.'; }
  finally { button.disabled=false; }
});
updatePlayback();
const requested=Number(location.hash.match(/^#study-(\d+)$/)?.[1]);
if(requested>=1&&requested<=100)openStudy(studies[requested-1]);
