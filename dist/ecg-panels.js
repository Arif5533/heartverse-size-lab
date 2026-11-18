// Canvas panels for the heartbeat section: the 12-lead ECG and two flat views of the heart vector.
// Everything drawn here is computed from the heartbeat model (ecg12.js); nothing is a picture.

export const LEAD_NAMES=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
const LAYOUT=[[0,1,2],[3,4,5],[6,7,8],[9,10,11]];   // columns, as on a printed 12-lead ECG
export const WAVE_COLOURS={P:'#7fd4c4',QRS:'#f2d39b',T:'#ee9a86'};

// Where each lead looks from. Electrode positions: AHA/ACC/HRS recommendations (Kligfield et al., Circulation 2007).
// Textbook limb-lead directions follow from Einthoven's triangle: I 0°, II +60°, III +120°, aVR −150°, aVL −30°, aVF +90°.
export const LEAD_INFO={
  I:{where:'Left arm compared with right arm',looks:'across the chest from the child’s right side to the left',textbook:0},
  II:{where:'Left leg compared with right arm',looks:'down from the right shoulder towards the left hip, close to the usual direction of the ventricles’ main wave (about +65° to +70° after the first year)',textbook:60,refs:['dickinson2005']},
  III:{where:'Left leg compared with left arm',looks:'down and to the child’s right',textbook:120},
  aVR:{where:'Right arm compared with the other two limbs',looks:'at the heart from the right shoulder, roughly opposite to the main wave, so most of its waves point down',textbook:-150},
  aVL:{where:'Left arm compared with the other two limbs',looks:'at the heart from the left shoulder',textbook:-30},
  aVF:{where:'Left leg (foot) compared with both arms',looks:'up at the heart from below',textbook:90},
  V1:{where:'Chest, 4th rib space just right of the breastbone',looks:'at the right side of the heart from the front'},
  V2:{where:'Chest, 4th rib space just left of the breastbone',looks:'at the front of the heart'},
  V3:{where:'Chest, halfway between V2 and V4',looks:'at the front of the heart'},
  V4:{where:'Chest, 5th rib space on the line down from the middle of the collarbone',looks:'at the front of the heart near its tip (apex)'},
  V5:{where:'Chest, front fold of the armpit, level with V4',looks:'at the left side of the heart'},
  V6:{where:'Chest, middle of the armpit, level with V4',looks:'at the left side of the heart'},
};
// References: limb leads (Einthoven 1912; Goldberger 1942), chest electrode positions (Kligfield 2007).
export const leadRefs=i=>i<3?['einthoven1912']:i<6?['goldberger1942']:['kligfield2007'];

// What is happening in each part of the beat, in plain words. Every statement is from the source given with it:
// OpenStax Anatomy & Physiology 2e §19.2 (CC BY 4.0) for the conduction system and the waves; Durrer et al. 1970,
// as summarised by MacAlpin (Indian Pacing Electrophysiol J 2003), for the order inside the ventricles.
export const PHASES={
  P:{title:'The atria fire · P wave',text:'The sinus node, the heart’s natural pacemaker in the upper back wall of the right atrium, fires. The electrical wave spreads across both atria, the two upper chambers. That spreading wave is the small P wave. The atria start to squeeze shortly after the P wave begins.',
    number:m=>`This child’s P wave lasts about ${Math.round(m.p)} ms.`,refs:['openstax']},
  PR:{title:'A pause at the AV node · PR segment',text:'The wave reaches the AV node. In a normal heart this is the only way through to the ventricles, because a layer of fibrous tissue (the cardiac skeleton) blocks it everywhere else. The node slows the wave down, so the atria can finish pumping blood into the ventricles. Then the wave runs down the His bundle and the two bundle branches in the septum. On the ECG this is the flat stretch between the P wave and the QRS.',
    number:m=>`From the start of the P wave to the start of the QRS (the PR interval): about ${Math.round(m.pr)} ms.`,refs:['openstax']},
  QRS:{title:'The ventricles fire · QRS complex',text:'The bundle branches reach the Purkinje fibres, which carry the wave into the ventricle muscle. The septum fires first, from both sides. Then the walls of both ventricles fire, from the inside surface outwards. The last parts to fire are the back of the left ventricle near its base and the outflow part of the right ventricle. This fast, large wave is the QRS. The ventricles start to squeeze around the peak of the R wave.',
    number:m=>`This child’s QRS lasts about ${Math.round(m.qrs)} ms.`,refs:['openstax','durrer1970','macalpin2003']},
  T:{title:'The ventricles recover · ST segment and T wave',text:'After firing, ventricle muscle stays switched on for a while (its plateau phase), and the ECG line stays close to flat (the ST segment). Then the muscle resets (repolarises) so it can fire again. That resetting is the T wave. The QT interval runs from the start of the QRS to the end of the T wave.',
    number:m=>`This child’s QT at ${Math.round(m.hr)} bpm: about ${Math.round(m.qt)} ms.`,refs:['openstax']},
  rest:{title:'Resting and filling',text:'Electrically quiet. The heart muscle relaxes and the chambers fill with blood. Meanwhile the sinus node’s cells slowly charge up on their own until they fire the next beat.',
    number:m=>`One beat every ${Math.round(m.rr)} ms at ${Math.round(m.hr)} bpm.`,refs:['openstax']},
};

