// "Growing up" section: how normal ECG measurements change from age 1 to 14.
// Bands are the Heartverse Stage 1 age profiles (ZZU); points are published normal values (Rijnbeek 2001;
// Saarel 2018). Each "why" note says only what its source says; where the sources give no reason, the note says so.

export const MEASURES={
  heart_rate_bpm:{short:'Heart rate',digits:0,refs:['hv1','rijnbeek2001','saarel2018'],
    why:'Heart rate falls steadily through childhood in all three sources on the chart. Because the normal rate depends so much on age, a rate that is normal for a toddler would be fast for a teenager. The sources used here describe this change but do not explain its cause, so this page does not either.'},
  pr_ms:{short:'PR',digits:0,refs:['dickinson2005','hv1'],
    why:'The PR interval runs from the start of the P wave to the start of the QRS. It varies mainly with heart rate, so it is usually shorter in younger children, whose hearts beat faster. At ages 1–2 the ZZU values are longer than the published ones (see “Reading these numbers”).'},
  qrs_ms:{short:'QRS',digits:0,refs:['dickinson2005'],
    why:'QRS duration changes little in the first three years of life, then gets steadily longer into the teens. So a QRS that is normal for a teenager can be too long for a young child: the normal limit depends on age.'},
  qt_ms:{short:'QT',digits:0,refs:['dickinson2005','hv1'],
    why:'QT depends on heart rate: in the ZZU children it shortens as the heart beats faster. The heart-rate-corrected QT changes much less with age than the QT itself, so most of the rise in QT comes from the slower heart rate of older children. This is why QT is corrected for heart rate before it is compared with a limit (see QT readings).'},
  qtc_bazett_ms:{short:'QTc',digits:0,refs:['dickinson2005','andrsova2020','hv1'],
    why:'Corrected for heart rate, the QT stays about the same through childhood: on average about 410 ms, with an upper limit of about 450 ms, and about 460 ms in teenage girls. The ZZU values run lower than this (a different measuring method). Bazett’s correction, the one most ECG machines print, tends to over-correct at the fast heart rates of young children (see QT readings).'},
  qrs_axis_wrapped_deg:{short:'QRS axis',digits:0,refs:['dickinson2005'],
    why:'The QRS axis is the main direction of the ventricles’ wave seen from the front (0° = towards the child’s left, +90° = straight down). A newborn’s right ventricle is relatively thick, and this fades over the first months of life. From about the end of the first year the average axis is about +65° to +70°, with a normal range of about 0° to +110°.'},
  r_v1_mv:{short:'R in V1',digits:2,refs:['dickinson2005'],
    why:'V1 sits over the right side of the heart. Its R wave gets smaller with age as the newborn’s relatively thick right ventricle fades. On average the R wave in V1 stays taller than the S wave until about age 3.'},
  s_v1_mv:{short:'S in V1',digits:2,refs:['dickinson2005','hv1','rijnbeek2001'],
    why:'The S wave in V1 changes the opposite way to the R wave: it gets deeper with age. In the ZZU and Rijnbeek data it is deepest in middle childhood and a little shallower in the teens.'},
  r_v6_mv:{short:'R in V6',digits:2,refs:['dickinson2005','hv1','rijnbeek2001'],
    why:'V6 sits over the left side of the heart. Its R wave gets taller with age, the mirror image of the change in V1. In the ZZU and Rijnbeek data it levels off from about age 5.'},
  t_v1_upright:{short:'T in V1',digits:0,label:'Upright T wave in V1',unit:'%',refs:['dickinson2005','hv1'],
    why:'An upright T wave in V1 is normal in the first 2–3 days of life. In most infants it turns negative during the first week, and it stays negative in most children up to the 12–16 year age group. An upright T in V1 that persists beyond the first week should raise the suspicion of an abnormality. In the ZZU children an upright T in V1 becomes more common from late childhood, so the age matters when reading it.'},
};
const SOURCE={rijnbeek2001:{name:'Rijnbeek 2001',colour:'#c7b5ff',shape:'diamond',dx:-.18},saarel2018:{name:'Saarel 2018',colour:'#8cc8ff',shape:'circle',dx:.18}};
export const SOURCES=SOURCE;
const BAND_LABEL={'1-3':[1,3],'3-6':[3,6],'6-10':[6,10],'10-15':[10,15]};

const interp=(grid,ys,x)=>{if(x<=grid[0])return ys[0];for(let i=1;i<grid.length;i++)if(x<=grid[i]){const f=(x-grid[i-1])/(grid[i]-grid[i-1]);return ys[i-1]+f*(ys[i]-ys[i-1]);}return ys.at(-1);};
export function valueAt(growth,key,sex,age,p='p50'){
  if(key==='t_v1_upright')return 100*interp(growth.age_grid_years,growth.t_v1_upright.p_upright,age);
  return interp(growth.age_grid_years,growth.features[key].zzu[sex][p],age);
}
export const format=(key,v)=>{const d=MEASURES[key].digits;return key==='qrs_axis_wrapped_deg'?`${v>0?'+':''}${v.toFixed(d)}°`:v.toFixed(d);};
export const unitOf=(growth,key)=>key==='t_v1_upright'?'%':growth.features[key].unit==='°'?'':` ${growth.features[key].unit}`;
export const labelOf=(growth,key)=>MEASURES[key].label||growth.features[key].label;

