// A released example, independent of Heartverse's reference data. By default
// it is synced to the 4D cycle: the heart's timing follows this example's
// measured ground-truth size profile (cycle-profile.js), so frame N and phase
// N/49 show the same moment. Unsynced, it plays on its own at a display rate.
import { FRAMES, phaseToFrame } from './cycle-profile.js?v=1';
const $=id=>document.getElementById(id);
const canvas=$('research-canvas'),ctx=canvas.getContext('2d');
const image=new Image(), frames=FRAMES, columns=7, width=768, height=384;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let ready=false,playing=false,position=0,lastTime=0,drawn=-1,synced=true,heart={phase:0,playing:false,bpm:null};
function button(){
  const on=synced?heart.playing:playing;
  $('research-play').textContent=on?'Ⅱ':'▶';
  $('research-play').setAttribute('aria-label',`${on?'Pause':'Play'} ${synced?'the synced heart cycle':'published motion example'}`);
  $('research-play').setAttribute('aria-pressed',String(on));
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
function describeRate(){
  $('research-rate').disabled=synced;
  $('research-rate-note').textContent=synced?`Synced to heart${heart.bpm?` · ${heart.bpm} bpm`:''}`:'Display rate · 25 fps';
}
function setSynced(on){
  synced=on;$('research-sync').setAttribute('aria-pressed',String(on));
  if(on){position=phaseToFrame(heart.phase);drawn=-1;draw();}else{playing=heart.playing&&!reduced.matches;lastTime=0;}
  describeRate();button();
}
window.addEventListener('heartverse:cycle',event=>{
  const {phase,playing:on,bpm}=event.detail,changed=on!==heart.playing||bpm!==heart.bpm;heart={phase,playing:on,bpm};
  if(!synced)return;
  position=phaseToFrame(phase);draw();
  if(changed){button();describeRate();}
});
function tick(now){
  const elapsed=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
  if(ready&&!synced&&playing&&!document.hidden){position=(position+elapsed*25*Number($('research-rate').value))%frames;draw();}
  requestAnimationFrame(tick);
}
image.onload=()=>{
  ready=true;$('research-loading').hidden=true;
  $('research-play').disabled=false;$('research-frame').disabled=false;
  playing=!reduced.matches;if(synced)position=phaseToFrame(heart.phase);button();describeRate();draw();requestAnimationFrame(tick);
};
image.onerror=()=>{$('research-loading').textContent='Motion preview unavailable. Open the source animation below.';};
image.src='./media/time2track/shift-invariant-a.webp';
$('research-play').onclick=()=>{
  if(synced){window.dispatchEvent(new CustomEvent('heartverse:toggle'));return;}
  playing=!playing;lastTime=0;button();
};
$('research-frame').oninput=()=>{
  const frame=Number($('research-frame').value);
  if(synced){window.dispatchEvent(new CustomEvent('heartverse:seek',{detail:{phase:frame/frames}}));return;}
  playing=false;position=frame;button();draw();
};
$('research-sync').onclick=()=>setSynced($('research-sync').getAttribute('aria-pressed')!=='true');
reduced.addEventListener('change',event=>{if(event.matches){playing=false;button();}});
document.addEventListener('visibilitychange',()=>{lastTime=0;});
const dialog=$('motion-detail');
$('expand-motion').onclick=()=>{$('research-player-expanded').append($('research-player'));dialog.showModal();};
$('close-motion').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{$('research-player-home').append($('research-player'));$('expand-motion').focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
