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
  {openers:['expand-ecg-examples','ecg-examples-preview'],eyebrow:'FIGURE 4 · RECORDED ECGS',title:'Recorded ECG examples across age-transfer settings',image:'./media/research/Figure_4_recorded_ecg_examples.png',width:3840,height:1532,original:'./media/research/Figure_4_recorded_ecg_examples.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 4: measured 12-lead ECG examples from a young adult, child, and infant, illustrating model detections and missed positive cases.'}
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
const researchSections=[['Main idea','.research-overview'],['Figure 1','#method-figure-title'],['Preparation','#preparation-title'],['Transferability','#transferability-title'],['Figure 2','#age-transfer-title'],['Results','#results-title'],['Figure 3','#results-figure-title'],['Figure 4','#ecg-examples-title'],['Next steps','#next-steps-title'],['References','.research-references-heading']]
  .map(([label,selector])=>{const el=researchDialog.querySelector(selector);return el&&{label,target:el.closest('section')||el};}).filter(Boolean);
const researchNav=document.createElement('nav');researchNav.className='research-nav';researchNav.setAttribute('aria-label','Research sections');
researchNav.innerHTML=researchSections.map(({label},i)=>`<button type="button" data-section="${i}">${label}</button>`).join('');
researchDialog.querySelector('.dialog-header').append(researchNav);
researchNav.addEventListener('click',event=>{
  const button=event.target.closest('[data-section]');if(!button)return;
  // Offset by the sticky header so the section title is not hidden under it.
  const target=researchSections[button.dataset.section].target,header=researchDialog.querySelector('.dialog-header');
  researchDialog.scrollTo({top:researchDialog.scrollTop+target.getBoundingClientRect().top-header.getBoundingClientRect().bottom-16,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
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
