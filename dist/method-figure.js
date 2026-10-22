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
for(const id of ['expand-method','method-figure-preview'])$(id).addEventListener('click',event=>{
  event.preventDefault();opener=event.currentTarget;figureDialog.showModal();setZoom(1);
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
