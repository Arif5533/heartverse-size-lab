import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { buildECG } from './ecg.js?v=3';
import { CYCLE, cycleSize } from './cycle-profile.js?v=1';
import { createModel, LIMIT_MS, DRIFT_STABLE_MS } from './qt.js?v=1';
import { createAvatar, HEIGHT_CM, WHO_HEIGHT_CM } from './avatar.js?v=19';
import { cite, setReferenceData, referenceListHTML, refNumber } from './references.js?v=1';
import { createOrgans } from './organs.js?v=14';
import { createLimbVessels } from './limbs.js?v=4';
import { createHeartbeat } from './ecg12.js?v=1';
import { createHeartbeat3D } from './heartbeat3d.js?v=4';
import { createTwelveLead, createPlanes, LEAD_NAMES, LEAD_INFO, leadRefs, PHASES, leadAngle, qrsAxis } from './ecg-panels.js?v=4';
import { MEASURES, SOURCES, drawGrowthChart, describe, drawCompare, beatNumbers, labelOf } from './growth-panel.js?v=4';

const $=id=>document.getElementById(id);
const mod=(a,n)=>((a%n)+n)%n;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const SECTIONS=['beat','growth','qt'];
const DEFAULT_VIEW={beat:'heart',growth:'child',qt:'child'};
const state={section:'beat',age:8,sex:'female',hr:87,level:'p50',view:'heart',tone:'medium',look:'transparent',playing:!reducedMotion.matches,rate:.25,followResting:true,
  lead:1,layers:{path:true,vector:true,lead:true},gain:10,measure:'heart_rate_bpm',ageB:14};
