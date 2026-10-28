const $=id=>document.getElementById(id);
const figureDialog=$('method-figure-dialog'),viewport=$('method-image-viewport');
let zoom=1,opener=null;
function setZoom(value){
  const previous=zoom;zoom=Math.max(1,Math.min(3,value));
  const x=(viewport.scrollLeft+viewport.clientWidth/2)/previous;
  const y=(viewport.scrollTop+viewport.clientHeight/2)/previous;
  viewport.style.setProperty('--figure-zoom',zoom);
  $('method-zoom-value').textContent=`${Math.round(zoom*100)}%`;
  $('method-zoom-out').disabled=zoom===1;$('method-zoom-in').disabled=zoom===3;
  if(zoom===1){viewport.scrollTo(0,0);return;}
  viewport.scrollTo(x*zoom-viewport.clientWidth/2,y*zoom-viewport.clientHeight/2);
}
const figures=[
  {openers:['expand-method','method-figure-preview'],eyebrow:'FIGURE 1 · PROPOSED STUDY',title:'Heartverse framework',image:'./media/research/Heartverse_method_paper.png',width:3840,height:2410,original:'./media/research/Heartverse_method_paper.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 1: proposed developmental physiology-guided ECG augmentation and pediatric arrhythmia detection framework.'},
  {openers:['expand-age-transfer','age-transfer-preview'],eyebrow:'FIGURE 2 · AGE TRANSFER',title:'Study design for ECG conduction classification',image:'./media/research/Figure_2_age_transfer_preview.png',width:3840,height:2666,original:'./media/research/Figure_2_age_transfer.png',originalLabel:'Open original PNG ↗',alt:'Enlarged Figure 2: ECG preprocessing, adult pretraining, young-adult evaluation, exploratory pediatric adaptation, shared CNN architecture, and evidence across age groups.'},
  {openers:['expand-results','results-figure-preview'],eyebrow:'FIGURE 3 · RESULTS',title:'ECG classification performance across age groups',image:'./media/research/Figure_3_age_classification.png',width:3840,height:1546,original:'./media/research/Figure_3_age_classification.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 3: ROC curves comparing conduction classification across young adults, older adults, children, and infants.'},
  {openers:['expand-ecg-examples','ecg-examples-preview'],eyebrow:'FIGURE 4 · RECORDED ECGS',title:'Recorded ECG examples across age-transfer settings',image:'./media/research/Figure_4_recorded_ecg_examples.png',width:3840,height:1532,original:'./media/research/Figure_4_recorded_ecg_examples.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 4: measured 12-lead ECG examples from a young adult, child, and infant, illustrating model detections and missed positive cases.'},
  {openers:['expand-profiles-figure','profiles-figure-preview'],eyebrow:'FIGURE 6 · NORMAL ECG BY AGE',title:'How a normal ECG changes from age 1 to 14',image:'./media/research/Figure_6_age_profiles.png',width:3840,height:2280,original:'./media/research/Figure_6_age_profiles.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 6: centile curves by age for heart rate, QT, R wave in V1 and V6, T wave in V1, and the typical V1 beat by age group.'},
  {openers:['expand-simulated-ecgs','simulated-ecgs-preview'],eyebrow:'FIGURE 8 · SYNTHETIC ECGS',title:'Synthetic ECGs from the age-guided simulator',image:'./media/research/Figure_8_simulated_ecgs.png',width:3840,height:2820,original:'./media/research/Figure_8_simulated_ecgs.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 8: synthetic ECGs in leads II and V1 for normal sinus rhythm, sinus tachycardia, sinus bradycardia, PAC and PVC.'},
  {openers:['expand-simulator-checks','simulator-checks-preview'],eyebrow:'FIGURE 10 · SIMULATOR CHECKS',title:'Do synthetic ECGs look their age and keep their rhythm?',image:'./media/research/Figure_10_simulator_checks.png',width:3840,height:1680,original:'./media/research/Figure_10_simulator_checks.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 10: share of synthetic normal ECGs inside the age p2 to p98 range, and share of synthetic ECGs keeping the intended rhythm.'},
  {openers:['expand-growing-up','growing-up-preview'],eyebrow:'FIGURE 5 · AN ECG GROWING UP',title:'An ECG growing up',image:'./media/research/Figure_5_ecg_growing_up.png',width:3840,height:2520,original:'./media/research/Figure_5_ecg_growing_up.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 5: typical normal beats by age group in leads II, V1 and V6, and lead II strips from a toddler and a teenager.'},
  {openers:['expand-simulator-method','simulator-method-preview'],eyebrow:'FIGURE 7 · HOW THE SIMULATOR WORKS',title:'How the age-guided simulator works',image:'./media/research/Figure_7_simulator_method.png',width:3840,height:2460,original:'./media/research/Figure_7_simulator_method.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 7: heart-vector model fit, loops by age, projected 12-lead beat, QT-RR timing by age, and PAC and PVC rhythm synthesis.'},
  {openers:['expand-real-vs-synthetic','real-vs-synthetic-preview'],eyebrow:'FIGURE 9 · REAL OR SYNTHETIC?',title:'Real or synthetic? Can you tell?',image:'./media/research/Figure_9_real_vs_synthetic.png',width:3840,height:2880,original:'./media/research/Figure_9_real_vs_synthetic.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 9: three pairs of real and synthetic ECGs at ages 2, 7 and 13, sides shuffled.'}
];
for(const figure of figures)for(const id of figure.openers)$(id).addEventListener('click',event=>{
  event.preventDefault();opener=event.currentTarget;
  figureDialog.querySelector('.method-expanded-header .eyebrow').textContent=figure.eyebrow;
  $('method-expanded-title').textContent=figure.title;
  const img=viewport.querySelector('img');
  img.width=figure.width;img.height=figure.height;img.alt=figure.alt;img.src=figure.image;
  const original=figureDialog.querySelector('.method-zoom-toolbar a');
  original.href=figure.original;original.textContent=figure.originalLabel;
  figureDialog.showModal();setZoom(1);
});
$('close-method-figure').onclick=()=>figureDialog.close();
$('method-zoom-in').onclick=()=>setZoom(zoom+.5);
$('method-zoom-out').onclick=()=>setZoom(zoom-.5);
$('method-zoom-fit').onclick=()=>setZoom(1);
figureDialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
figureDialog.addEventListener('click',event=>{
  if(event.target!==figureDialog)return;
  const b=figureDialog.getBoundingClientRect();
  if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)figureDialog.close();
});
// Jump menu for the long research panel. It sits in the sticky header and
// highlights the section currently in view.
const researchDialog=$('evidence');
const researchSections=[['Main idea','.research-overview'],['Figure 1','#method-figure-title'],['Progress','#progress-title'],['Preparation','#preparation-title'],['Transferability','#transferability-title'],['Figure 2','#age-transfer-title'],['Results','#results-title'],['Figure 3','#results-figure-title'],['Figure 4','#ecg-examples-title'],['Normal ECG by age','#profiles-title'],['Figure 5','#growing-up-title'],['Figure 6','#profiles-figure-title'],['Simulator','#simulator-title'],['Figure 7','#simulator-method-title'],['Figure 8','#simulated-ecgs-title'],['Figure 9','#real-vs-synthetic-title'],['Figure 10','#simulator-checks-title'],['Next steps','#next-steps-title'],['References','.research-references-heading']]
  .map(([label,selector])=>{const el=researchDialog.querySelector(selector);return el&&{label,target:el.closest('section')||el};}).filter(Boolean);
