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
  {openers:['expand-results','results-figure-preview'],eyebrow:'FIGURE 3 · RESULTS',title:'ECG classification performance across age groups',image:'./media/research/Figure_3_age_classification.png',width:3840,height:1546,original:'./media/research/Figure_3_age_classification.pdf',originalLabel:'Open PDF ↗',alt:'Enlarged Figure 3: ROC curves comparing conduction classification across young adults, older adults, children, and infants.'}
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
// Shareable entry point to the requested research section.
function openResearchFromHash(){if(location.hash==='#research'&&!$('evidence').open)$('evidence').showModal();}
window.addEventListener('hashchange',openResearchFromHash);
openResearchFromHash();
