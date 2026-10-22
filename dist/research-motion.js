// A released example, independent of Heartverse's illustrative deformation and reference data.
const $=id=>document.getElementById(id);
const canvas=$('research-canvas'),ctx=canvas.getContext('2d');
const image=new Image(), frames=49, columns=7, width=768, height=384;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let ready=false,playing=false,position=0,lastTime=0,drawn=-1;
function button(){
  $('research-play').textContent=playing?'Ⅱ':'▶';
  $('research-play').setAttribute('aria-label',`${playing?'Pause':'Play'} published motion example`);
  $('research-play').setAttribute('aria-pressed',String(playing));
}
function draw(){
  if(!ready)return;
  const frame=Math.min(frames-1,Math.floor(position));
  if(drawn===frame)return;drawn=frame;
  ctx.drawImage(image,(frame%columns)*width,Math.floor(frame/columns)*height,width,height,0,0,width,height);
  $('research-frame').value=frame;
  $('research-frame').style.setProperty('--fill',`${frame/(frames-1)*100}%`);
  $('research-frame').setAttribute('aria-valuetext',`Frame ${frame+1} of ${frames}`);
  $('research-frame-value').textContent=`${String(frame+1).padStart(2,'0')} / 49`;
}
function tick(now){
  const elapsed=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
  if(ready&&playing&&!document.hidden){position=(position+elapsed*25*Number($('research-rate').value))%frames;draw();}
  requestAnimationFrame(tick);
}
image.onload=()=>{
  ready=true;$('research-loading').hidden=true;
  $('research-play').disabled=false;$('research-frame').disabled=false;
  playing=!reduced.matches;button();draw();requestAnimationFrame(tick);
};
image.onerror=()=>{$('research-loading').textContent='Motion preview unavailable. Open the source animation below.';};
image.src='./media/time2track/shift-invariant-a.webp';
$('research-play').onclick=()=>{playing=!playing;lastTime=0;button();};
$('research-frame').oninput=()=>{playing=false;position=Number($('research-frame').value);button();draw();};
reduced.addEventListener('change',event=>{if(event.matches){playing=false;button();}});
document.addEventListener('visibilitychange',()=>{lastTime=0;});
const dialog=$('motion-detail');
$('expand-motion').onclick=()=>{$('research-player-expanded').append($('research-player'));dialog.showModal();};
$('close-motion').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{$('research-player-home').append($('research-player'));$('expand-motion').focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
