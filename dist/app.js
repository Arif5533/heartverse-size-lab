import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { reference, lookup, adultReference, lookupAdult, ecgReference } from './reference.js?v=2';
import { ecgBands, defaultBand, ecgParameters, buildECG, LEAD_II } from './ecg.js?v=1';
import { createContrastMaterial } from './appearance.js';

const $=id=>document.getElementById(id);
let population='children', sex='female', current=lookup(1,'female');
const sources=[
  {tag:'MOTION EXAMPLE · RELEASED RESEARCH',title:'Time2Track repository — shift-invariant baseline',text:'The side panel replays the released Subject A comparison of prediction and ground truth. All 49 frames are retained. This baseline example is independent of the size explorer and its illustrative motion; the site does not run ECG inference. Playback uses an adjustable display rate because the GIF has no frame durations.',url:'https://github.com/Chrisa142857/time2track/blob/0a9da5232b6902dccf2fcf3db0a50019fe4c8745/example_ecg_gif/ecg_heart_shift_invariant_8L_256d_49frames_subjectA.gif'},
  {tag:'SAMPLE ECG · CHILDREN · 2001',title:'Rijnbeek et al. — New normal limits for the paediatric electrocardiogram',text:'1912 healthy Dutch children, 12-lead ECGs at 1200 Hz. The sample ECG uses the median heart rate, PR, P and QRS duration, Bazett QTc, P and QRS axes, and lead II P and R amplitudes for boys and girls aged 1–16. Wave shapes, the T-wave direction and front–back loop components are illustrative.',url:ecgReference.pediatric.doi},
  {tag:'SAMPLE ECG · ADULTS · 2014',title:'Rijnbeek et al. — Normal values of the electrocardiogram for ages 16–90 years',text:'13,354 cardiologically healthy adults (7326 men). The adult-men sample ECG uses median heart rate, PQ (PR), P and QRS duration, Bazett QTc, and P, QRS and T axes by age group. Adult wave amplitudes are illustrative.',url:ecgReference.adultMen.doi},
  {tag:'3D MODEL · CC BY 4.0',title:'Human_heart_3d_model — marxtrax',text:'A textured anatomical cutaway with valves and internal muscle detail. Adapted materials, lighting, orientation and uniform scale. This illustration is not a pediatric scan and does not establish age-specific morphology.',url:'https://sketchfab.com/3d-models/human-heart-3d-model-5e442ad98b574fdf844432b246fcf323'},
  {tag:'NUMERICAL FOUNDATION · 2025', title:'Xu et al. — Pediatric MRI reference centiles', text:'191 healthy Chinese children, ages 4–18. Table 4 supplies the 50th and 5th–95th centiles for LV end-diastolic volume by body surface area and sex. Smooth segmentation includes trabeculations and papillary muscles in cavity volume.',url:reference.table},
  {tag:'RECENT EVIDENCE REVIEWED · OCT 6, 2026',title:'Li et al. — Biventricular structural and functional references',text:'A newer single-centre study includes ages 0.25–18. The early article version reports age-group means and reference curves. Its dimensional table is not used here: means are not medians, and the youngest subgroup contains few participants. It does not validate infant simulation.',url:'https://doi.org/10.1186/s12887-026-07718-1'},
  {tag:'ADULT NUMERICAL FOUNDATION · 2025',title:'SCMR reference values — 2025 update, Table 3',text:'Adult men: pooled mean LVEDV 143 ± 31 mL, published lower–upper reference limits 81–204 mL, n = 4867. Papillary muscles and trabeculations are included in cavity volume. These are means, not pediatric medians. Adult mode explores volume within these limits; it does not infer volume from age or BSA.',url:adultReference.table},
  {tag:'NEWBORN EVIDENCE · 2023',title:'Vøgg et al. — Copenhagen Baby Heart Study',text:'Published newborn echocardiographic references exist. Their population and imaging method differ from this MRI reference; they are not substituted into the current slider. A separately specified neonatal model would require its own validated geometry and parameters.',url:'https://pubmed.ncbi.nlm.nih.gov/37257953/'}
];
$('source-list').innerHTML=sources.map(s=>`<article class="source-item"><div class="source-meta">${s.tag}</div><h3>${s.title}</h3><p>${s.text}</p><a href="${s.url}" target="_blank" rel="noopener noreferrer">Read the published source ↗</a></article>`).join('');
$('method-description').textContent='The slider selects exact 0.1 m² rows from Xu’s Table 4, without interpolation or extrapolation. The textured anatomical illustration is not a segmented pediatric scan; its cavity volume is not calibrated to the numerical output. Every linear dimension of the illustration scales by the cube root of the volume ratio. Uniform whole-heart scaling is a visual assumption, not a finding of the study. The 5th–95th centiles describe a reference distribution, not a confidence interval or an individual prediction.';
$('reference-note').textContent='191 healthy children · Chinese cohort. Reference values are population-specific.';
for(const id of ['open-evidence','inspect-source','open-method']) $(id).onclick=()=>$('evidence').showModal();
$('close-evidence').onclick=()=>$('evidence').close();
$('evidence').addEventListener('click',e=>{if(e.target===$('evidence')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('download-data').onclick=()=>{
  const payload={reference:population==='adult-men'?adultReference:reference,population,current_setting:current,illustrative_cycle:{phase:motionPhase,stage:cycleStage(motionPhase),playing:motionPlaying,speed:motionRate(),note:'Illustrative deformation only. LVEDV is the selected published reference and is not a measurement of the animated mesh.'},sample_ecg:{...ecgModel.params,qt:Math.round(ecgModel.params.qt),lead:'II',paper:'25 mm/s, 10 mm/mV',reference:population==='adult-men'?ecgReference.adultMen:ecgReference.pediatric,illustrative_values:ecgReference.illustrative,note:'Illustrative waveform from published median intervals and axes. Not computed from the 3D mesh, not a patient ECG, not diagnostic. Heart size does not change the ECG.'},reviewed_sources:sources,geometry:'Licensed anatomical illustration by marxtrax (CC BY 4.0). Whole illustration uniformly scales with cube root of published LVEDV ratio. The mesh cavity is not calibrated to the numerical volume; morphology is not validated pediatric anatomy. No age, infant, ECG, disease or transfer prediction.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='heartverse-reference.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

const wrap=$('canvas-wrap');
let renderer,scene,camera,controls,heart,ghost,anatomy,lineGroup,motionRoot,anatomyPoints;
let targetScale=1,displayScale=1;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPhase=0,motionPlaying=!reducedMotion.matches,lastFrame=0;
const motionRate=()=>Number($('motion-rate').value);
// Sample ECG state. The age group is remembered per population; beatCount
// keeps the scrolling strip continuous across cycles.
const ecgBandFor={children:defaultBand('children'),'adult-men':defaultBand('adult-men')};
let ecgModel,ecgLoop,ecgTrace,ecgMarker,beatCount=0;
const LOOP_SCALE=38; // scene units per mV
const baseVolume=72.2;
let viewPreset='exterior';
const originalMaterials=new Map(),featureOverlays=new Map();
const appearanceUniforms={tissueOpacity:{value:.25},vesselEmphasis:{value:1},surfaceDetail:{value:.85}};

function configurePopulation(){
  const adult=population==='adult-men';
  $('size').min=adult?81:.6;$('size').max=adult?204:1.9;$('size').step=adult?1:.1;$('size').value=adult?143:1;
  $('child-sex').hidden=adult;
  $('study-title').textContent=adult?'SCMR · 2025 MRI':'Xu et al. · 2025 MRI';
  $('study-population').textContent=adult?'Adult men · pooled references':'Healthy children · ages 4–18';
  $('reference-note').textContent=adult?'4,867 men · Mean 143 ± 31 mL. Separate adult reference; not a childhood growth curve.':'191 healthy children · Chinese cohort. Reference values are population-specific.';
  $('reference-badge').textContent=adult?'2025 MRI · ADULT MEAN':'2025 MRI MEDIANS';
  $('size-label').textContent=adult?'LV cavity volume':'Body surface area';
  $('range-min').textContent=adult?'81 mL':'0.6 m²';$('range-max').textContent=adult?'204 mL':'1.9 m²';
  $('baseline').textContent=adult?'Mean · 143':'Baseline · 1.0';
  $('slider-help').textContent=adult?'Explore volumes within the published adult reference limits. Only 143 mL is the pooled mean; other positions are illustrative choices, not age or body-size predictions.':'Each step selects a published median. Body surface area is a measure of body size, not age.';
  $('ghost-label').textContent=$('bar-baseline').textContent=adult?'143 mL mean baseline':'1.0 m² baseline';
  $('interval-title').textContent=adult?'Reference limits':'Reference centiles';
  $('interval-caption').textContent=adult?'Lower–upper · mL':'5th–95th · mL';
  $('reference-stat').textContent=adult?'Adult men · pooled mean':'Same sex · BSA 1.0 m²';
  $('difference-caption').textContent=adult?'From 143 mL mean':'From 1.0 m² baseline';
  $('citation-title').textContent=adult?'SCMR, 2025':'Xu et al., 2025';
  $('citation-meta').textContent=adult?'4,867 men · cardiac MRI · Table 3 · Mean ± SD and reference limits':'191 children · 3T cardiac MRI · Table 4 · BSA reference centiles';
  $('method-description').textContent=(adult?'The adult slider selects an illustrative LV cavity volume between the published lower and upper reference limits (81–204 mL). Its baseline is the pooled mean of 143 mL (SD 31 mL), not a median. Intermediate slider positions are not additional published means or centiles. No age-to-volume or BSA-to-volume relationship is inferred. ':'The child slider selects exact 0.1 m² rows from Xu’s Table 4, without interpolation or extrapolation. The 5th–95th centiles describe a reference distribution, not a confidence interval or individual prediction. ')+ 'The textured anatomical illustration is not a calibrated scan; its cavity volume is not measured here. All linear dimensions scale by the cube root of the volume ratio. Uniform whole-heart scaling is a visual assumption, not a finding of either source. The two populations are separate reference modes, not a validated growth or transfer model.';
  configureECG();
  update();
}
function configureECG(){
  const bands=ecgBands(population);
  $('ecg-age').innerHTML=bands.map((label,i)=>`<option value="${i}">${label}</option>`).join('');
  $('ecg-age').value=ecgBandFor[population];
  ecgModel=buildECG(ecgParameters(population,sex,ecgBandFor[population]));
  const p=ecgModel.params;
  $('ecg-readout').innerHTML=`<b>${p.hr.median}</b> bpm <i>·</i> PR ${p.pr.median} <i>·</i> QRS ${p.qrsDur.median} <i>·</i> QT ${Math.round(p.qt)} ms`;
  $('ecg-context').textContent=`${population==='adult-men'?'Men':sex==='male'?'Boys':'Girls'} · ${p.study} medians`;
  $('ecg-strip').setAttribute('aria-label',`Sample lead II ECG for ${population==='adult-men'?'men':sex==='male'?'boys':'girls'} aged ${p.bandLabel}: heart rate ${p.hr.median} per minute, PR ${p.pr.median} ms, QRS ${p.qrsDur.median} ms, QT ${Math.round(p.qt)} ms. Illustrative waveform built from published medians.`);
  if(ecgLoop)rebuildLoop();
  drawECG();
}
$('ecg-age').onchange=()=>{ecgBandFor[population]=Number($('ecg-age').value);configureECG();};
$('ecg-loop').onclick=()=>{const on=$('ecg-loop').getAttribute('aria-pressed')!=='true';$('ecg-loop').setAttribute('aria-pressed',String(on));if(ecgLoop)ecgLoop.visible=on;};
// Lead II on standard paper: 25 mm/s and 10 mm/mV, so 1 mV spans the width of 0.4 s.
function drawECG(){
  const canvas=$('ecg-strip');if(!ecgModel||!canvas.clientWidth)return;
  const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const span=2.4,pxPerS=w/span,pxPerMv=pxPerS*.4,base=h*.7,now=(beatCount+motionPhase)*ecgModel.rr,start=now-span;
  for(let k=Math.ceil(start/.04);k*.04<=now;k++){const x=Math.round((k*.04-start)*pxPerS)+.5;ctx.strokeStyle=k%5===0?'#d8c49f2e':'#d8c49f12';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let k=-Math.floor(base/(pxPerMv*.1));k*pxPerMv*.1<=h-base;k++){const y=Math.round(base+k*pxPerMv*.1)+.5;ctx.strokeStyle=k%5===0?'#d8c49f2e':'#d8c49f12';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.strokeStyle='#f0d9ad';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.beginPath();
  for(let x=0;x<=w;x++){const y=base-ecgModel.lead(start+x/pxPerS)*pxPerMv;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.stroke();
  const y=base-ecgModel.lead(now)*pxPerMv;ctx.fillStyle='#fff3d6';ctx.shadowColor='#f0d9ad';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(w-3,y,2.6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}
// Vectorcardiogram: the heart's electrical vector traced through one beat.
// Patient axes (left, inferior, anterior) map to scene x, −y and z in the
// anterior (cutaway) pose; the loop turns with the view presets.
const toScene=v=>new THREE.Vector3(v[0]*LOOP_SCALE,-v[1]*LOOP_SCALE,v[2]*LOOP_SCALE);
// WebGL lines are one pixel wide, so each wave's loop is a thin tube.
function rebuildLoop(){
  const m=ecgModel,qrsEnd=m.qrsOnset+m.params.qrsDur.median/1000;
  const spans={P:[m.pOnset-.005,m.qrsOnset],QRS:[m.qrsOnset,qrsEnd+.01],T:[qrsEnd+.01,m.pOnset+m.rr-.005]};
  for(const tube of ecgTrace.children){
    const [a,b]=spans[tube.name],points=[];
    for(let i=0;i<=160;i++)points.push(toScene(m.vector(a+(b-a)*i/160)));
    tube.geometry.dispose();tube.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),320,.55,6,false);
  }
  updateLoopMarker();
}
function updateLoopMarker(){if(ecgMarker&&ecgModel)ecgMarker.position.copy(toScene(ecgModel.vector(motionPhase*ecgModel.rr)));}
function createLoop(){
  ecgLoop=new THREE.Group();ecgLoop.renderOrder=6;
  const overlay={transparent:true,depthTest:false,depthWrite:false};
  ecgTrace=new THREE.Group();
  for(const [name,color] of [['P','#8fd6c8'],['QRS','#f0d9ad'],['T','#e49a87']]){const tube=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color,opacity:.92,...overlay}));tube.name=name;tube.renderOrder=6;ecgTrace.add(tube);}
  const lead=new THREE.Line(new THREE.BufferGeometry().setFromPoints([toScene(LEAD_II.map(x=>-x*1.8)),toScene(LEAD_II.map(x=>x*1.8))]),new THREE.LineDashedMaterial({color:'#d8c49f',dashSize:3,gapSize:3,opacity:.35,...overlay}));
  lead.computeLineDistances();lead.renderOrder=5;
  ecgMarker=new THREE.Mesh(new THREE.SphereGeometry(1.8,16,12),new THREE.MeshBasicMaterial({color:'#fff3d6',...overlay}));ecgMarker.renderOrder=7;
  const origin=new THREE.Mesh(new THREE.SphereGeometry(.9,12,8),new THREE.MeshBasicMaterial({color:'#d8c49f',opacity:.6,...overlay}));
  ecgLoop.add(lead,ecgTrace,origin,ecgMarker);ecgLoop.visible=$('ecg-loop').getAttribute('aria-pressed')==='true';
  scene.add(ecgLoop);rebuildLoop();
}
function update(){
  const adult=population==='adult-men', value=Number($('size').value);
  current=adult?lookupAdult(value):lookup(value,sex);
  $('size-value').innerHTML=adult?`${value}<span>mL</span>`:`${current.bsa.toFixed(1)}<span>m²</span>`;
  $('size').style.setProperty('--fill',`${(value-Number($('size').min))/(Number($('size').max)-Number($('size').min))*100}%`);
  $('size').setAttribute('aria-valuetext',adult?`${value} millilitres; ${current.statistic}`:`${current.bsa.toFixed(1)} square metres; median LV volume ${current.volume.toFixed(1)} millilitres`);
  $('diameter').textContent=current.volume.toFixed(1);
  const lower=adult?current.lower:current.p5, upper=adult?current.upper:current.p95;
  $('track-low').textContent=`${lower.toFixed(1)} mL`;$('track-high').textContent=`${upper.toFixed(1)} mL`;
  $('interval-marker').style.left=`${(current.volume-lower)/(upper-lower)*100}%`;
  document.querySelector('.reference-track').setAttribute('aria-label',`Selected LV volume ${current.volume.toFixed(1)} mL; reference interval ${lower} to ${upper} mL. Position is not a percentile.`);
  $('length').textContent=adult?`${current.lower}–${current.upper}`:`${current.p5.toFixed(1)}–${current.p95.toFixed(1)}`;
  $('reference-diameter').textContent=`${current.baseline.toFixed(1)} mL`;
  const difference=(current.volume/current.baseline-1)*100;
  $('delta').textContent=`${difference>0?'+':''}${difference.toFixed(1)}%`;
  $('scale-factor').textContent=`${current.scale.toFixed(2)}×`;
  $('scale-bar').style.width=`${current.scale/1.5*100}%`;
  $('dimension-label').textContent=`${adult?(value===143?'Mean':'Selected'):'Median'} · ${current.volume.toFixed(1)} mL`;
  $('metric-context').textContent=adult?(value===143?'Pooled mean · adult men · SD 31 mL':'Selected volume · adult men · exploratory'):`50th percentile · ${sex==='female'?'girls':'boys'} · ${current.bsa.toFixed(1)} m²`;
  $('takeaway').textContent='Volume changes in three dimensions. The illustration’s linear size follows the cube root of the volume ratio.';
  targetScale=Math.cbrt(current.volume/baseVolume);
  // animate() eases toward targetScale; snap when motion is reduced or before
  // the scene exists so the heart never shows a stale size.
  if(reducedMotion.matches||!heart)displayScale=targetScale;
  if(heart)heart.scale.setScalar(displayScale);if(ghost)ghost.scale.setScalar(Math.cbrt(current.baseline/baseVolume));
}
$('population').onchange=()=>{population=$('population').value;configurePopulation();};
$('size').addEventListener('input',update);
document.querySelectorAll('[data-sex]').forEach(button=>button.onclick=()=>{
  sex=button.dataset.sex;
  document.querySelectorAll('[data-sex]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  configureECG();update();
});
$('baseline').onclick=()=>{$('size').value=population==='adult-men'?143:1;update();};
// Display timing and deformation are illustrative, independent of the LVEDV reference.
function cycleStage(phase){return phase<.12||phase===1?'Full · diastole':phase<.42?'Contraction':phase<.52?'Contracted':'Relaxation & filling';}
function setMotion(phase){
  motionPhase=THREE.MathUtils.clamp(phase,0,1);
  const stage=cycleStage(motionPhase),percent=Math.round(motionPhase*100);
  $('motion-phase').value=percent;
  $('motion-phase').setAttribute('aria-valuetext',`${percent}% · ${stage}`);
  $('motion-stage').textContent=stage;
  $('motion-phase').style.setProperty('--fill',`${percent}%`);
  if(motionRoot){
    const smooth=t=>t*t*(3-2*t);
    const squeeze=phase<.12?0:phase<.42?smooth((phase-.12)/.3):phase<.52?1:1-smooth((phase-.52)/.48);
    motionRoot.scale.set(1-.065*squeeze,1-.04*squeeze,1-.065*squeeze);
    motionRoot.position.y=-2.2*squeeze;motionRoot.rotation.z=.012*squeeze;
  }
  drawECG();updateLoopMarker();
}
function updateMotionButton(){
  $('motion-play').textContent=motionPlaying?'Ⅱ':'▶';
  $('motion-play').setAttribute('aria-label',motionPlaying?'Pause 4D cycle':'Play 4D cycle');
  $('motion-play').setAttribute('aria-pressed',String(motionPlaying));
}
$('motion-play').onclick=()=>{motionPlaying=!motionPlaying;updateMotionButton();};
$('motion-phase').addEventListener('input',()=>{motionPlaying=false;updateMotionButton();setMotion(Number($('motion-phase').value)/100);});
$('motion-reference').onclick=()=>{motionPlaying=false;updateMotionButton();setMotion(0);};
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){motionPlaying=false;updateMotionButton();}});
// A background tab resumes from its current phase without a large time jump.
document.addEventListener('visibilitychange',()=>{lastFrame=0;});
updateMotionButton();

async function createScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0e171d,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.domElement.setAttribute('aria-label','Textured anatomical heart illustration; drag to rotate. Numerical volumes are published references, not measurements of this mesh.');
  renderer.domElement.setAttribute('role','img');wrap.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x15202a,.0007);
  camera=new THREE.PerspectiveCamera(34,1,.1,2000);camera.position.set(35,18,450);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=230;controls.maxDistance=580;controls.autoRotateSpeed=.4;controls.maxPolarAngle=Math.PI*.85;
  scene.add(new THREE.HemisphereLight(0xd4e4e9,0x15131c,.85));
  for(const [color,pos,intensity] of [[0xffe3d1,[-120,160,170],2.8],[0x8ecfe5,[110,50,-100],3.5],[0xe5d7e2,[110,-30,180],.8]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
  heart=new THREE.Group();scene.add(heart);
  // Progress counts files (glTF, geometry, three textures), not bytes.
  const manager=new THREE.LoadingManager();
  manager.onProgress=(url,loaded,total)=>{const pct=Math.round(loaded/total*100);$('loading-fill').style.width=`${pct}%`;$('loading-pct').textContent=`${pct}%`;};
  const gltf=await new GLTFLoader(manager).loadAsync('./models/anatomical-heart/scene.gltf');
  const source=gltf.scene;source.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  source.position.sub(center);
  motionRoot=new THREE.Group();heart.add(motionRoot);
  anatomy=new THREE.Group();anatomy.add(source);anatomy.scale.setScalar(130/size.y);motionRoot.add(anatomy);
  source.traverse(object=>{if(!object.isMesh)return;
    object.material=object.material.clone();const mat=object.material;
    mat.roughness=.63;mat.metalness=0;mat.normalScale?.set(1,1);mat.aoMapIntensity=1.1;
    for(const texture of [mat.map,mat.normalMap,mat.aoMap])if(texture)texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    originalMaterials.set(object,mat);
  });
  // A posed surface copy is the fixed comparison mesh. It is off by default
  // so reference wirework does not obscure tissue detail.
  ghost=new THREE.Group();scene.add(ghost);heart.scale.setScalar(1);heart.updateMatrixWorld(true);
  source.traverse(object=>{if(!object.isMesh)return;
    const geometry=object.geometry.clone(),positions=geometry.attributes.position;
    const vertex=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){object.getVertexPosition(i,vertex);object.localToWorld(vertex);positions.setXYZ(i,vertex.x,vertex.y,vertex.z);}
    geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#f2c98a',wireframe:true,transparent:true,opacity:.06,depthTest:false,depthWrite:false}));mesh.renderOrder=3;ghost.add(mesh);
  });
  // Sample the posed source surface once. Dots retain the exact model geometry.
  const dotPositions=[],dotColors=[],seen=new Set(),dotVertex=new THREE.Vector3();
  const low=new THREE.Color('#ddaba6'),high=new THREE.Color('#a5dfd7');
  source.traverse(object=>{if(!object.isMesh)return;
    const count=object.geometry.attributes.position.count,step=Math.max(1,Math.ceil(count/14000));
    for(let i=0;i<count;i+=step){
      object.getVertexPosition(i,dotVertex);object.localToWorld(dotVertex);
      const key=[dotVertex.x,dotVertex.y,dotVertex.z].map(n=>Math.round(n*5)).join(',');
      if(seen.has(key))continue;seen.add(key);
      dotPositions.push(dotVertex.x,dotVertex.y,dotVertex.z);
      const color=low.clone().lerp(high,THREE.MathUtils.clamp((dotVertex.y+65)/130,0,1));dotColors.push(color.r,color.g,color.b);
    }
  });
  const dotGeometry=new THREE.BufferGeometry();
  dotGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dotPositions,3));
  dotGeometry.setAttribute('color',new THREE.Float32BufferAttribute(dotColors,3));
  const dotCanvas=document.createElement('canvas');dotCanvas.width=dotCanvas.height=32;
  const dotContext=dotCanvas.getContext('2d');dotContext.fillStyle='#fff';dotContext.beginPath();dotContext.arc(16,16,14,0,Math.PI*2);dotContext.fill();
  anatomyPoints=new THREE.Points(dotGeometry,new THREE.PointsMaterial({size:.55,map:new THREE.CanvasTexture(dotCanvas),vertexColors:true,transparent:true,opacity:.85,alphaTest:.2,depthWrite:false}));
  anatomyPoints.visible=false;motionRoot.add(anatomyPoints);
  ghost.visible=$('ghost').checked;
  const grid=new THREE.GridHelper(340,24,0x414d42,0x303c32);grid.position.y=-83;grid.material.transparent=true;grid.material.opacity=.08;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(58,58.3,100),new THREE.MeshBasicMaterial({color:0x66705e,transparent:true,opacity:.22,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-82.8;scene.add(ring);
  lineGroup=new THREE.Group();const points=[new THREE.Vector3(23,-20,18),new THREE.Vector3(47,-24,20),new THREE.Vector3(57,-24,20)];
  lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#dbc59e',transparent:true,opacity:.45})));motionRoot.add(lineGroup);
  createLoop();
  new ResizeObserver(resize).observe(wrap);new ResizeObserver(drawECG).observe($('ecg-strip'));resize();$('loading').remove();update();selectView(viewPreset);applySurface();setMotion(motionPhase);animate();
}
function resize(){
  if(!renderer)return;const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=24;
  // When the ECG card floats beside the heart, shift the image (not the orbit
  // pivot) so the heart centres in the remaining space.
  const card=$('ecg-card'),floating=getComputedStyle(card).position==='absolute'&&card.offsetWidth&&w>card.offsetWidth*2.2;
  const shift=floating?Math.round((card.offsetWidth+16)/2):0;
  if(shift)camera.setViewOffset(w,h,shift,0,w,h);else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function resetCamera(){camera.position.set(35,18,450);controls.target.set(0,0,0);controls.update();}
function reveal(){
  if(anatomy){anatomy.rotation.y=viewPreset==='exterior'?Math.PI:viewPreset==='side'?Math.PI/2:0;ghost.rotation.y=anatomy.rotation.y;if(anatomyPoints)anatomyPoints.rotation.y=anatomy.rotation.y;if(ecgLoop)ecgLoop.rotation.y=anatomy.rotation.y;}
  $('view-mode').textContent=({cutaway:'CUTAWAY',exterior:'EXTERIOR',side:'SIDE VIEW',superior:'VIEW FROM ABOVE'})[viewPreset];
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===viewPreset;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('cutaway').checked=viewPreset==='cutaway';
  $('lv-label').hidden=true;
  if(lineGroup)lineGroup.visible=false;
}
function selectView(name){
  viewPreset=name;
  if(controls){controls.autoRotate=false;$('rotate').classList.remove('active');$('rotate').setAttribute('aria-pressed','false');resetCamera();if(name==='superior'){camera.position.set(25,390,220);controls.update();}}
  reveal();$('viewer-status').textContent='View preset selected · drag to orbit';
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));
$('cutaway').onchange=()=>selectView($('cutaway').checked?'cutaway':'exterior');
$('ghost').onchange=()=>{if(ghost)ghost.visible=$('ghost').checked;};
$('dimensions').onchange=()=>{$('volume-card').hidden=!$('dimensions').checked;};
function applySurface(){
  const mode=$('surface').value,contrast=mode==='contrast'||mode==='transparent';
  if(anatomy)anatomy.visible=mode!=='points';if(anatomyPoints)anatomyPoints.visible=mode==='points';
  for(const [mesh,original] of originalMaterials){
    const previous=featureOverlays.get(mesh);
    if(previous){previous.removeFromParent();previous.material.dispose();featureOverlays.delete(mesh);}
    if(mesh.material!==original)mesh.material.dispose();
    mesh.material=contrast?createContrastMaterial(original,appearanceUniforms):(mode==='tissue'||mode==='points')?original:new THREE.MeshStandardMaterial({color:mode==='wire'?0xb7c9c4:0xc3b4a0,normalMap:mode==='clay'?original.normalMap:null,aoMap:original.aoMap,aoMapIntensity:1.2,roughness:.72,metalness:0,wireframe:mode==='wire',side:THREE.DoubleSide});
    if(contrast){
      const overlay=mesh.clone(false);overlay.name='Existing painted vessel detail';
      overlay.material=createContrastMaterial(original,appearanceUniforms,true);
      mesh.parent.add(overlay);featureOverlays.set(mesh,overlay);
    }
  }
  applyDetail();
  $('contrast-settings').hidden=!contrast;
  document.querySelectorAll('[data-render]').forEach(b=>{const active=b.dataset.render===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('surface-badge').textContent=({contrast:'COLOR DETAIL',transparent:'TRANSPARENT ANATOMY',tissue:'ORIGINAL TISSUE',clay:'SCULPTED SURFACE',wire:'MESH STRUCTURE',points:'DOT ANATOMY'})[mode];
  $('viewer-status').textContent=contrast?'Color detail highlights existing painted features. Tissue opacity controls the shell.':mode==='points'?'Dots sample the existing anatomical surface.':mode==='wire'?'Mesh structure · artistic geometry':mode==='clay'?'Sculpted surface · texture hidden':'Original anatomical tissue';
}
function updateAppearance(){
  appearanceUniforms.tissueOpacity.value=Number($('tissue-opacity').value)/100;
  appearanceUniforms.vesselEmphasis.value=Number($('vessel-emphasis').value)/100;
  for(const id of ['tissue-opacity','vessel-emphasis']){
    const input=$(id),value=Number(input.value);
    $(id+'-value').textContent=`${value}%`;
    input.style.setProperty('--fill',`${(value-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
  }

}
function selectSurface(mode){
  $('surface').value=mode;
  if(mode==='contrast')$('tissue-opacity').value=85;
  if(mode==='transparent')$('tissue-opacity').value=25;
  updateAppearance();applySurface();
}
function applyDetail(){
  const detail=Number($('surface-detail').value)/100;
  appearanceUniforms.surfaceDetail.value=detail;
  $('surface-detail-value').textContent=`${Math.round(detail*100)}%`;
  $('surface-detail').style.setProperty('--fill',`${detail/1.5*100}%`);
  for(const [mesh] of originalMaterials){
    mesh.material.normalScale?.setScalar(.45+detail*1.2);
    featureOverlays.get(mesh)?.material.normalScale?.setScalar(.45+detail*1.2);
  }
}
$('surface-detail').oninput=applyDetail;
$('surface').onchange=()=>selectSurface($('surface').value);
const appearanceMenu=$('appearance-menu');
document.addEventListener('pointerdown',event=>{if(!appearanceMenu.contains(event.target))appearanceMenu.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&appearanceMenu.open){appearanceMenu.open=false;appearanceMenu.querySelector('summary').focus();}});
for(const id of ['tissue-opacity','vessel-emphasis'])$(id).oninput=updateAppearance;
document.querySelectorAll('[data-render]').forEach(b=>b.onclick=()=>selectSurface(b.dataset.render));
updateAppearance();
$('exposure').oninput=()=>{const n=Number($('exposure').value);if(renderer)renderer.toneMappingExposure=1.25*n/100;$('exposure-value').textContent=`${n}%`;$('exposure').style.setProperty('--fill',`${(n-60)/90*100}%`);};
$('focus-view').onclick=()=>{const on=document.body.classList.toggle('focus-mode');$('focus-view').setAttribute('aria-pressed',String(on));$('focus-view').setAttribute('aria-label',on?'Exit focus view':'Focus on the heart');$('focus-view').innerHTML=on?'⛶ <span>Exit focus</span>':'⛶ <span>Focus</span>';};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('focus-mode'))$('focus-view').click();});
$('snapshot').onclick=()=>{
  if(!renderer||!anatomy){$('viewer-status').textContent='Please wait for the anatomy to load.';return;}
  displayScale=targetScale;heart.scale.setScalar(displayScale);
  renderer.render(scene,camera);
  const out=document.createElement('canvas');out.width=renderer.domElement.width;out.height=renderer.domElement.height;
  const ctx=out.getContext('2d');ctx.fillStyle='#10191e';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(renderer.domElement,0,0);
  const unit=out.width/900;ctx.fillStyle='#edeee7';ctx.font=`${22*unit}px sans-serif`;ctx.fillText('Heartverse · Anatomy studio',28*unit,40*unit);
  ctx.font=`${14*unit}px sans-serif`;ctx.fillStyle='#ddc69f';ctx.fillText(`${$('dimension-label').textContent} | ${population==='adult-men'?'Adult men':sex==='female'?'Girls':'Boys'} | ${$('view-mode').textContent} | ${$('surface-badge').textContent}`,28*unit,66*unit);
  ctx.fillStyle='#afbdba';ctx.font=`${11*unit}px sans-serif`;ctx.fillText(`Illustrative 4D motion · Phase ${Math.round(motionPhase*100)}% · LVEDV is the reference value · Sample ECG loop: ${ecgModel.params.bandLabel}, ${ecgModel.params.study} medians, illustrative shape`,28*unit,out.height-40*unit);
  ctx.font=`${9*unit}px sans-serif`;ctx.fillText('Model: marxtrax · CC BY 4.0 · Reference: '+(population==='adult-men'?'SCMR 2025, Table 3':'Xu 2025, Table 4'),28*unit,out.height-21*unit);
  const a=document.createElement('a');a.download='heartverse-anatomy-view.png';a.href=out.toDataURL('image/png');a.click();$('viewer-status').textContent='Saved PNG with reference and model attribution';
};
$('rotate').onclick=()=>{if(!controls)return;controls.autoRotate=!controls.autoRotate;$('rotate').classList.toggle('active',controls.autoRotate);$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};
for(const [id,factor] of [['zoom-in',.86],['zoom-out',1.16]])$(id).onclick=()=>{if(!camera)return;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();};
$('reset-view').onclick=()=>selectView(viewPreset);
$('reset-all').onclick=()=>{
  motionPlaying=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;$('motion-rate').value='1';beatCount=0;setMotion(0);updateMotionButton();
  for(const key in ecgBandFor)ecgBandFor[key]=defaultBand(key);$('ecg-loop').setAttribute('aria-pressed','true');if(ecgLoop)ecgLoop.visible=true;
  sex='female';document.querySelectorAll('[data-sex]').forEach(b=>{b.classList.toggle('active',b.dataset.sex===sex);b.setAttribute('aria-pressed',String(b.dataset.sex===sex));});
  population='children';$('population').value=population;configurePopulation();
  viewPreset='exterior';$('vessel-emphasis').value=100;$('surface-detail').value=85;selectSurface('transparent');$('exposure').value=100;$('exposure').oninput();
  $('size').value=1;$('ghost').checked=false;$('cutaway').checked=false;$('dimensions').checked=true;
  if(controls){controls.autoRotate=false;$('rotate').classList.remove('active');$('rotate').setAttribute('aria-pressed','false');resetCamera();if(ghost)ghost.visible=false;reveal();$('dimensions').onchange();}update();
};
function animate(time=0){
  requestAnimationFrame(animate);
  const delta=lastFrame?Math.min((time-lastFrame)/1000,.05):0;lastFrame=time;
  // 1× plays one cycle per beat at the selected age group's median heart rate.
  if(motionPlaying&&!document.hidden){const next=motionPhase+delta*(ecgModel.params.hr.median/60)*motionRate();if(next>=1)beatCount++;setMotion(next%1);}
  if(displayScale!==targetScale){
    displayScale=Math.abs(targetScale-displayScale)<1e-4?targetScale:displayScale+(targetScale-displayScale)*(1-Math.exp(-delta*9));
    heart.scale.setScalar(displayScale);
  }
  controls.update();
  renderer.render(scene,camera);
}
// "Copy link" encodes the current exploration in the query string; the hash
// stays free for #research. Incoming values are validated and snapped to
// the slider's published steps.
function shareURL(){
  const params=new URLSearchParams({p:population,s:sex,v:$('size').value,view:viewPreset,look:$('surface').value,ecg:ecgBandFor[population]});
  return `${location.origin}${location.pathname}?${params}`;
}
function applySharedView(){
  const q=new URLSearchParams(location.search);
  if(['children','adult-men'].includes(q.get('p'))){population=q.get('p');$('population').value=population;}
  if(['female','male'].includes(q.get('s'))){sex=q.get('s');document.querySelectorAll('[data-sex]').forEach(b=>{b.classList.toggle('active',b.dataset.sex===sex);b.setAttribute('aria-pressed',String(b.dataset.sex===sex));});}
  if(['cutaway','exterior','side','superior'].includes(q.get('view')))viewPreset=q.get('view');
  if([...$('surface').options].some(o=>o.value===q.get('look')))selectSurface(q.get('look'));
  const band=Number(q.get('ecg'));
  if(q.has('ecg')&&Number.isInteger(band)&&band>=0&&band<ecgBands(population).length)ecgBandFor[population]=band;
  configurePopulation();
  const v=Number(q.get('v'));
  if(q.has('v')&&Number.isFinite(v)){
    const min=Number($('size').min),max=Number($('size').max),step=Number($('size').step);
    const snapped=Math.min(max,Math.max(min,min+Math.round((v-min)/step)*step));
    $('size').value=population==='children'?snapped.toFixed(1):snapped;update();
  }
}
$('share-link').onclick=async()=>{
  try{await navigator.clipboard.writeText(shareURL());$('viewer-status').textContent='Link copied · it opens this exact view';}
  catch{prompt('Copy this link to share the current view:',shareURL());}
};
applySharedView();
createScene().catch(error=>{
  console.error(error);$('loading').innerHTML='<div class="fallback"><strong>The 3D model could not load.</strong><p>The published measurements and sources still work. Check your connection and WebGL support, then reload.</p></div>';
  $('volume-card').hidden=true;$('lv-label').hidden=true;
});