// Growth chart for one measurement and sex, with the chosen age marked.
export function drawGrowthChart(canvas,growth,key,sex,age){
  const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;if(!w)return;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  const grid=growth.age_grid_years,L=40,R=10,T=10,B=26,X=a=>L+(a-1)/(15-1)*(w-L-R);
  const tv1=key==='t_v1_upright',z=tv1?null:growth.features[key].zzu[sex],lit=tv1?[]:growth.features[key].literature[sex];
  let lo,hi;
  if(tv1){lo=0;hi=60;}
  else{const vals=[...z.p2,...z.p98,...lit.flatMap(l=>[l.p2,l.p50,l.p98].filter(v=>v!==undefined))];lo=Math.min(...vals);hi=Math.max(...vals);const pad=(hi-lo)*.08;lo-=pad;hi+=pad;}
  const Y=v=>T+(hi-v)/(hi-lo)*(h-T-B);
  // axes and grid
  g.font='9.5px "DM Sans",sans-serif';g.fillStyle='#7f9396';g.strokeStyle='#abc8ca18';g.lineWidth=1;
  const step=niceStep((hi-lo)/4);
  for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step){const y=Math.round(Y(v))+.5;g.beginPath();g.moveTo(L,y);g.lineTo(w-R,y);g.stroke();g.textAlign='right';g.fillText(fmtTick(v,step),L-5,y+3);}
  g.textAlign='center';for(const a of [1,3,5,8,12,15]){const x=Math.round(X(a))+.5;g.beginPath();g.moveTo(x,T);g.lineTo(x,h-B);g.stroke();g.fillText(a,x,h-B+13);}
  g.fillText('Age (years)',L+(w-L-R)/2,h-2);
  const band=(a,b,fill)=>{g.fillStyle=fill;g.beginPath();grid.forEach((x,i)=>{const px=X(x),py=Y(a[i]);i?g.lineTo(px,py):g.moveTo(px,py);});for(let i=grid.length-1;i>=0;i--)g.lineTo(X(grid[i]),Y(b[i]));g.closePath();g.fill();};
  const line=(ys,stroke,width=1.6,dash=[])=>{g.strokeStyle=stroke;g.lineWidth=width;g.setLineDash(dash);g.beginPath();grid.forEach((x,i)=>{const px=X(x),py=Y(ys[i]);i?g.lineTo(px,py):g.moveTo(px,py);});g.stroke();g.setLineDash([]);};
  if(tv1){
    line(growth.t_v1_upright.p_upright.map(v=>v*100),'#8fd6c8',1.8);
    for(const [b,v] of Object.entries(growth.t_v1_upright.observed_by_band)){const [a0,a1]=BAND_LABEL[b];g.strokeStyle='#d6bb92';g.lineWidth=2;g.beginPath();g.moveTo(X(a0),Y(v*100));g.lineTo(X(a1),Y(v*100));g.stroke();}
  }else{
    band(z.p2,z.p98,'#8fd6c814');band(z.p10,z.p90,'#8fd6c826');
    if(key==='heart_rate_bpm'){   // below 3 years the profile follows Rijnbeek 2001 (Stage 1 override): dashed
      g.save();g.beginPath();g.rect(X(3),0,w,h);g.clip();line(z.p50,'#8fd6c8',1.8);g.restore();
      g.save();g.beginPath();g.rect(0,0,X(3),h);g.clip();line(z.p50,'#8fd6c8',1.6,[4,3]);g.restore();
    }else line(z.p50,'#8fd6c8',1.8);
    for(const l of lit){
      const s=SOURCE[l.source],a0=Math.max(1,l.age_lo),a1=Math.min(15,l.age_hi),xm=X((a0+a1)/2+s.dx);
      g.strokeStyle=s.colour;g.globalAlpha=.45;g.lineWidth=1;g.beginPath();g.moveTo(X(a0)+2,Y(l.p50));g.lineTo(X(a1)-2,Y(l.p50));g.stroke();g.globalAlpha=1;
      const top=l.p98??l.p50,bot=l.p2??l.p50;g.lineWidth=1.2;g.beginPath();g.moveTo(xm,Y(top));g.lineTo(xm,Y(bot));g.stroke();
      for(const v of [l.p2,l.p98])if(v!==undefined){g.beginPath();g.moveTo(xm-3,Y(v));g.lineTo(xm+3,Y(v));g.stroke();}
      marker(g,s.shape,xm,Y(l.p50),s.colour);
    }
  }
  // the chosen age
  const x=X(age),v=valueAt(growth,key,sex,age);g.strokeStyle='#f0d9ad88';g.setLineDash([3,3]);g.beginPath();g.moveTo(x,T);g.lineTo(x,h-B);g.stroke();g.setLineDash([]);
  g.fillStyle='#fff3d6';g.beginPath();g.arc(x,Y(v),3.6,0,Math.PI*2);g.fill();
}
function marker(g,shape,x,y,c){g.fillStyle=c;g.strokeStyle='#0b1216';g.lineWidth=1;g.beginPath();
  if(shape==='diamond'){g.moveTo(x,y-4.5);g.lineTo(x+4.5,y);g.lineTo(x,y+4.5);g.lineTo(x-4.5,y);g.closePath();}else g.arc(x,y,3.8,0,Math.PI*2);g.fill();g.stroke();}