const setSize=(canvas,h)=>{const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth;h=h??canvas.clientHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}return {w,h,dpr};};

// ---------- 12-lead ECG: one beat per lead, on standard paper (25 mm/s; 10 or 5 mm/mV) ----------
export function createTwelveLead(canvas,onSelect){
  const WINDOW_MS=700,COL_MM=WINDOW_MS/40,ROW_MM=22;     // 1 mm = 40 ms at 25 mm/s
  let model=null,gain=10,lead=1,cache=null,geom=null,hover=-1;
  const off=document.createElement('canvas');
  function layout(){
    const {w,h,dpr}=setSize(canvas);const mm=w/(4*COL_MM);
    geom={w,h,dpr,mm,cw:w/4,rh:h/3,start:-model.pr-40};
  }
  function build(){
    if(!model||!canvas.clientWidth)return;layout();
    const {w,h,dpr,mm,cw,rh,start}=geom;off.width=canvas.width;off.height=canvas.height;
    const g=off.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    // paper: 1 mm and 5 mm squares
    for(let x=0,i=0;x<=w+.1;x+=mm,i++){g.strokeStyle=i%5?'#d8c49f10':'#d8c49f26';g.beginPath();g.moveTo(Math.round(x)+.5,0);g.lineTo(Math.round(x)+.5,h);g.stroke();}
    for(let y=0,i=0;y<=h+.1;y+=mm,i++){g.strokeStyle=i%5?'#d8c49f10':'#d8c49f26';g.beginPath();g.moveTo(0,Math.round(y)+.5);g.lineTo(w,Math.round(y)+.5);g.stroke();}
    const px=gain*mm,out=new Array(12);
    LAYOUT.forEach((col,c)=>{
      const x0=c*cw,traces=col.map(()=>[]);
      for(let x=0;x<=cw;x+=.5){const t=start+x/cw*WINDOW_MS;model.leadsAt(t,0,-Infinity,out);col.forEach((li,r)=>traces[r].push(out[li]));}
      col.forEach((li,r)=>{
        const y0=r*rh+rh*.58,sel=li===lead;
        if(sel){g.fillStyle='#8fd6c814';g.fillRect(x0+1,r*rh+1,cw-2,rh-2);g.strokeStyle='#8fd6c866';g.strokeRect(x0+1.5,r*rh+1.5,cw-3,rh-3);}
        else if(li===hover){g.fillStyle='#ffffff08';g.fillRect(x0+1,r*rh+1,cw-2,rh-2);}
        g.strokeStyle=sel?'#fff0cf':'#e9d4ad';g.lineWidth=sel?1.6:1.25;g.lineJoin='round';g.beginPath();
        traces[r].forEach((v,j)=>{const X=x0+j*.5,Y=y0-v*px;j?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();
        g.font='600 10px "DM Sans",sans-serif';g.fillStyle=sel?'#bff0e3':'#9fb1b3';g.fillText(LEAD_NAMES[li],x0+5,r*rh+13);
      });
      if(c)(g.strokeStyle='#abc8ca30',g.beginPath(),g.moveTo(x0+.5,0),g.lineTo(x0+.5,h),g.stroke());
    });
    cache=true;
  }
  // Moment e (ms after QRS onset): a cursor through all twelve leads at the same instant.
  function draw(e){
    if(!cache)build();if(!cache)return;
    const {w,h,dpr,cw,rh,mm,start}=geom,ctx=canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(off,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
    const x=(e-start)/WINDOW_MS*cw;if(x<0||x>cw)return;
    const v=model.leadsAt(e,0,-Infinity),px=gain*mm;
    LAYOUT.forEach((col,c)=>{
      const X=c*cw+x;ctx.strokeStyle='#ffffff40';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X+.5,0);ctx.lineTo(X+.5,h);ctx.stroke();
      col.forEach((li,r)=>{const Y=r*rh+rh*.58-v[li]*px;ctx.fillStyle=li===lead?'#ffffff':'#fff3d6cc';ctx.beginPath();ctx.arc(X,Y,li===lead?3:2,0,Math.PI*2);ctx.fill();});
    });
  }
  const leadAt=ev=>{const r=canvas.getBoundingClientRect(),c=Math.floor((ev.clientX-r.left)/(r.width/4)),row=Math.floor((ev.clientY-r.top)/(r.height/3));return LAYOUT[c]?.[row]??-1;};
  canvas.addEventListener('click',ev=>{const i=leadAt(ev);if(i>=0)onSelect(i);});
  canvas.addEventListener('pointermove',ev=>{const i=leadAt(ev);if(i!==hover){hover=i;cache=null;}canvas.style.cursor=i>=0?'pointer':'';});
  canvas.addEventListener('pointerleave',()=>{hover=-1;cache=null;});
  new ResizeObserver(()=>{cache=null;}).observe(canvas);
  return {set(m,opts={}){model=m;if(opts.gain)gain=opts.gain;if(opts.lead!==undefined)lead=opts.lead;cache=null;},draw,get gain(){return gain;}};
}

// ---------- flat views of the heart vector: from the front (limb leads) and from above (chest leads) ----------
export function createPlanes(canvas){
  let model=null,lead=1,cache=null,geom=null,loops=null;
  const off=document.createElement('canvas');
  // vector (X left, Y down, Z back) -> panel coordinates. Front view: child's left on the right, head up.
  // View from above: child's left on the right, front of the chest at the bottom.
  const P=[{name:'Seen from the front',sub:'limb leads',map:v=>[v[0],v[1]],leads:[0,1,2,3,4,5],dirs:['Head','Feet','Right','Left']},
           {name:'Seen from above',sub:'chest leads',map:v=>[v[0],-v[2]],leads:[6,7,8,9,10,11],dirs:['Back','Front','Right','Left']}];
  function prepare(){
    const s={P:[],QRS:[],T:[]};let peak=0;
    for(let t=-model.pr-10;t<model.qt+40;t+=2){
      const {a,v}=model.vectorAt(t,0,0);
      if(t<=-model.pr+model.p+10)s.P.push(a);
      if(t>=-4&&t<=model.qrs+8){s.QRS.push(v);peak=Math.max(peak,Math.hypot(v[0],v[1]),Math.hypot(v[0],v[2]));}
      if(t>=model.qrs)s.T.push(v);
    }
    loops={...s,peak:Math.max(peak,.3)};
  }
  function build(){
    if(!model||!canvas.clientWidth)return;
    const {w,h,dpr}=setSize(canvas),R=Math.min(w*.17,(h-60)/2),cy=44+R;   // titles above, direction words just outside the circle
    geom={w,h,dpr,R,scale:R*.9/loops.peak,c:[[w*.25,cy],[w*.75,cy]]};
    off.width=canvas.width;off.height=canvas.height;const g=off.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    P.forEach((pl,k)=>{
      const [cx,cy]=geom.c[k],mine=pl.leads.includes(lead);
      g.font='600 10.5px "DM Sans",sans-serif';g.fillStyle=mine?'#d9efe8':'#a5b6b8';g.textAlign='center';g.fillText(pl.name,cx,13);
      g.font='9.5px "DM Sans",sans-serif';g.fillStyle='#7f9396';g.fillText(pl.sub,cx,25);
      g.strokeStyle=mine?'#8fd6c855':'#abc8ca22';g.lineWidth=1;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.stroke();
      g.strokeStyle='#abc8ca18';g.beginPath();g.moveTo(cx-R,cy);g.lineTo(cx+R,cy);g.moveTo(cx,cy-R);g.lineTo(cx,cy+R);g.stroke();
      g.font='8.5px "DM Sans",sans-serif';g.fillStyle='#6d8285';
      g.fillText(pl.dirs[0],cx,cy-R-5);g.fillText(pl.dirs[1],cx,cy+R+12);g.textAlign='right';g.fillText(pl.dirs[2],cx-R-5,cy+3);g.textAlign='left';g.fillText(pl.dirs[3],cx+R+5,cy+3);
      // lead directions (the simulator's fitted lead vectors, flattened into this view)
      for(const li of pl.leads){
        const [x,y]=pl.map(model.leadVector(li)),n=Math.hypot(x,y)||1,ux=x/n,uy=y/n,sel=li===lead;
        g.strokeStyle=sel?'#c9d8ffcc':'#c9d8ff30';g.lineWidth=sel?1.6:1;g.setLineDash(sel?[]:[2,3]);
        g.beginPath();g.moveTo(cx-ux*R*(sel?1:0),cy-uy*R*(sel?1:0));g.lineTo(cx+ux*R,cy+uy*R);g.stroke();g.setLineDash([]);
        g.font=`${sel?600:500} 9px "DM Sans",sans-serif`;g.fillStyle=sel?'#e3ebff':'#93a4c4';g.textAlign='center';g.fillText(LEAD_NAMES[li],cx+ux*(R-11),cy+uy*(R-11)+3);
      }
      // loops of one beat
      for(const [wave,pts] of [['P',loops.P],['T',loops.T],['QRS',loops.QRS]]){
        g.strokeStyle=WAVE_COLOURS[wave];g.globalAlpha=.75;g.lineWidth=1.3;g.beginPath();
        pts.forEach((v,j)=>{const [x,y]=pl.map(v),X=cx+x*geom.scale,Y=cy+y*geom.scale;j?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();g.globalAlpha=1;
      }
    });
    g.textAlign='left';cache=true;
  }
  function draw(vec,phase){
    if(!cache)build();if(!cache)return;
    const {dpr,scale}=geom,ctx=canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(off,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!vec)return;
    const colour=WAVE_COLOURS[phase==='P'||phase==='PR'?'P':phase==='QRS'?'QRS':'T'];
    P.forEach((pl,k)=>{
      const [cx,cy]=geom.c[k],[x,y]=pl.map(vec),X=cx+x*scale,Y=cy+y*scale,len=Math.hypot(X-cx,Y-cy);
      if(len>2){
        const a=Math.atan2(Y-cy,X-cx);ctx.strokeStyle=colour;ctx.fillStyle=colour;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(X,Y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X-7*Math.cos(a-.4),Y-7*Math.sin(a-.4));ctx.lineTo(X-7*Math.cos(a+.4),Y-7*Math.sin(a+.4));ctx.closePath();ctx.fill();
      }
      if(pl.leads.includes(lead)){   // the arrow's shadow on the selected lead
        const [lx,ly]=pl.map(model.leadVector(lead)),n=Math.hypot(lx,ly)||1,ux=lx/n,uy=ly/n,d=x*scale*ux+y*scale*uy;
        ctx.strokeStyle='#ffffff99';ctx.setLineDash([2,2]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(cx+ux*d,cy+uy*d);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(cx+ux*d,cy+uy*d,3.2,0,Math.PI*2);ctx.fill();
      }
    });
  }
  new ResizeObserver(()=>{cache=null;}).observe(canvas);
  return {set(m,l){model=m;lead=l;prepare();cache=null;},draw};
}

// Frontal-plane direction of a lead (degrees, 0 = child's left, +90 = down), from the simulator's lead vector.
export const leadAngle=v=>Math.atan2(v[1],v[0])*180/Math.PI;
// Mean QRS axis as measured from leads I and aVF areas, the same rule as the Stage 1 pipeline (features.py).
export function qrsAxis(model){
  let i=0,f=0;const out=new Array(12);
  for(let t=0;t<=model.qrs;t+=1){model.leadsAt(t,0,-Infinity,out);i+=out[0];f+=out[5];}
  return Math.atan2(f,i)*180/Math.PI;
}
