const PI = Math.PI, TAU = PI * 2;
const sin = Math.sin, cos = Math.cos;
const mix = (a,b,t) => a+(b-a)*t;
const mod = x => ((x%1)+1)%1;

export function drawStudy(ctx, width, height, study, seconds) {
  const t = seconds / study.duration * TAU;
  const v = study.variant;
  const accent = study.accent;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha=1;
  ctx.fillStyle=study.background;
  ctx.fillRect(0,0,width,height);
  ctx.save();
  const scale=Math.min(width,height)/2.55;
  ctx.translate(width/2,height/2);
  ctx.scale(scale,scale);
  ctx.lineCap='round'; ctx.lineJoin='round';
  const white='#f2f2f2';
  function pen(color=white, alpha=.66, weight=.009) { ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=weight; }
  function line(x,y,X,Y) {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();}
  function circle(x,y,r,fill=false) {ctx.beginPath();ctx.arc(x,y,Math.max(.001,r),0,TAU);fill?ctx.fill():ctx.stroke();}
  function arc(x,y,r,a,b) {ctx.beginPath();ctx.arc(x,y,Math.max(.001,r),a,b);ctx.stroke();}
  function path(points,closed=false,fill=false) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(closed)ctx.closePath();fill?ctx.fill():ctx.stroke();}
  function polygon(x,y,r,n,a=0) {path(Array.from({length:n},(_,i)=>[x+cos(a+i*TAU/n)*r,y+sin(a+i*TAU/n)*r]),true);}
  function rect(x,y,w,h,a=0) {ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeRect(-w/2,-h/2,w,h);ctx.restore();}
  function wave(y,amplitude,phase,frequency=3) {const p=[];for(let i=0;i<=80;i++){const x=-1.15+i*2.3/80;p.push([x,y+amplitude*sin(x*frequency+phase)]);}path(p);}
  function dot(x,y,r=.022,color=accent) {pen(color,1);circle(x,y,r,true);}
  pen();

  switch(study.family) {
    case 'orbits': {
      for(let i=0;i<7;i++) {
        const r=.22+i*.115, a=t*(i%2?1:-1)+i*.7;
        ctx.save();
        if(v===3)ctx.rotate(i*.32);
        const flatten=v===2?.35:v===3?.45:v===1?.68:1;
        ctx.scale(1,flatten);
        const dx=v===1?(i%2?-.27:.27):v===4?.15*cos(t+i):0;
        pen(white,.3);circle(dx,0,r);
        dot(dx+cos(a)*r,sin(a)*r,i===3?.035:.018,i===3?accent:white);
        ctx.restore();
      }
      dot(v===4?.15*cos(t):0,0,.045);
      break;
    }
    case 'contours': {
      for(let i=0;i<14;i++) {
        const r=.13+i*.059, p=t-i*.21;
        pen(i===8?accent:white,i===8?1:.48);
        if(v===0)circle(.04*cos(p),.04*sin(p),r*(1+.09*sin(p)));
        if(v===1)rect(0,0,r*1.7,r*(1.35+.25*sin(p)),.08*sin(p));
        if(v===2)rect(0,0,r*1.6,r*1.6,PI/4+.15*sin(p));
        if(v===3)circle(.17*cos(p),.12*sin(p),r);
        if(v===4){const points=[];for(let j=0;j<=96;j++){const a=j/96*TAU,R=r*(1+.14*cos(3*a+p));points.push([cos(a)*R,sin(a)*R]);}path(points);}
      }
      break;
    }
    case 'waves': {
      for(let i=0;i<17;i++) {
        const y=(i-8)*.095;
        pen(i===8?accent:white,i===8?1:.5);
        if(v===0)wave(y,.09,t+i*.25,4);
        if(v===1)wave(y,.17*sin(t+i*.13),0,4);
        if(v===2){ctx.save();ctx.rotate(i%2?PI/2:0);wave(y*.85,.1,t+i*.2,3);ctx.restore();}
        if(v===3)wave(y*.6,.23,t+i*.12,2.5);
        if(v===4){const p=[];for(let j=0;j<=80;j++){const x=-1.15+j/80*2.3;p.push([x,y+.2*Math.exp(-3*x*x)*sin(x*8-t+i*.25)]);}path(p);}
      }
      break;
    }
    case 'grids': {
      for(let y=-4;y<=4;y++)for(let x=-6;x<=6;x++) {
        const X=x*.17,Y=y*.17,dist=Math.hypot(X,Y),phase=t-dist*4;
        pen(x===0||y===0?accent:white,x===0||y===0?.9:.45);
        if(v===0){const a=Math.atan2(sin(t)*.65-Y,cos(t)*.75-X);line(X-cos(a)*.04,Y-sin(a)*.04,X+cos(a)*.04,Y+sin(a)*.04);}
        if(v===1)circle(X,Y,.017+.018*(1+sin(phase)));
        if(v===2)rect(X,Y,.09,.09,t+(x+y)*.16);
        if(v===3){const k=1+.14*sin(phase);circle(X*k,Y*k,.013,true);}
        if(v===4){const r=.015+.022*(1+sin(t-(x+y)*.55));line(X-r,Y,X+r,Y);line(X,Y-r,X,Y+r);}
      }
      break;
    }
    case 'depth': {
      for(let i=0;i<19;i++) {
        const p=mod(i/19-seconds/study.duration), z=p*p;
        pen(i===7?accent:white,i===7?1:.65*Math.min(p*12,(1-p)*12,1));
        if(v===0)line(-mix(.5,1.13,p),mix(-.85,.88,z),mix(.5,1.13,p),mix(-.85,.88,z));
        if(v===1){line(-1.1,z*1.65-.7,1.1,z*1.65-.7);if(i%3===0)line(0,-.9,(p-.5)*2.5,.95);}
        if(v===2)rect(0,0,.1+p*1.8,.1+p*1.55);
        if(v===3){const a=i/19*TAU;line(cos(a)*(.1+z*.8),sin(a)*(.1+z*.8),cos(a)*(.14+z),sin(a)*(.14+z));}
        if(v===4){const y=-.85+p*1.7,w=.3+p*.7;path([[-w,y],[w,y],[w,y+.05],[-w,y+.05]]);}
      }
      pen(accent,1);if(v<2)line(-.5,-.88,.5,-.88);
      break;
    }
    case 'radial': {
      const count=v===2?36:48;
      for(let i=0;i<count;i++) {
        const a=i/count*TAU+t*.5, p=i/count*TAU;
        pen(i%12===0?accent:white,i%12===0?1:.55);
        if(v===0)line(cos(a)*.55,sin(a)*.55,cos(a)*.88,sin(a)*.88);
        if(v===1){const r=.3+.12*sin(t+p*3);line(cos(p)*r,sin(p)*r,cos(p+.4*sin(t))*.92,sin(p+.4*sin(t))*.92);}
        if(v===2){const b=a+.25;path([[cos(a)*.3,sin(a)*.3],[cos(b)*.85,sin(b)*.85],[cos(b+.04)*.85,sin(b+.04)*.85]]);}
        if(v===3){const R=.68+.2*sin(p*4-t);line(cos(p)*.35,sin(p)*.35,cos(p)*R,sin(p)*R);}
        if(v===4){line(cos(a)*.15,sin(a)*.15,cos(a+.25)*.88,sin(a+.25)*.88);}
      }
      if(v===4){pen();circle(0,0,.88);}
      break;
    }
    case 'pendulums': {
      for(let i=0;i<9;i++) {
        const x=(i-4)*.23, phase=t+i*.32;
        const swing=.27*sin(phase),len=.8+(i%3)*.1;
        pen(white,.4);
        if(v===0){line(x,-.65,x+swing,.35);dot(x+swing,.35,.035,i===4?accent:white);}
        if(v===1){const X=x+swing,Y=-.2;line(x,-.75,X,Y);line(X,Y,X+.17*sin(phase*2),.5);dot(X+.17*sin(phase*2),.5,.027,i===4?accent:white);}
        if(v===2){const a=.4*sin(phase);line(x,-.75,x+sin(a)*len,-.75+cos(a)*len);dot(x+sin(a)*len,-.75+cos(a)*len,.03,i%3===0?accent:white);}
        if(v===3){line(x,-.7,x,.7);dot(x,.5*sin(phase),.045,i===4?accent:white);}
        if(v===4){const a=.4*sin(t*(1+i%3)+i);line(x,.65,x+sin(a)*.65,.65-cos(a)*.65);dot(x+sin(a)*.65,.65-cos(a)*.65,.028,i===4?accent:white);}
      }
      break;
    }
    case 'ribbons': {
      const n=45;
      for(let i=0;i<n;i++) {
        const x=(i/(n-1)-.5)*2.1,a=i*.18-t;
        pen(i%9===0?accent:white,i%9===0?1:.45);
        if(v===0)line(x,.5*sin(a),x,-.5*sin(a));
        if(v===1)line(x,.45*sin(a),x+.06*cos(a),-.45*sin(a));
        if(v===2){line(x,.28*sin(a)-.3,x,-.28*sin(a)-.3);line(x,.28*sin(a+PI)+.3,x,-.28*sin(a+PI)+.3);}
        if(v===3)line(-.8,-.7,x,.55+.2*sin(a));
        if(v===4){const b=i/(n-1)*TAU;line(cos(b)*(.65+.2*sin(a)),sin(b)*(.65+.2*sin(a)),cos(b)*(.65-.2*sin(a)),sin(b)*(.65-.2*sin(a)));}
      }
      break;
    }
    case 'polygons': {
      const sides=[3,4,5,6,8][v];
      for(let i=0;i<13;i++) {
        const r=.18+i*.057;
        pen(i===7?accent:white,i===7?1:.55);
        polygon(.04*sin(t+i*.2),.04*cos(t+i*.2),r,sides,t*.5+i*.07*sin(t));
      }
      break;
    }
    case 'spirals': {
      const arms=v===1?2:1;
      for(let arm=0;arm<arms;arm++) {
        const pts=[];
        for(let i=0;i<=240;i++) {
          const p=i/240,a=p*TAU*(v===4?3+sin(t):4)+t+arm*PI,r=.06+p*.86;
          const x=cos(a)*r,y=sin(a)*r;
          if(v===2&&i%5===0){pen(i%20===0?accent:white,.8);circle(x,y,.012,true);}
          else if(v===3){const R=r*.72/Math.max(Math.abs(cos(a)),Math.abs(sin(a)));pts.push([cos(a)*R,sin(a)*R]);}
          else pts.push([x,y]);
        }
        pen(arm===1?accent:white,.65);if(v!==2)path(pts);
      }
      if(v!==2)dot(cos(t)*.92,sin(t)*.92,.025);
      break;
    }
    case 'interference': {
      for(let group=0;group<2;group++) {
        ctx.save();
        const color=group?accent:white;
        if(v===0||v===2){const x=(group?1:-1)*(.22+.12*sin(t));if(v===2){ctx.rotate((group?1:-1)*t*.5);ctx.scale(1,.7);}for(let i=1;i<=13;i++){pen(color,.45);circle(x,0,i*.065);}}
        if(v===1||v===3){ctx.rotate((group?1:-1)*(v===3?PI/4:.12+.12*sin(t)));for(let i=-12;i<=12;i++){pen(color,.45);line(-1.05,i*.07,1.05,i*.07);}}
        if(v===4){for(let i=-7;i<=7;i++){pen(color,.5);wave(i*.1,.1,(group?1:-1)*t,5);}}
        ctx.restore();
      }
      break;
    }
    case 'particles': {
      const n=v===1?260:130;
      const cloudOpacities=[1,.82,.64,.46,.28,.12];
      for(let i=0;i<n;i++) {
        const p=i/n, a=i*2.399963+t, r=Math.sqrt(p)*.9;
        let x,y;
        if(v===0){x=cos(a)*r;y=sin(a)*r;}
        if(v===1){const phase=a+t*(i%6)*.4;x=cos(phase)*r;y=sin(phase)*r*.55;}
        if(v===2){const R=r*(.82+.18*sin(t+p*5));x=cos(a)*R;y=sin(a)*R;}
        if(v===3){const R=mod(p+t/TAU)*.9;x=cos(a+R*7)*R;y=sin(a+R*7)*R;}
        if(v===4){x=cos(i*2.4)*.8;y=mod(p-t/TAU)*1.7-.85;}
        // Six orbit layers step down in opacity; accent dots stay fully opaque.
        const isAccent=i%11===0;
        const opacity=isAccent?1:v===1?cloudOpacities[i%6]:.5;
        pen(isAccent?accent:white,opacity);circle(x,y,isAccent?.022:v===1?.005:.009,true);
      }
      break;
    }
    case 'tiles': {
      for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++) {
        const p=t-(x+y)*.45,X=x*.235,Y=y*.235;
        pen(x+y===0?accent:white,x+y===0?1:.52);
        if(v===0)rect(X,Y,.15,.05,.5*sin(p));
        if(v===1)rect(X,Y,.14,.14,(sin(p)+1)*PI/4);
        if(v===2)polygon(X,Y,.08*(1+.2*sin(p)),4,PI/4+.2*sin(t));
        if(v===3){const s=.05+.1*(sin(p)+1)/2;rect(X,Y,s,s);}
        if(v===4)rect(X+.06*sin(t+y*.7),Y,.15,.11);
      }
      break;
    }
    case 'arcs': {
      for(let i=0;i<12;i++) {
        const r=.17+i*.065,a=t*(i%2?1:-1)+i*.28;
        pen(i===6?accent:white,i===6?1:.58);
        if(v===0)arc(0,0,r,a,a+PI*1.4);
        if(v===1){arc(0,0,r,a,a+PI*.7);arc(0,0,r,a+PI,a+PI*1.7);}
        if(v===2)arc(-.3+.08*sin(t),0,r,-PI/2+i*.03+.15*sin(t),PI/2+i*.03+.15*sin(t));
        if(v===3){arc(0,0,r,a,a+PI*.4);dot(cos(a)*r,sin(a)*r,.012,i===6?accent:white);}
        if(v===4)arc(.12*cos(a),.12*sin(a),r,a,a+PI*1.7);
      }
      break;
    }
    case 'scans': {
      if(v===0||v===3){for(let i=-10;i<=10;i++){pen(white,.45);line(i*.1,-.65,i*.1,.65);}pen(accent,1,.012);const y=sin(t)*.65;line(-1.05,y,1.05,y);if(v===3)for(let i=-10;i<=10;i++)line(i*.1,y,i*.1,y+.15);}
      if(v===1){pen(white,.35);for(let i=1;i<=5;i++)circle(0,0,i*.17);line(-.85,0,.85,0);line(0,-.85,0,.85);pen(accent,1);line(0,0,cos(t)*.85,sin(t)*.85);dot(.4,-.3,.025);}
      if(v===2){for(let i=-10;i<=10;i++){pen(white,.4);line(-1,i*.065,1,i*.065);}pen(accent,1);rect(.65*sin(t),0,.35,1.5);}
      if(v===4){for(let i=1;i<=14;i++){pen(white,.4);polygon(0,0,i*.065,6,PI/6);}pen(accent,1,.009);const r=.1+.8*(sin(t)+1)/2;polygon(0,0,r,6,PI/6);}
      break;
    }
    case 'lattices': {
      if(v===0||v===1||v===4){ctx.save();ctx.rotate(v===4?t*.5:PI/4);for(let i=-7;i<=7;i++){pen(i===0?accent:white,i===0?1:.43);if(v===1){wave(i*.12,.07,t+i*.25,3);}else{const d=.035*sin(t+i*.3);line(-.8,i*.115+d,.8,i*.115-d);line(i*.115+d,-.8,i*.115-d,.8);}}ctx.restore();}
      if(v===2){for(let y=-2;y<=2;y++)for(let x=-3;x<=3;x++){pen(x===0?accent:white,x===0?.9:.45);polygon(x*.27+(y%2)*.135,y*.235,.15,6,PI/6+.12*sin(t));}}
      if(v===3){for(let i=0;i<30;i++){const p=i/29;pen(i===15?accent:white,i===15?1:.55);line(-1,mix(-.8,.8,p),1,mix(.8,-.8,p)+.15*sin(t+p*TAU));}}
      break;
    }
    case 'portals': {
      for(let i=0;i<12;i++) {
        const p=mod(i/12+t/TAU),r=.02+p*p;
        const fade=Math.min(p*8,(1-p)*8,1);
        pen(i===5?accent:white,fade*(i===5?1:.58));
        if(v===0)rect(0,0,r*1.75,r*1.75);
        if(v===1)circle(0,0,r);
        if(v===2)polygon(0,0,r,3,-PI/2);
        if(v===3)rect(.17*sin(p*4+t),.12*cos(p*4+t),r*1.7,r*1.7);
        if(v===4)rect(0,0,r*1.65,r*1.65,p*.7+.12*sin(t));
      }
      break;
    }
    case 'traces': {
      function point(a) {
        if(v===0)return [.87*sin(3*a),.74*sin(2*a)];
        if(v===1)return [.9*cos(a)/(1+sin(a)**2),.9*sin(a)*cos(a)/(1+sin(a)**2)];
        if(v===2){const r=.87*cos(4*a);return [r*cos(a),r*sin(a)];}
        if(v===3)return [.65*cos(a)+.25*cos(5*a),.65*sin(a)-.25*sin(5*a)];
        return [.68*cos(a)+.2*cos(4*a),.68*sin(a)+.2*sin(4*a)];
      }
      const pts=[];for(let i=0;i<=240;i++)pts.push(point(i/240*TAU));pen(white,.32);path(pts);
      const trail=[];for(let i=0;i<=55;i++)trail.push(point(t-i*.012));pen(accent,1,.012);path(trail);const [x,y]=point(t);dot(x,y,.032);
      break;
    }
    case 'balance': {
      if(v===0){pen(white,.6);line(0,-.9,0,-.35);const a=.18*sin(t);ctx.save();ctx.translate(0,-.35);ctx.rotate(a);line(-.8,0,.8,0);for(let i=0;i<3;i++){const x=(i-1)*.7;line(x,0,x,.5);pen(i===1?accent:white,.85);circle(x,.62,.12+i*.025);pen();}ctx.restore();}
      if(v===1||v===3){polygon(0,.35,.15,3,-PI/2);const a=.2*sin(t);ctx.save();ctx.rotate(a);pen(white,.7);line(-1,.18,1,.18);if(v===1){dot(-.72,.02,.13,white);dot(.72,.04,.11);}else{rect(-.7,.02,.2,.2);pen(accent,1);polygon(.7,-.01,.18,3,-PI/2);}ctx.restore();}
      if(v===2){pen(white,.35);circle(0,0,.63);for(let i=0;i<3;i++){const a=t+i*TAU/3;pen(white,.5);line(0,0,cos(a)*.63,sin(a)*.63);pen(i===0?accent:white,.9);circle(cos(a)*.63,sin(a)*.63,.13);}}
      if(v===4){for(let i=0;i<5;i++){const x=(i-2)*.38,y=.2*sin(t+i*.5);pen(white,.4);line(x,-.8,x,y-.18);pen(i===2?accent:white,.8);circle(x,y,.18);}}
      break;
    }
    case 'folds': {
      if(v===0){const w=.12+.025*sin(t);for(let i=0;i<12;i++){const x=(i-5.5)*w,y=(i%2?1:-1)*.12*sin(t);pen(i===6?accent:white,.65);path([[x,-.6+y],[x+w,-.6-y],[x+w,.6-y],[x,.6+y]],true);}}
      if(v===1){for(let i=0;i<8;i++){pen(i===4?accent:white,.7);rect((i-3.5)*.25,0,Math.max(.01,.21*Math.abs(cos(t+i*.22))),1.2);}}
      if(v===2){for(let i=0;i<18;i++){const a=-PI*.9+i/17*PI*.8+.15*sin(t);pen(i===9?accent:white,.6);line(0,.65,cos(a)*1.05,.65+sin(a)*1.05);}}
      if(v===3){const verts=[];for(let z of [-1,1])for(let y of [-1,1])for(let x of [-1,1]){const X=x*.44*cos(t)+z*.44*sin(t),Z=-x*.44*sin(t)+z*.44*cos(t);verts.push([X,y*.44*.9-Z*.28]);}for(let i=0;i<8;i++)for(let bit of [1,2,4])if((i&bit)===0){pen(bit===4?accent:white,.75);line(...verts[i],...verts[i|bit]);}}
      if(v===4){for(let i=0;i<7;i++){const a=.6*sin(t+i*.3);pen(i===3?accent:white,.7);rect((i-3)*.28,0,.27,.65,a);}}
      break;
    }
    default: throw new Error(`Unknown motion family: ${study.family}`);
  }
  ctx.restore();
  ctx.globalAlpha=1;
}