const rates={beat:.25,growth:1,qt:1};
const ELECTROMECHANICAL_DELAY=.03; // s from QRS onset to the start of contraction (illustrative)
let model,ecg,reading,q0=0,beat=0,beatCount=0,lastFrame=0,stageText='';
let heart,growth,hb,hbTime=0,fitted=null,beat3d=null,twelve=null,planes=null,phaseShown='',lastLeadUpdate=0,scrubbing=false;
let renderer,scene,camera,controls,avatar,organs,limbs,heartRoot,heartPulse,halo,glow=0,fade=1,transition=null;
const heartMaterials=[];
const SHORT={P:'Atria fire · P wave',PR:'Pause at the AV node · PR',QRS:'Ventricles fire · QRS',T:'Ventricles recover · T wave',rest:'Resting and filling'};
const ord=n=>{n=Math.min(99,Math.max(1,Math.round(n)));const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
const signed=(v,d=0)=>`${v>=0?'+':'−'}${Math.abs(v).toFixed(d)}`;
const wrapAngle=a=>{a=mod(a+180,360)-180;return a===-180?180:a;};
const leadName=s=>LEAD_NAMES.find(n=>n.toLowerCase()===String(s).toLowerCase())||s;

// ---------- numbers ----------
const fill=input=>input.style.setProperty('--fill',`${(input.value-input.min)/(input.max-input.min)*100}%`);
const ms=v=>`${Math.round(v)}<small> ms</small>`;
function tag(el,drift){
  const stable=Math.abs(drift)<DRIFT_STABLE_MS;
  el.textContent=stable?'Stable':`Drifts ${drift>0?'+':'−'}${Math.abs(Math.round(drift))} ms`;el.className=`tag${stable?'':' drift'}`;
}
function line(el,value){
  const over=value>LIMIT_MS;el.textContent=over?`Above ${LIMIT_MS} ms: would be flagged`:`Below ${LIMIT_MS} ms`;el.className=over?'over':'';
}
function refresh(){
  const {age,sex,level}=state;
  if(state.followResting)state.hr=model.restingRate(age,sex);
  reading=model.readings(age,sex,state.hr,level);
  ecg=buildECG(model.ecgParams(age,sex,state.hr,level));q0=mod(ecg.qrsOnset,ecg.rr);
  // The heartbeat sections use the 12-lead simulator; keep the same moment of the beat when the child changes.
  const keep=hb?hb.beatTime(hbTime):null;
  hb=heart.model(age,sex,state.section==='growth'?undefined:state.hr);
  hbTime=keep===null?-hb.pr:THREE.MathUtils.clamp(keep,-hb.pr,hb.rr-hb.pr-1);
  const who=sex==='female'?'Girl':'Boy',years=age===1?'year':'years';
  $('age').value=age;$('age-value').innerHTML=`${age}<span>${years}</span>`;$('age').setAttribute('aria-valuetext',`${age} ${years}`);fill($('age'));
  $('height-note').innerHTML=`WHO median ${Math.round(WHO_HEIGHT_CM[sex][age-1])} cm${cite(age<=5?'who2006':'deonis2007')}`;
  $('hr').value=state.hr;$('hr-value').innerHTML=`${state.hr}<span>bpm</span>`;fill($('hr'));
  const [lo,hi]=model.rateRange(age,sex),rest=reading.restingRate;
  $('hr-context').innerHTML=(state.hr>hi?`Fast for this age. The usual range is ${Math.round(lo)}–${Math.round(hi)} bpm, resting about ${rest}.`
    :state.hr<lo?`Slow for this age. The usual range is ${Math.round(lo)}–${Math.round(hi)} bpm, resting about ${rest}.`
    :`Within the usual range for this age (${Math.round(lo)}–${Math.round(hi)} bpm, resting about ${rest}).`)+cite('hv1');
  $('level-note').innerHTML=(level==='p50'?'A QT in the middle of the normal range for this age.':'A QT at the 90th centile: longer than most children of this age, and still normal.')+cite('hv1');
  $('ecg-rate').textContent=`${state.hr} bpm`;
  const p=ecg.params;
  $('ecg-readout').innerHTML=`PR <b>${Math.round(p.pr.median)}</b><i>·</i>QRS <b>${Math.round(p.qrsDur.median)}</b><i>·</i>QT <b>${Math.round(p.qt)}</b> ms<i>·</i>one beat every ${Math.round(reading.rr)} ms${cite('hv1')}`;
  $('ecg-strip').setAttribute('aria-label',`Simulated lead II ECG for a ${who.toLowerCase()} aged ${age} at ${state.hr} beats per minute. QT ${Math.round(p.qt)} milliseconds.`);
  $('v-qt').innerHTML=ms(reading.qt);
  $('s-qt').innerHTML=`At the resting rate it is ${Math.round(reading.rest.qt)} ms. QT shortens as the heart speeds up (age ${reading.band.replace('-','–')} exponent ${reading.exponent.toFixed(2)}).`+cite('hv1');
  for(const k of ['bazett','fridericia','adaptive']){$(`v-${k}`).innerHTML=ms(reading[k]);tag($(`t-${k}`),reading.drift[k]);}
  line($('s-bazett'),reading.bazett);line($('s-fridericia'),reading.fridericia);
  const b=reading.bazett>LIMIT_MS,f=reading.fridericia>LIMIT_MS,verdict=$('verdict');
  verdict.className=`verdict${b!==f?' split':''}`;
  verdict.textContent=b!==f?`Same child, same heartbeat: ${b?'Bazett':'Fridericia'} puts this QT above ${LIMIT_MS} ms and ${b?'Fridericia':'Bazett'} does not.`
    :b?`Both formulas put this QT above ${LIMIT_MS} ms.`:`Both formulas keep this QT below ${LIMIT_MS} ms.`;
  $('timing-note').textContent=reading.tMeetsNextP?'At this rate the T wave runs into the next beat’s P wave, which makes the end of the QT hard to measure.':'';
  $('timing-note').hidden=!reading.tMeetsNextP;
  placeHeart();rebuildBeat();updateHeading();updateBeatPanels();updateGrowth();drawECG();writeAddress();if($('section-refs'))sectionReferences();
}

// ---------- section 1: how a heartbeat works ----------
function rebuildBeat(){
  if(beat3d&&fitted)beat3d.build(fitted.conduction,fitted.heart,hb);
  twelve.set(hb,{lead:state.lead,gain:state.gain});planes.set(hb,state.lead);
  const s=$('scrub');s.min=-Math.round(hb.pr);s.max=Math.round(hb.rr-hb.pr)-2;phaseShown='';
}
function updateBeatPanels(){
  const {age,sex}=state,who=sex==='female'?'girl':'boy';
  $('twelve-title').textContent=`12-lead ECG · typical ${who}, ${age} ${age===1?'year':'years'}`;
  $('twelve-readout').innerHTML=`PR <b>${Math.round(hb.pr)}</b><i>·</i>QRS <b>${Math.round(hb.qrs)}</b><i>·</i>QT <b>${Math.round(hb.qt)}</b> ms<i>·</i>${Math.round(hb.hr)} bpm<i>·</i>QRS axis <b>${signed(qrsAxis(hb))}°</b>${cite('hv1','hv2')}`;
  updateLeadCard();
  {const e=hb.beatTime(hbTime);phaseShown=phaseOf(e);showPhase(phaseShown);}   // fill the phase card even before the animation runs
  // how close the typical child is to real children of this age (vcg-simulator/export_web.py validation)
  const v=heart.data.validation[sex][String(age)],[b0,b1]=v.template_band.split('-').map(Number),band=`${b0}–${b1-1}`,c=v.centiles;
  $('trust-band').textContent=`Real children aged ${band}`;
  $('trust-text').innerHTML=`This typical ${who} was checked against the real median beat of ${who}s and ${who==='girl'?'boys':'girls'} aged ${band}. The wave shapes match closely: median correlation ${v.median_lead_correlation.toFixed(2)} across the 12 leads (1 = identical shape; lowest ${leadName(v.lowest_lead[0])}, ${v.lowest_lead[1].toFixed(2)}). Measured with the same software as the real children, its heart rate, PR, QRS and QT fall at the ${ord(c.heart_rate_bpm*100)}, ${ord(c.pr_ms*100)}, ${ord(c.qrs_ms*100)} and ${ord(c.qt_ms*100)} centiles of real ${who}s aged ${age} (50th = exactly typical).`+cite('hv1','hv2');
  const off=[['heart rate','heart_rate_bpm'],['PR','pr_ms'],['QRS','qrs_ms'],['QT','qt_ms']].filter(([,k])=>c[k]<.1||c[k]>.9).map(([n,k])=>`${n} at the ${ord(c[k]*100)} centile`);
  const flag=$('trust-flag');flag.hidden=!off.length&&age>2;
  flag.textContent=`Less certain at this age: ${off.length?`the typical child’s ${off.join(' and ')} of real children this age. `:''}${age<=2?`Only ${heart.data.n_profile_age_1_2} of the ${heart.data.n_profile_children} children in the data are aged 1–2.`:''}`;
}
function updateLeadCard(){
  const i=state.lead,name=LEAD_NAMES[i],info=LEAD_INFO[name],v=hb.leadVector(i),n=Math.hypot(...v),u=v.map(x=>x/n);
  $('lead-title').textContent=`How lead ${name} sees the heart`;
  $('lead-text').innerHTML=`<b>${info.where}.</b>${cite(leadRefs(i))} It looks ${info.looks}.${info.refs?cite(info.refs):''}`;
  const words=[u[0]>.3?'towards the child’s left':u[0]<-.3?'towards the child’s right':'',u[1]>.3?'downward':u[1]<-.3?'upward':'',u[2]<-.3?'to the front':u[2]>.3?'to the back':''].filter(Boolean);
  $('lead-note').innerHTML=i<6
    ?`In this simulator lead ${name} points at ${signed(wrapAngle(leadAngle(v)))}° in the front view (textbook ${signed(info.textbook)}°). The page uses the simulator’s directions because they were fitted to real children.${cite('hv2')}`.replace(/\(textbook [^)]*\)/,x=>x+cite(leadRefs(i)))
    :`In this simulator lead ${name} points ${words.join(', ').replace(/, ([^,]*)$/,' and $1')}. The view from above flattens that direction; the 3D view and the ECG use all of it.${cite('hv2')}`;
  $('lead-source').innerHTML=`The voltage at the top right and the flat views: computed from the simulator${cite('hv2')}; the shadow rule${cite('burger1946')}.`;
  document.querySelectorAll('[data-lead]').forEach(b=>{const on=Number(b.dataset.lead)===i;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  const labels=document.querySelector('#labels .lead');if(labels)labels.textContent=`Lead ${name} +`;
}
function selectLead(i){state.lead=i;beat3d?.setLead(i);twelve.set(hb,{lead:i});planes.set(hb,i);updateLeadCard();writeAddress();}
const phaseOf=e=>e<-hb.pr?'rest':e<-hb.pr+hb.p?'P':e<0?'PR':e<hb.qrs?'QRS':e<hb.qt?'T':'rest';
function showPhase(phase){
  const P=PHASES[phase];$('phase-name').textContent=P.title;$('phase-text').innerHTML=P.text+cite(P.refs);$('phase-number').innerHTML=P.number(hb)+cite('hv1','hv2');
  $('phase-chip').textContent=phase==='PR'?'Timing from data · path drawn':'Timing from data';
}
function beatFrame(e,now){
  const phase=phaseOf(e),{a,v}=hb.vectorAt(e,0,-1),vec=phase==='P'||(phase==='PR'&&e<-hb.pr+hb.p+10)?a:v;
  if(beat3d){const f=beat3d.frame(e);organs?.excite(1,f.atr,f.ven,f.rec);}
  twelve.draw(e);planes.draw(vec,phase);
  if(phase!==phaseShown){phaseShown=phase;showPhase(phase);setStage(SHORT[phase]);}
  if(!scrubbing&&document.activeElement!==$('scrub'))$('scrub').value=Math.round(e);
  if(now-lastLeadUpdate>90){lastLeadUpdate=now;const mv=hb.leadsAt(e,0,-Infinity)[state.lead];$('lead-mv').textContent=`${signed(mv,2)} mV`;}
}

// ---------- section 2: growing up ----------
function updateGrowth(){
  if(!growth||state.section!=='growth')return;
  const key=state.measure,{age,sex}=state,tv1=key==='t_v1_upright';
  $('growth-title').textContent=`${labelOf(growth,key)}${tv1?'':` (${growth.features[key].unit})`}`;
  $('growth-who').textContent=tv1?'Girls and boys':sex==='female'?'Girls':'Boys';
  drawGrowthChart($('growth-chart'),growth,key,sex,age);
  const lit=tv1?[]:[...new Set(growth.features[key].literature[sex].map(l=>l.source))];
  $('growth-key').innerHTML=tv1?'<span><i class="line" style="background:#8fd6c8"></i>Estimated share by age</span><span><i class="line" style="background:#d6bb92"></i>Observed in each age group</span>'
    :'<span><i class="line" style="background:#8fd6c8"></i>ZZU median</span><span><i style="background:#8fd6c855"></i>ZZU middle 80%</span><span><i style="background:#8fd6c822"></i>ZZU 2nd–98th</span>'
     +lit.map(s=>`<span><i style="background:${SOURCES[s].colour};${SOURCES[s].shape==='circle'?'border-radius:50%':'transform:rotate(45deg)'}"></i>${SOURCES[s].name}</span>`).join('');
  const d=describe(growth,key,sex,age);
  $('growth-main').innerHTML=d.main+cite('hv1');
  $('growth-detail').innerHTML=d.detail+cite('hv1','tan2025')+(key==='heart_rate_bpm'&&age<3?' Below 3 years the band follows Rijnbeek 2001 (dashed), because the hospital labels toddlers’ normal fast rates as tachycardia.'+cite('rijnbeek2001','hv1'):'');
  $('growth-refs').innerHTML=d.refs.map(r=>`<li><i style="background:${r.colour}"${r.source==='Saarel 2018'?' class="circle"':''}></i><b>${r.source}</b>, ${r.text}${cite(r.key)}</li>`).join('');
  $('growth-why').innerHTML=MEASURES[key].why+cite(MEASURES[key].refs);$('growth-source').innerHTML=`References${cite(MEASURES[key].refs)} · numbers: the chart above${cite('hv1','rijnbeek2001','saarel2018')}`;
  document.querySelectorAll('[data-measure]').forEach(b=>{const on=b.dataset.measure===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  // two ages side by side
  const A=state.age,B=state.ageB,mA=heart.model(A,sex),mB=heart.model(B,sex),colours=['#8fd6c8','#f0b56a'];
  $('age-b').value=B;$('age-b-value').innerHTML=`${B}<span>${B===1?'year':'years'}</span>`;fill($('age-b'));
  $('compare-title').textContent=A===B?`Age ${A}`:`Age ${A} and age ${B}`;
  const beats=A===B?[{model:mA,colour:colours[0]}]:[{model:mA,colour:colours[0]},{model:mB,colour:colours[1]}];
  drawCompare($('compare'),beats,[1,6,11],LEAD_NAMES);
  $('compare-key').innerHTML=beats.map((b,i)=>`<span><i style="background:${b.colour}"></i>${i?B:A} ${(i?B:A)===1?'year':'years'}, ${Math.round(b.model.hr)} bpm</span>`).join('');
  const nA=beatNumbers(mA),nB=beatNumbers(mB),rows=[['Heart rate','hr',0,' bpm'],['PR','pr',0,' ms'],['QRS','qrs',0,' ms'],['QT','qt',0,' ms'],['QRS axis','axis',0,'°'],['R in V1','rV1',2,' mV'],['S in V1','sV1',2,' mV'],['R in V6','rV6',2,' mV']];
  $('compare-table').innerHTML=`<thead><tr><th>Typical ${sex==='female'?'girl':'boy'}</th><th style="color:${colours[0]}">${A} y</th>${A===B?'':`<th style="color:${colours[1]}">${B} y</th>`}</tr></thead><tbody>`
    +rows.map(([n,k,dg,u])=>`<tr><td>${n}</td><td>${k==='axis'?signed(nA[k]):nA[k].toFixed(dg)}${u}</td>${A===B?'':`<td>${k==='axis'?signed(nB[k]):nB[k].toFixed(dg)}${u}</td>`}</tr>`).join('')+'</tbody>';
  $('growth-notes').innerHTML=growth.notes.map(n=>`<li>${n.text}${cite(n.refs)}</li>`).join('')
    +(age<=2||B<=2?'<li><b>Ages 1–2</b>The typical simulated child is least certain here: its QT runs short and its PR long compared with real children of the same age.'+cite('hv2')+'</li>':'');
}

// ---------- section 3: QT readings, real-children card ----------
function renderReal(){
  const t=model.data.real_children.sinus_tachycardia,scale=100/25,pct=v=>`${v.toFixed(1)}%`;
  $('real-n').textContent=`${t.n.toLocaleString('en-US')} children`;
  $('real-lead').innerHTML=`Among ${t.n.toLocaleString('en-US')} children whose hospital ECG was labelled sinus tachycardia, Bazett put ${pct(t.bazett_above_440.pct)} above ${LIMIT_MS} ms. Fridericia put ${pct(t.fridericia_above_440.pct)} there.`+cite('hvqt','tan2025');
  const row=(label,g)=>`<div class="bar-row"><span>${label}</span><div class="bar-pair"><div class="bar b" style="width:${Math.min(g.bazett_above_440.pct*scale,82)}%"><span>${pct(g.bazett_above_440.pct)}</span></div><div class="bar f" style="width:${Math.min(g.fridericia_above_440.pct*scale,82)}%"><span>${pct(g.fridericia_above_440.pct)}</span></div></div></div>`;
  const labels={'1-3':'Ages 1–2','3-6':'Ages 3–5','6-10':'Ages 6–9','10-15':'Ages 10–14'};
  $('real-bars').innerHTML=`<div class="key"><span><i style="background:var(--warn)"></i>Bazett</span><span><i style="background:var(--teal)"></i>Fridericia</span></div>`+row('All ages',t)+Object.entries(t.by_age).map(([k,g])=>row(labels[k],g)).join('');
  $('real-note').innerHTML=`One ECG per child, ages 1–14, one hospital (ZZU). Median heart rate ${Math.round(t.heart_rate_median)} bpm. Nobody’s true QT is known in real recordings, so this shows disagreement, not which formula is right.`+cite('hvqt');
}

// ---------- ECG strip (QT readings) ----------
function drawECG(){
  const canvas=$('ecg-strip');if(!ecg||!canvas.clientWidth)return;
  const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  // Standard paper: 25 mm/s and 10 mm/mV, so 1 mV spans the width of 0.4 s.
  const span=2.4,pxPerS=w/span,pxPerMv=pxPerS*.4,base=h*.74,now=(beatCount+beat)*ecg.rr,start=now-span,qt=ecg.params.qt/1000;
  for(let k=Math.ceil(start/.04);k*.04<=now;k++){const x=Math.round((k*.04-start)*pxPerS)+.5;ctx.strokeStyle=k%5===0?'#d8c49f2e':'#d8c49f12';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  ctx.font='10px "DM Sans",sans-serif';
  for(let k=Math.floor((start-q0)/ecg.rr);k*ecg.rr+q0<now;k++){
    const x=(k*ecg.rr+q0-start)*pxPerS,x2=Math.min(x+qt*pxPerS,w);if(x2<=0)continue;
    ctx.fillStyle='#e49a8726';ctx.fillRect(Math.max(x,0),0,x2-Math.max(x,0),h);
    if(x>=0&&x+qt*pxPerS<=w){ctx.fillStyle='#e9b3a4';ctx.fillText('QT',x+4,11);}
  }
  ctx.strokeStyle='#f0d9ad';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.beginPath();
  for(let x=0;x<=w;x++){const y=base-ecg.lead(start+x/pxPerS)*pxPerMv;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.stroke();
  const y=base-ecg.lead(now)*pxPerMv;ctx.fillStyle='#fff3d6';ctx.beginPath();ctx.arc(w-3,y,2.6,0,Math.PI*2);ctx.fill();
}

// ---------- stage heading ----------
function updateHeading(){
  const {age,sex}=state,who=`${sex==='female'?'Girl':'Boy'} · ${age} ${age===1?'year':'years'}`;
  const H={beat:['ONE HEARTBEAT, SLOWED DOWN','Follow the electrical wave.',[who,'Typical child for the age'+cite('hv2'),'Waves and timing from real children'+cite('tan2025','hv1','hv2'),'Path drawn for teaching'+cite('openstax')]],
    growth:['GROWING UP','A heart that grows with the child.',[who,`WHO median height ${Math.round(WHO_HEIGHT_CM[sex][age-1])} cm`+cite(age<=5?'who2006':'deonis2007'),'Typical child for the age'+cite('hv2'),'Illustrative figure'+cite('makehuman','hra')]],
    qt:['INSIDE THE CHEST','A heart that keeps time.',[who,'Illustrative figure'+cite('makehuman','hra'),'Timing from Heartverse age profiles'+cite('hv1')]]}[state.section];
  $('stage-eyebrow').textContent=H[0];$('stage-title').textContent=H[1];$('badges').innerHTML=H[2].map(t=>`<span>${t}</span>`).join('');
}
function setStage(text){if(text!==stageText){stageText=text;$('beat-stage').textContent=text;}}

// ---------- 3D scene ----------
const wrap=$('canvas-wrap');
// The camera pulls back as the child grows, less than in proportion, so a toddler still looks smaller than a teenager.
const childView=()=>{const H=avatar?avatar.plan.H:HEIGHT_CM[state.age-1];return {target:new THREE.Vector3(0,H*.52,0),position:new THREE.Vector3(0,H*.56,200+H*1.25)};};
function heartView(){
  const h=avatar.plan.heart,target=new THREE.Vector3(h.x,h.y,h.z);
  return {target,position:target.clone().add(new THREE.Vector3(h.size*.6,h.size*.35,h.size*5.4))};
}
function faceView(){
  const f=avatar.plan.face,target=new THREE.Vector3(f.x,f.y,f.z);
  return {target,position:target.clone().add(new THREE.Vector3(avatar.plan.H*.06,avatar.plan.H*.02,avatar.plan.H*.42+12))};
}
// Head to hips, so the organs fill the stage.
function bodyView(){
  const p=avatar.plan,span=p.H-p.crotch*.92,target=new THREE.Vector3(0,p.crotch*.92+span*.5,0);
  return {target,position:target.clone().add(new THREE.Vector3(0,p.H*.02,span*2.25+20))};
}
const viewFor=view=>view==='heart'?heartView():view==='face'?faceView():view==='body'?bodyView():childView();
// Fit the atlas organs to this child, draw the limb vessels from its joints, and place the heart.
function fitInside(){fitted=organs.fit(avatar.plan);avatar.setHeart(fitted.heart);limbs?.build(avatar.plan,fitted.trunk);}
function placeHeart(){
  if(!avatar)return;
  if(avatar.plan?.age!==state.age){
    avatar.update(state.age,state.tone);
    // Organs and vessels are fitted to this child; the heart sits where the fitted atlas heart is.
    if(organs)fitInside();
    if(camera)transition=viewFor(state.view);
  }
  if(!heartRoot)return;
  const h=avatar.plan.heart;heartRoot.position.set(h.x,h.y,h.z);heartRoot.scale.setScalar(h.size);
}
// The QT section's close-up shows the detailed cutaway heart; everywhere else the atlas heart, which carries the electrical wave.
function showHeart(){
  const cutaway=state.section==='qt'&&state.view==='heart';
  if(heartRoot)heartRoot.visible=cutaway;organs?.setView(state.view,!cutaway,state.section==='beat'&&state.view==='heart');
  if(beat3d)beat3d.group.visible=state.section==='beat';
  if(state.section!=='beat')organs?.excite(0,-1,-1,-1);
}
// The face view only makes sense in the skin look; the glass look has no face.
function showFaceOption(){const b=document.querySelector('[data-view=face]');b.hidden=state.look!=='skin';if(b.hidden&&state.view==='face')selectView('child');}
function selectView(view){
  state.view=view;showHeart();writeAddress();
  // Before the scene has loaded only the choice is recorded; createScene applies it once the child exists.
  transition=avatar?.plan&&camera?viewFor(view):null;
  if(transition&&reducedMotion.matches){camera.position.copy(transition.position);controls.target.copy(transition.target);transition=null;}
  document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
}
function haloTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,170,130,.9)');r.addColorStop(.35,'rgba(240,120,95,.35)');r.addColorStop(1,'rgba(240,120,95,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
// Soft studio reflections: a small room of bright panels, prefiltered for the physically based materials.
function studioEnvironment(){
  const room=new THREE.Scene(),box=new THREE.BoxGeometry(1,1,1);
  const walls=new THREE.Mesh(box,new THREE.MeshBasicMaterial({color:0x2a2f33,side:THREE.BackSide}));walls.scale.set(20,14,20);room.add(walls);
  for(const [x,y,z,w,h,d,k] of [[0,6.9,0,10,.1,10,6],[-9.9,2,0,.1,6,8,2.2],[9.9,1,-2,.1,5,6,1.4],[0,1,9.9,8,4,.1,1.8],[0,-6.9,0,8,.1,8,.35]]){
    const panel=new THREE.Mesh(box,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.96,.92).multiplyScalar(k)}));panel.position.set(x,y,z);panel.scale.set(w,h,d);room.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04).texture;pmrem.dispose();return env;
}
const labelEls={};
function createLabels(){
  const box=$('labels');
  for(const [k,t] of [['sinus','Sinus node'],['av','AV node'],['bundles','Bundle branches'],['lead','Lead II +']]){const s=document.createElement('span');s.textContent=t;if(k==='lead')s.className='lead';box.appendChild(s);labelEls[k]=s;}
}
function placeLabels(){
  const box=$('labels'),show=state.section==='beat'&&state.view==='heart'&&!!beat3d&&!!camera;box.hidden=!show;if(!show)return;
  const a=beat3d.anchors,w=wrap.clientWidth,h=wrap.clientHeight,v=new THREE.Vector3();
  for(const [k,el] of Object.entries(labelEls)){
    const on=!!a[k]&&(k==='lead'?state.layers.lead:state.layers.path);el.hidden=!on;if(!on)continue;
    v.copy(a[k]).project(camera);el.style.left=`${(v.x+1)/2*w}px`;el.style.top=`${(1-v.y)/2*h}px`;
  }
}
async function createScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0e171d,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;   // neutral keeps organ colours saturated
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','See-through child body with organs and blood vessels inside and a beating heart. Drag to rotate. Body shape, organ sizes and positions are illustrative.');
  wrap.prepend(renderer.domElement);
  scene=new THREE.Scene();scene.environment=studioEnvironment();scene.environmentIntensity=.55;
  camera=new THREE.PerspectiveCamera(26,1,1,3000);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;
  controls.minDistance=18;controls.maxDistance=640;controls.maxPolarAngle=Math.PI*.62;controls.addEventListener('start',()=>{transition=null;});
  scene.add(new THREE.HemisphereLight(0xd4e4e9,0x15131c,.95));
  for(const [color,pos,intensity] of [[0xffe3d1,[-120,220,260],2.8],[0x8ecfe5,[160,120,-120],2.6],[0xe5d7e2,[120,40,220],.9]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
  const grid=new THREE.GridHelper(420,28,0x414d4d,0x2d3a3c);grid.material.transparent=true;grid.material.opacity=.12;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(34,34.4,96),new THREE.MeshBasicMaterial({color:0x7f9c98,transparent:true,opacity:.3,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.2;scene.add(ring);
  avatar=await createAvatar();avatar.update(state.age,state.tone);avatar.setLook(state.look);scene.add(avatar.group);
  organs=await createOrgans();scene.add(organs.group);limbs=createLimbVessels();scene.add(limbs.group);
  beat3d=createHeartbeat3D();beat3d.show(state.layers);scene.add(beat3d.group);beat3d.setLead(state.lead);
  fitInside();rebuildBeat();showHeart();
  {const v=viewFor(state.view);camera.position.copy(v.position);controls.target.copy(v.target);}
  new ResizeObserver(resize).observe(wrap);resize();
  $('loading').remove();   // the child, organs and heartbeat are ready; the cutaway heart for the QT close-up loads in the background
  const gltf=await new GLTFLoader().loadAsync('./models/anatomical-heart/scene.gltf');
  const source=gltf.scene;source.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  source.position.sub(center);
  // heartRoot is scaled to the heart's height in centimetres; the model inside is normalised to height 1.
  const anatomy=new THREE.Group();anatomy.add(source);anatomy.scale.setScalar(1/size.y);
  heartPulse=new THREE.Group();heartPulse.add(anatomy);heartRoot=new THREE.Group();heartRoot.add(heartPulse);
  source.traverse(object=>{if(!object.isMesh)return;
    const mat=object.material=object.material.clone();mat.roughness=.6;mat.metalness=0;mat.emissive=new THREE.Color('#ff7a52');mat.emissiveIntensity=0;
    for(const texture of [mat.map,mat.normalMap,mat.aoMap])if(texture)texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    heartMaterials.push(mat);
  });
  halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture(),blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,transparent:true,opacity:0}));
  halo.scale.setScalar(2.1);halo.renderOrder=3;heartRoot.add(halo);
  scene.add(heartRoot);placeHeart();showHeart();
}
function resize(){
  if(!renderer)return;const w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h);camera.aspect=w/h;
  // Keep the whole figure in a tall, narrow stage (phones) by widening the field of view.
  camera.fov=w/h<.62?26*Math.min(1.7,.62/(w/h)):26;camera.updateProjectionMatrix();
}
// Mechanical beat: contraction lasts about as long as the QT; the resting phase takes whatever is left (seconds).
function heartMotion(e,rr,qt,dt,glowOn){
  const systole=THREE.MathUtils.clamp(qt-ELECTROMECHANICAL_DELAY,.1,rr*.85),m=mod(e-ELECTROMECHANICAL_DELAY,rr);
  const a=CYCLE.contractionStart,b=CYCLE.relaxationStart;
  const phase=m<systole?a+(b-a)*m/systole:mod(b+(1+a-b)*(m-systole)/(rr-systole),1);
  const squeeze=1-cycleSize(phase);
  if(heartPulse)heartPulse.scale.set(1-.085*squeeze,1-.05*squeeze,1-.085*squeeze);
  glow+=((glowOn&&e<qt?1:0)-glow)*(dt?1-Math.exp(-dt*22):1);
  organs?.pulse(squeeze,glow);
  for(const mat of heartMaterials)mat.emissiveIntensity=.02+.16*glow;
  if(halo)halo.material.opacity=.04+.26*glow;
}
function applyBeat(dt){
  const rr=ecg.rr,qt=ecg.params.qt/1000,e=mod(beat*rr-q0,rr);            // time since QRS onset
  heartMotion(e,rr,qt,dt,true);
  setStage(e<ecg.params.qrsDur.median/1000?'Electrical firing (QRS)':e<qt?'Contracting and resetting (QT)':'Resting and filling');
}
function animate(time=0){
  requestAnimationFrame(animate);
  const dt=lastFrame?Math.min((time-lastFrame)/1000,.05):0;lastFrame=time;
  const run=state.playing&&!document.hidden;
  if(state.section==='qt'){
    if(run&&ecg){beat+=dt*state.rate/ecg.rr;if(beat>=1){beatCount+=Math.floor(beat);beat%=1;}drawECG();}
    if(ecg)applyBeat(dt);
  }else if(hb){
    if(run&&!scrubbing)hbTime+=dt*1000*state.rate;
    const e=hb.beatTime(hbTime);
    heartMotion(mod(e/1000,hb.rr/1000),hb.rr/1000,hb.qt/1000,dt,false);
    if(state.section==='beat')beatFrame(e,time);else setStage(SHORT[phaseOf(e)]);
  }
  if(!renderer||!avatar)return;
  if(transition){
    const k=1-Math.exp(-dt*5);camera.position.lerp(transition.position,k);controls.target.lerp(transition.target,k);
    if(camera.position.distanceTo(transition.position)<.5)transition=null;
  }
  // The figure fades as the camera closes in on the heart.
  const target=state.view==='heart'?THREE.MathUtils.clamp((camera.position.distanceTo(controls.target)-60)/200,.22,1):1;
  fade+=(target-fade)*(dt?1-Math.exp(-dt*8):1);avatar.setFade(fade);
  controls.update();renderer.render(scene,camera);placeLabels();
}

// ---------- sections ----------
function selectSection(section,{keepView=false}={}){
  state.section=section;document.body.dataset.section=section;
  document.querySelectorAll('[data-section-tab]').forEach(b=>{const on=b.dataset.sectionTab===section;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  document.querySelectorAll('[data-for]').forEach(el=>{el.hidden=!el.dataset.for.split(' ').includes(section);});
  state.rate=rates[section];$('rate').value=String(state.rate);
  $('view-number').textContent=section==='beat'?'05':'04';
  if(!keepView)selectView(DEFAULT_VIEW[section]);else showHeart();
  phaseShown='';stageText='';refresh();
}

// ---------- controls ----------
function segmented(attribute,key,after){
  document.querySelectorAll(`[data-${attribute}]`).forEach(button=>button.onclick=()=>{
    state[key]=button.dataset[attribute];
    document.querySelectorAll(`[data-${attribute}]`).forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    after();
  });
}
let showPlay=()=>{};
function bind(){
  $('lead-grid').innerHTML=LEAD_NAMES.map((n,i)=>`<button data-lead="${i}" aria-pressed="false">${n}</button>`).join('');
  $('measure-chips').innerHTML=Object.entries(MEASURES).map(([k,m])=>`<button data-measure="${k}" aria-pressed="false">${m.short}</button>`).join('');
  document.querySelectorAll('[data-lead]').forEach(b=>b.onclick=()=>selectLead(Number(b.dataset.lead)));
  document.querySelectorAll('[data-measure]').forEach(b=>b.onclick=()=>{state.measure=b.dataset.measure;updateGrowth();writeAddress();});
  document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{const k=b.dataset.layer;state.layers[k]=!state.layers[k];b.setAttribute('aria-pressed',String(state.layers[k]));beat3d?.show(state.layers);});
  document.querySelectorAll('[data-gain]').forEach(b=>b.onclick=()=>{state.gain=Number(b.dataset.gain);twelve.set(hb,{gain:state.gain});
    document.querySelectorAll('[data-gain]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});});
  const tabs=[...document.querySelectorAll('[data-section-tab]')];
  tabs.forEach((b,i)=>{b.onclick=()=>selectSection(b.dataset.sectionTab);
    b.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;const n=tabs[(i+d+tabs.length)%tabs.length];n.focus();n.click();};});
  $('age').addEventListener('input',()=>{state.age=Number($('age').value);refresh();});
  $('age-b').addEventListener('input',()=>{state.ageB=Number($('age-b').value);updateGrowth();writeAddress();});
  $('hr').addEventListener('input',()=>{state.hr=Number($('hr').value);state.followResting=false;refresh();});
  $('hr-rest').onclick=()=>{state.followResting=true;refresh();};
  segmented('sex','sex',refresh);segmented('level','level',refresh);segmented('tone','tone',()=>{avatar?.setTone(state.tone);writeAddress();});
  segmented('look','look',()=>{avatar?.setLook(state.look);showFaceOption();writeAddress();});showFaceOption();
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));
  $('rate').onchange=()=>{state.rate=rates[state.section]=Number($('rate').value);};
  showPlay=()=>{$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-pressed',String(state.playing));$('play').setAttribute('aria-label',state.playing?'Pause the heartbeat':'Play the heartbeat');};
  $('play').onclick=()=>{state.playing=!state.playing;showPlay();};showPlay();
  // Dragging through the beat pauses it, so a moment can be studied.
  const scrub=$('scrub');
  scrub.addEventListener('pointerdown',()=>{scrubbing=true;});window.addEventListener('pointerup',()=>{scrubbing=false;});
  scrub.addEventListener('input',()=>{state.playing=false;showPlay();hbTime=Number(scrub.value);scrub.setAttribute('aria-valuetext',`${Math.round(hbTime)} ms from the start of the QRS`);});
  reducedMotion.addEventListener('change',event=>{if(event.matches){state.playing=false;showPlay();}});
  document.addEventListener('visibilitychange',()=>{lastFrame=0;});
  new ResizeObserver(drawECG).observe($('ecg-strip'));
  for(const id of ['growth-chart','compare'])new ResizeObserver(()=>updateGrowth()).observe($(id));
}
// ---------- method dialog ----------
function setupMethod(){
  const d=model.data,t=d.real_children.sinus_tachycardia,ci=v=>`${v.pct.toFixed(1)}% (95% interval ${v.ci95[0].toFixed(1)}–${v.ci95[1].toFixed(1)}%)`;
  $('m-real').innerHTML=`In ${t.n.toLocaleString('en-US')} children aged 1–14 whose hospital ECG was labelled sinus tachycardia (median heart rate ${Math.round(t.heart_rate_median)} bpm), Bazett put ${ci(t.bazett_above_440)} above 440 ms and Fridericia ${ci(t.fridericia_above_440)}. The gap grows with age, from ${t.by_age['1-3'].bazett_above_440.pct.toFixed(1)}% vs ${t.by_age['1-3'].fridericia_above_440.pct.toFixed(1)}% at ages 1–2 to ${t.by_age['10-15'].bazett_above_440.pct.toFixed(1)}% vs ${t.by_age['10-15'].fridericia_above_440.pct.toFixed(1)}% at ages 10–14.`+cite('hvqt','tan2025');
  $('m-check').innerHTML=`Check: ${d.simulator_check.ecgs.toLocaleString('en-US')} full 12-lead ECGs from the Heartverse simulator, at ages ${d.simulator_check.ages.join('–')} and heart rates ${d.simulator_check.heart_rates.join('–')} bpm, were measured with the same software used for the real children. It recovered the set QT with a mean absolute error of ${d.simulator_check.mean_abs_error_ms} ms; at every heart rate the median error stayed between ${d.simulator_check.median_error_range_ms.map(v=>signed(v,0)).join(' and ')} ms.`+cite('hvqt','hv1');
  const ex=d.qt_rr;$('qt-exp-young').textContent=ex['1-3'].exponent.toFixed(2);$('qt-exp-old').textContent=ex['10-15'].exponent.toFixed(2);
  const N={children:heart.data.n_children,profile:heart.data.n_profile_children,young:heart.data.n_profile_age_1_2};
  document.querySelectorAll('[data-n]').forEach(el=>{el.textContent=N[el.dataset.n].toLocaleString('en-US');});
  $('ref-list').innerHTML=referenceListHTML();
  // validation of the typical child, summarised over ages and both sexes
  const V=heart.data.validation,rng=(ages,f)=>{const x=[];for(const s of ['female','male'])for(const a of ages)x.push(f(V[s][String(a)]));return [Math.min(...x),Math.max(...x)];};
  const older=[3,4,5,6,7,8,9,10,11,12,13,14],young=[1,2],r=rng(older,v=>v.median_lead_correlation),ry=rng(young,v=>v.median_lead_correlation);
  const cen=rng(older,v=>Math.min(...['heart_rate_bpm','pr_ms','qrs_ms','qt_ms'].map(k=>v.centiles[k]))),cen2=rng(older,v=>Math.max(...['heart_rate_bpm','pr_ms','qrs_ms','qt_ms'].map(k=>v.centiles[k])));
  const qtY=rng(young,v=>v.centiles.qt_ms),prY=rng(young,v=>v.centiles.pr_ms);
  $('m-valid').innerHTML=`How close it is: the typical child’s beat was measured with the same software as the real children and compared with the real median beat of each age group. At ages 3–14 the median correlation across the 12 leads is ${r[0].toFixed(2)}–${r[1].toFixed(2)} (1 = identical shape), and its heart rate, PR, QRS and QT fall between the ${ord(cen[0]*100)} and ${ord(cen2[1]*100)} centiles of real children of the same age and sex. At ages 1–2 the match is weaker: correlation ${ry[0].toFixed(2)}–${ry[1].toFixed(2)}, QT at the ${ord(qtY[0]*100)}–${ord(qtY[1]*100)} centile and PR at the ${ord(prY[0]*100)}–${ord(prY[1]*100)}, so the page marks those ages as less certain. The JavaScript in this page reproduces the Python simulator to within 0.002 mV (checks/heartbeat.mjs).`+cite('hv1','hv2');
  const dialog=$('method');
  for(const id of ['open-method','open-sources'])$(id).onclick=()=>dialog.showModal();
  $('close-method').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
}
// ---------- shareable state: the address keeps the current section, child, heart rate and view ----------
const ENUMS={section:SECTIONS,sex:['female','male'],level:['p50','p90'],view:['child','body','face','heart'],look:['transparent','skin'],tone:['light','medium','tan','deep'],measure:Object.keys(MEASURES)};
function readAddress(){
  const q=new URLSearchParams(location.search),age=Number(q.get('age')),hr=Number(q.get('hr')),b=Number(q.get('b')),lead=LEAD_NAMES.indexOf(q.get('lead'));
  if(Number.isInteger(age)&&age>=1&&age<=14)state.age=age;
  if(Number.isInteger(b)&&b>=1&&b<=14)state.ageB=b;else state.ageB=state.age>=8?1:14;
  if(lead>=0)state.lead=lead;
  for(const [k,allowed] of Object.entries(ENUMS))if(allowed.includes(q.get(k)))state[k]=q.get(k);
  if(!q.get('view'))state.view=DEFAULT_VIEW[state.section];
  if(Number.isInteger(hr)&&hr>=50&&hr<=190){state.hr=hr;state.followResting=false;}
  if(state.look!=='skin'&&state.view==='face')state.view=DEFAULT_VIEW[state.section];
  const press=(attr,val)=>document.querySelectorAll(`[data-${attr}]`).forEach(b=>{const on=b.dataset[attr]===val;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  press('sex',state.sex);press('level',state.level);press('view',state.view);press('look',state.look);press('tone',state.tone);
}
let addressTimer=0;
function writeAddress(){
  clearTimeout(addressTimer);
  addressTimer=setTimeout(()=>{
    const q=new URLSearchParams(),DEFAULT={section:'beat',age:8,sex:'female',level:'p50',look:'transparent',tone:'medium',measure:'heart_rate_bpm'};
    for(const k in DEFAULT)if(state[k]!==DEFAULT[k])q.set(k,state[k]);
    if(state.view!==DEFAULT_VIEW[state.section])q.set('view',state.view);
    if(state.lead!==1)q.set('lead',LEAD_NAMES[state.lead]);
    if(state.section==='growth'&&state.ageB!==(state.age>=8?1:14))q.set('b',state.ageB);
    if(!state.followResting)q.set('hr',state.hr);
    history.replaceState(null,'',`${location.pathname}${q.size?'?'+q:''}`);   // only settings that differ from the defaults
  },250);
}
// ---------- references: every [n] marker opens entry n of the list in "Method and references" ----------
function fillCites(root=document){root.querySelectorAll('sup.cite[data-cite]').forEach(el=>{el.outerHTML=cite(el.dataset.cite.split(' '));});}
function openReference(key){
  const dialog=$('method');if(!dialog.open)dialog.showModal();
  const el=$(`ref-${key}`);if(!el)return;el.scrollIntoView({block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
}
function bindReferences(){
  document.addEventListener('click',e=>{const a=e.target.closest('sup.cite a[data-ref], .ref-list.compact a[data-ref]');if(!a)return;e.preventDefault();openReference(a.dataset.ref);});
  $('all-refs').onclick=()=>{$('method').showModal();$('ref-list').scrollIntoView({block:'start'});};
}
// The references card lists every reference cited in the part of the page that is showing.
let refsShown='';
function sectionReferences(){
  const keys=[...new Set([...document.querySelectorAll('main sup.cite a[data-ref], footer sup.cite a[data-ref]')].filter(a=>!a.closest('[hidden]')&&!a.closest('.refs-panel')).map(a=>a.dataset.ref))]
    .sort((a,b)=>refNumber(a)-refNumber(b));
  const sig=keys.join();if(sig===refsShown)return;refsShown=sig;
  $('section-refs').innerHTML=referenceListHTML(keys).replace(/<small>[\s\S]*?<\/small>/g,'').replace(/id="ref-([^"]+)"/g,'data-key="$1"')
    .replace(/<li value="(\d+)" data-key="([^"]+)">/g,'<li value="$1"><a href="#ref-$2" data-ref="$2" class="ref-open">[$1]</a> ');
}
async function start(){
  const load=async(url,what)=>{const r=await fetch(url);if(!r.ok)throw new Error(`${what} failed to load (${r.status})`);return r.json();};
  const [profiles,heartData,growthData]=await Promise.all([load('./data/qt-profiles.json','Profile data'),load('./data/child-heart.json','Heartbeat data'),load('./data/growth.json','Growth data')]);
  model=createModel(profiles);heart=createHeartbeat(heartData);heart.data=heartData;growth=growthData;
  twelve=createTwelveLead($('twelve'),selectLead);planes=createPlanes($('planes'));
  readAddress();bind();createLabels();
  document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(state.layers[b.dataset.layer])));
  setReferenceData({children:heartData.n_children.toLocaleString('en-US'),profile:heartData.n_profile_children.toLocaleString('en-US'),
    realTachy:profiles.real_children.sinus_tachycardia.n.toLocaleString('en-US'),simECGs:profiles.simulator_check.ecgs.toLocaleString('en-US')});
  fillCites();bindReferences();
  selectSection(state.section,{keepView:true});selectView(state.view);renderReal();setupMethod();sectionReferences();
  requestAnimationFrame(animate);
  await createScene();
}
start().catch(error=>{
  console.error(error);
  const loading=$('loading');if(loading)loading.textContent='The 3D view could not load. Check your connection and WebGL support, then reload.';
});
