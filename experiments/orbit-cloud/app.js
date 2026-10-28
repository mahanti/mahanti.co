import { studies } from '../motion-atlas/studies.js';
import { drawStudy } from '../motion-atlas/renderer.js?v=orbit-layers-2';

const study=studies.find(study=>study.family==='particles'&&study.variant===1);
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const button=document.querySelector('#pause');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motion.matches,elapsed=study.id*.31,last=null,frame=0;
function paint(){drawStudy(ctx,canvas.width,canvas.height,study,elapsed);}
function resize(){
  const ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(canvas.clientWidth*ratio);
  canvas.height=Math.round(canvas.clientHeight*ratio);
  paint();
}
function tick(now){
  if(last!==null)elapsed+=Math.min(now-last,80)/1000;
  last=now;paint();frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);last=null;
  button.textContent=paused?'Play':'Pause';
  if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);
}
button.addEventListener('click',()=>{paused=!paused;sync();});
motion.addEventListener('change',event=>{paused=event.matches;sync();});
document.addEventListener('visibilitychange',sync);
new ResizeObserver(resize).observe(canvas);
resize();sync();
