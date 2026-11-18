import * as THREE from 'three';

// 3D view of one heartbeat's electrical activity, placed on the fitted atlas heart.
//  - Conduction pathway: sinus node → AV node → His bundle → left and right bundle branches, with impulses that
//    travel it in time with the beat. Landmark positions are approximate (tools/build_organs.py) and the path is
//    drawn, not measured; the timing is this child's own P wave and PR interval.
//  - Heart vector ("electrical arrow"): the simulator's vector at this moment, drawn from the heart's centre, and
//    its loops over one beat (P teal, QRS gold, T coral). These come from the simulator, fitted to real children.
//  - Lead view: the selected lead's direction through the heart; the arrow's shadow on it is that lead's voltage.
// Vector axes (inverse Dower): X child's left, Y down, Z back → scene (X, −Y, −Z).
export const toScene=(v,k=1)=>new THREE.Vector3(v[0]*k,-v[1]*k,-v[2]*k);
export const COLOURS={P:'#7fd4c4',QRS:'#f2d39b',T:'#ee9a86',path:'#ffe7a3',lead:'#c9d8ff'};
// Time for the spark to run down the His bundle and bundle branches before the QRS: a set value, not measured in
// children (the His-to-ventricle time averaged 43.7 ms in 64 adults; Żuchowski et al., J Clin Med 2023).
const HIS_PURKINJE_MS=35;