function niceStep(raw){const p=10**Math.floor(Math.log10(raw)),f=raw/p;return (f<1.5?1:f<3?2:f<7?5:10)*p;}
const fmtTick=(v,step)=>step<.1?v.toFixed(2):step<1?v.toFixed(1):Math.round(v);

// Numbers for the chosen age: ZZU centiles and the published group that contains the age.
export function describe(growth,key,sex,age){
  const who=sex==='female'?'girls':'boys';
  if(key==='t_v1_upright'){
    const p=valueAt(growth,key,sex,age),band=Object.entries(BAND_LABEL).find(([,r])=>age>=r[0]&&age<r[1])?.[0]??'10-15';
    return {main:`About ${Math.round(p)}% of children aged ${age} have an upright T wave in V1`,detail:`Estimated from the ZZU children, both sexes together. Observed at ages ${band.replace('-','–')}: ${(growth.t_v1_upright.observed_by_band[band]*100).toFixed(0)}%.`,refs:[]};
  }
  const f=growth.features[key],u=unitOf(growth,key),q=p=>format(key,valueAt(growth,key,sex,age,p));
  const refs=f.literature[sex].filter(l=>age>=l.age_lo&&age<l.age_hi).map(l=>({key:l.source,source:SOURCE[l.source].name,colour:SOURCE[l.source].colour,
    text:`${l.age_lo}–${l.age_hi} years: median ${format(key,l.p50)}${u}${l.p2!==undefined||l.p98!==undefined?`, 2nd–98th centile ${l.p2!==undefined?format(key,l.p2):'—'} to ${l.p98!==undefined?format(key,l.p98):'—'}`:''}${l.n?` (n = ${l.n})`:''}`}));
  return {main:`${who[0].toUpperCase()+who.slice(1)} aged ${age}: median ${q('p50')}${u}`,detail:`Middle 80%: ${q('p10')} to ${q('p90')}${u}. 2nd–98th centile: ${q('p2')} to ${q('p98')}${u}. ZZU, Stage 1 age profiles.`,refs};
}

// Typical child at two ages, one beat each at the usual resting rate for the age, aligned at the start of the QRS.
export function drawCompare(canvas,beats,leads,names){
  const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;if(!w)return;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  const start=-Math.max(...beats.map(b=>b.model.pr))-40,span=700,cw=w/leads.length,mm=cw/(span/40),px=10*mm,out=new Array(12);
  for(let x=0,i=0;x<=w;x+=mm,i++){g.strokeStyle=i%5?'#d8c49f0d':'#d8c49f22';g.beginPath();g.moveTo(Math.round(x)+.5,0);g.lineTo(Math.round(x)+.5,h);g.stroke();}
  for(let y=0,i=0;y<=h;y+=mm,i++){g.strokeStyle=i%5?'#d8c49f0d':'#d8c49f22';g.beginPath();g.moveTo(0,Math.round(y)+.5);g.lineTo(w,Math.round(y)+.5);g.stroke();}
  leads.forEach((li,c)=>{
    const x0=c*cw,y0=h*.58;
    if(c){g.strokeStyle='#abc8ca30';g.beginPath();g.moveTo(x0+.5,0);g.lineTo(x0+.5,h);g.stroke();}
    for(const b of beats){
      g.strokeStyle=b.colour;g.lineWidth=1.5;g.lineJoin='round';g.beginPath();
      for(let x=0;x<=cw;x+=.5){const t=start+x/cw*span;b.model.leadsAt(t,0,-Infinity,out);const Y=y0-out[li]*px;x?g.lineTo(x0+x,Y):g.moveTo(x0+x,Y);}
      g.stroke();
    }
    g.font='600 10px "DM Sans",sans-serif';g.fillStyle='#9fb1b3';g.fillText(names[li],x0+5,13);
  });
}
// Simple measurements on a simulated beat (for the comparison table): wave amplitudes in the QRS window.
export function beatNumbers(model){
  const out=new Array(12);let rV1=0,sV1=0,rV6=0,i=0,f=0;
  for(let t=0;t<=model.qrs;t++){model.leadsAt(t,0,-Infinity,out);rV1=Math.max(rV1,out[6]);sV1=Math.max(sV1,-out[6]);rV6=Math.max(rV6,out[11]);i+=out[0];f+=out[5];}
  const axis=Math.atan2(f,i)*180/Math.PI;
  return {hr:model.hr,pr:model.pr,qrs:model.qrs,qt:model.qt,rV1,sV1,rV6,axis:axis<-90?axis+360:axis};   // axis wrapped to −90…270°, as in the profiles
}
