// Measures every generated sample ECG and checks it against the cited norms.
// Intervals are measured from the generated signal itself (spatial magnitude,
// 2% of each wave's peak), not copied from the input parameters.
import { ecgReference } from '../dist/reference.js';
import { ecgParameters, buildECG, LEAD_II } from '../dist/ecg.js';

const failures=[];let count=0;
const close=(measured,target,label,ctx)=>{const tol=Math.max(6,target*.06);if(Math.abs(measured-target)>tol)failures.push(`${ctx}: ${label} measured ${measured.toFixed(1)} ms vs median ${target} ms`);};
const inRange=(measured,{low,high},label,ctx)=>{if(measured<low||measured>high)failures.push(`${ctx}: ${label} ${measured.toFixed(1)} outside ${low}–${high}`);};

function measure(model){
  const step=.0002,start=model.pOnset-.04,n=Math.round(model.rr/step);
  const span={};
  for(const group of ['P','QRS','T']){
    const mag=[];let peak=0;
    for(let i=0;i<n;i++){const v=model.vector(start+i*step,group),m=Math.hypot(...v);mag.push(m);peak=Math.max(peak,m);}
    const on=mag.findIndex(m=>m>peak*.02),off=mag.length-1-[...mag].reverse().findIndex(m=>m>peak*.02);
    span[group]=[start+on*step,start+off*step];
  }
  return span;
}
const lead2Peak=(model,group)=>{let peak=0;for(let i=0;i<4000;i++){const v=model.vector(i/4000*model.rr,group);peak=Math.max(peak,v[0]*LEAD_II[0]+v[1]*LEAD_II[1]+v[2]*LEAD_II[2]);}return peak;};

const cases=[];
for(const sex of ['female','male'])ecgReference.pediatric.bands.forEach((_,band)=>cases.push(['children',sex,band]));
ecgReference.adultMen.bands.forEach((_,band)=>cases.push(['adult-men','male',band]));
for(const [population,sex,band] of cases){
  const p=ecgParameters(population,sex,band),m=buildECG(p),s=measure(m),ctx=`${population}/${sex}/${p.bandLabel}`;count++;
  const ms=x=>x*1000;
  const pr=ms(s.QRS[0]-s.P[0]),pd=ms(s.P[1]-s.P[0]),qrs=ms(s.QRS[1]-s.QRS[0]),qt=ms(s.T[1]-s.QRS[0]),qtc=qt/Math.sqrt(m.rr);
  close(pr,p.pr.median,'PR',ctx);close(pd,p.pDur.median,'P duration',ctx);close(qrs,p.qrsDur.median,'QRS',ctx);close(qtc,p.qtc.median,'QTc',ctx);
  inRange(pr,p.pr,'PR',ctx);inRange(pd,p.pDur,'P duration',ctx);inRange(qrs,p.qrsDur,'QRS',ctx);inRange(qtc,p.qtc,'QTc',ctx);
  if(s.T[1]>s.P[0]+m.rr)failures.push(`${ctx}: T wave overlaps the next P wave`);
  if(s.T[0]<s.QRS[1])failures.push(`${ctx}: T wave starts before QRS ends`);
  for(const [group,target] of [['P',p.pII],['QRS',p.rII],['T',p.tII]])if(Math.abs(lead2Peak(m,group)-target)>.01)failures.push(`${ctx}: lead II ${group} peak not calibrated to ${target} mV`);
}
for(const bad of [['children','female',5],['children','female',-1],['adult-men','male',8],['children','female',1.5]]){
  try{ecgParameters(...bad);failures.push(`accepted invalid age group ${bad}`);}catch{}
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${count} sample ECGs (children 1–16 y by sex, adult men 16–89 y) match cited PR, P, QRS and QTc medians within 6 ms or 6%, stay inside 2nd–98th percentiles, keep waves in order, and calibrate lead II amplitudes; invalid age groups rejected.`);