export function createHeartbeat3D(){
  const group=new THREE.Group();group.name='Heartbeat: conduction, heart vector and lead view';
  const overlay={transparent:true,depthTest:false,depthWrite:false};
  const pathGroup=new THREE.Group(),loopGroup=new THREE.Group(),leadGroup=new THREE.Group();group.add(pathGroup,loopGroup,leadGroup);
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),r=x.createRadialGradient(32,32,0,32,32,32);
    r.addColorStop(0,'rgba(255,248,220,1)');r.addColorStop(.3,'rgba(255,214,120,.7)');r.addColorStop(1,'rgba(255,190,90,0)');x.fillStyle=r;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  const sprite=()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,...overlay}));s.renderOrder=12;return s;};
  const impulses=[sprite(),sprite()];pathGroup.add(...impulses);
  const nodeMat=new THREE.MeshBasicMaterial({color:COLOURS.path,opacity:.95,...overlay});
  const arrowMat=new THREE.MeshBasicMaterial({color:COLOURS.QRS,...overlay});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,12),arrowMat),head=new THREE.Mesh(new THREE.ConeGeometry(1,1,16),arrowMat);
  shaft.renderOrder=head.renderOrder=11;const arrow=new THREE.Group();arrow.add(shaft,head);group.add(arrow);
  const leadLine=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8),new THREE.MeshBasicMaterial({color:COLOURS.lead,opacity:.5,...overlay}));
  const leadEnd=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:COLOURS.lead,...overlay}));
  const shadow=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',...overlay}));
  for(const m of [leadLine,leadEnd,shadow])m.renderOrder=10;leadGroup.add(leadLine,leadEnd,shadow);
  const keep=new Set([...impulses,leadLine,leadEnd,shadow]);
  let curves=null,centre=new THREE.Vector3(),size=10,k=4,beat=null,lead=1,progress=null,anchors={};
  const on={path:true,vector:true,lead:true};
  const tube=(points,r,colour,opacity=.85)=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(16,points.length*12),r,8,false),
    new THREE.MeshBasicMaterial({color:colour,opacity,...overlay}));m.renderOrder=9;return m;};
  const clear=g=>{for(const c of [...g.children]){if(keep.has(c))continue;c.geometry?.dispose();c.material?.dispose?.();g.remove(c);}};
  function place(cyl,a,b,r){const d=b.clone().sub(a),len=d.length();cyl.position.copy(a).addScaledVector(d,.5);cyl.scale.set(r,len,r);cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}

  // How far each wave has got, from the simulator's own vector: the share of the wave's total size
  // (|vector| summed over time) already drawn. Drives the colouring on the heart (organs.excite).
  function progressTable(model){
    const step=1,make=(from,to,part)=>{const t=[],c=[0];let s=0;
      for(let x=from;x<=to;x+=step){const {a,v}=model.vectorAt(x,0,0),w=part==='a'?a:v;s+=Math.hypot(...w);t.push(x);c.push(s);}
      // −1 before the wave and 2 after it, so the shader shows no front outside the wave
      return e=>e<=from?-1:e>=to?2:c[Math.min(c.length-1,Math.round((e-from)/step))]/s;};
    const pOn=-model.pr,ivT=model.iv;
    return {atr:make(pOn-10,pOn+model.p+10,'a'),ven:make(-5,model.qrs+10,'v'),rec:make(model.qrs,ivT.qt+50,'v')};
  }
  // Rebuild for a fitted child (conduction landmarks from organs.fit) and a heartbeat model (ecg12.js).
  function build(conduction,heart,model){
    beat=model;centre.set(heart.x,heart.y,heart.z);size=heart.size;progress=progressTable(model);
    const r=size*.012;clear(pathGroup);
    const C=conduction,mid=C.sinusNode.clone().lerp(C.avNode,.5).add(new THREE.Vector3(-size*.05,0,-size*.03));
    // Bundle branches as in textbook drawings: down either side of the septum towards the apex, then turning
    // onto the outer walls (where the Purkinje fibres spread). Built from the landmarks of tools/build_organs.py.
    const his=C.hisEnd,apex=C.apex,along=u=>his.clone().lerp(apex,u);
    const offL=C.leftBundle[1].clone().sub(along(.55)),offR=C.rightBundle[1].clone().sub(along(.45));
    const lvWall=C.leftBundle.at(-1),rvWall=C.rightBundle.at(-1),rLow=along(.72).add(offR.clone().multiplyScalar(1.2));
    const pts={atrial:[C.sinusNode,mid,C.avNode],his:[C.avNode,his],
      left:[his,along(.4).add(offL.clone().multiplyScalar(.8)),along(.78).add(offL.clone().multiplyScalar(.7)),apex.clone().lerp(along(.9),.5),apex.clone().lerp(lvWall,.45)],
      right:[his,along(.38).add(offR),rLow,rLow.clone().lerp(rvWall,.6)]};
    curves=Object.fromEntries(Object.entries(pts).map(([n,p])=>[n,new THREE.CatmullRomCurve3(p)]));
    pathGroup.add(tube(pts.atrial,r,COLOURS.path,.5),tube(pts.his,r*1.3,COLOURS.path),tube(pts.left,r,COLOURS.path),tube(pts.right,r,COLOURS.path));
    for(const [p,s] of [[C.sinusNode,2.6],[C.avNode,2.2]]){const n=new THREE.Mesh(new THREE.SphereGeometry(r*s,16,12),nodeMat);n.position.copy(p);n.renderOrder=10;pathGroup.add(n);}
    for(const s of impulses)s.scale.setScalar(size*.16);
    anchors={sinus:C.sinusNode.clone(),av:C.avNode.clone(),bundles:curves.left.getPointAt(.55)};
    // loops of one beat, in mV scaled so the largest QRS vector reaches about 60% of the heart's size
    let peak=0;const samples=[];
    for(let t=-model.pr-20;t<model.qt+60;t+=2){const {a,v}=model.vectorAt(t,0,0);samples.push([t,a,v]);peak=Math.max(peak,Math.hypot(...v));}
    k=size*.6/Math.max(peak,.3);clear(loopGroup);
    const loop=(from,to,which)=>samples.filter(([t])=>t>=from&&t<=to).map(([,a,v])=>centre.clone().add(toScene(which==='a'?a:v,k)));
    loopGroup.add(tube(loop(-model.pr-10,-model.pr+model.p+10,'a'),r*.5,COLOURS.P,.6),tube(loop(-4,model.qrs+8,'v'),r*.5,COLOURS.QRS,.6),tube(loop(model.qrs,model.qt+40,'v'),r*.5,COLOURS.T,.6));
    setLead(lead);
  }
  function setLead(i){
    lead=i;if(!beat)return;
    const dir=toScene(beat.leadVector(i)).normalize(),reach=size*.95;
    place(leadLine,centre.clone().addScaledVector(dir,-reach),centre.clone().addScaledVector(dir,reach),size*.006);
    leadEnd.position.copy(centre).addScaledVector(dir,reach);leadEnd.scale.setScalar(size*.03);leadGroup.userData.dir=dir;anchors.lead=leadEnd.position.clone();
  }
  // Show the moment e (ms after QRS onset; P starts at −PR). Returns the phase and each wave's progress (0–1).
  function frame(e){
    if(!beat)return {phase:''};
    const {a,v}=beat.vectorAt(e,0,-1),pOn=-beat.pr,pOff=pOn+beat.p;
    const atrial=e<pOff+10&&e>pOn-10,vec=atrial?a:v,phase=e<pOn?'rest':e<pOff?'P':e<0?'PR':e<beat.qrs?'QRS':e<beat.qt?'T':'rest';
    const tip=centre.clone().add(toScene(vec,k)),len=tip.distanceTo(centre);
    arrow.visible=on.vector&&len>size*.02;arrowMat.color.set(atrial?COLOURS.P:phase==='QRS'?COLOURS.QRS:COLOURS.T);
    if(arrow.visible){const hl=Math.min(len*.35,size*.09),d=tip.clone().sub(centre).normalize(),base=tip.clone().addScaledVector(d,-hl);
      place(shaft,centre,base,size*.014);head.position.copy(base).addScaledVector(d,hl/2);head.scale.set(size*.035,hl,size*.035);head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);}
    const dir=leadGroup.userData.dir;
    shadow.visible=len>size*.02;
    if(dir){const proj=tip.clone().sub(centre).dot(dir);shadow.position.copy(centre).addScaledVector(dir,proj);shadow.scale.setScalar(size*.025);}
    // impulses along the conduction pathway: across the atria to the AV node during the P wave, held there,
    // then down the His bundle and both bundle branches just before the QRS
    const hv=Math.min(HIS_PURKINJE_MS,Math.max(10,(beat.pr-beat.p)*.6)),reach=pOn+beat.p*.65;
    let p1=null,p2=null;
    if(curves){
      const at=(c,u)=>curves[c].getPointAt(THREE.MathUtils.clamp(u,0,1));
      if(e>=pOn&&e<reach)p1=at('atrial',(e-pOn)/(reach-pOn));
      else if(e>=reach&&e<-hv)p1=curves.atrial.getPointAt(1);                         // the AV node holds the wave back
      else if(e>=-hv&&e<0){const u=(e+hv)/hv;if(u<.3)p1=at('his',u/.3);else{p1=at('left',(u-.3)/.7);p2=at('right',(u-.3)/.7);}}
    }
    impulses[0].visible=on.path&&!!p1;if(p1)impulses[0].position.copy(p1);
    impulses[1].visible=on.path&&!!p2;if(p2)impulses[1].position.copy(p2);
    return {phase,atr:progress.atr(e),ven:progress.ven(e),rec:progress.rec(e),vector:vec,atrial};
  }
  function show(layers){Object.assign(on,layers);pathGroup.visible=on.path;loopGroup.visible=on.vector;leadGroup.visible=on.lead;if(!on.vector)arrow.visible=false;}
  return {group,build,frame,setLead,show,get lead(){return lead;},get anchors(){return anchors;},get layers(){return {...on};}};
}