const researchNav=document.createElement('nav');researchNav.className='research-nav';researchNav.setAttribute('aria-label','Research sections');
researchNav.innerHTML=researchSections.map(({label},i)=>`<button type="button" data-section="${i}">${label}</button>`).join('');
researchDialog.querySelector('.dialog-header').append(researchNav);
// Offset by the sticky header so the section title is not hidden under it.
function scrollResearchTo(target){
  const header=researchDialog.querySelector('.dialog-header');
  researchDialog.scrollTo({top:researchDialog.scrollTop+target.getBoundingClientRect().top-header.getBoundingClientRect().bottom-16,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
researchNav.addEventListener('click',event=>{
  const button=event.target.closest('[data-section]');if(!button)return;
  scrollResearchTo(researchSections[button.dataset.section].target);
});
// In-panel links (progress table, next steps) scroll the panel instead of changing the page hash.
researchDialog.querySelector('.dialog-body').addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');if(!link)return;
  const target=researchDialog.querySelector(link.getAttribute('href'));if(!target)return;
  event.preventDefault();scrollResearchTo(target.closest('section')||target);
});
function markResearchSection(){
  const line=researchDialog.querySelector('.dialog-header').getBoundingClientRect().bottom+24;
  let active=0;researchSections.forEach(({target},i)=>{if(target.getBoundingClientRect().top<=line)active=i;});
  researchNav.querySelectorAll('button').forEach((b,i)=>{const on=i===active;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
  const chip=researchNav.querySelector('.active');
  if(chip&&(chip.offsetLeft<researchNav.scrollLeft||chip.offsetLeft+chip.offsetWidth>researchNav.scrollLeft+researchNav.clientWidth))researchNav.scrollLeft=chip.offsetLeft-16;
}
researchDialog.addEventListener('scroll',markResearchSection,{passive:true});
researchDialog.addEventListener('toggle',markResearchSection);
// Shareable entry point to the requested research section.
function openResearchFromHash(){if(location.hash==='#research'&&!$('evidence').open)$('evidence').showModal();}
window.addEventListener('hashchange',openResearchFromHash);
openResearchFromHash();
