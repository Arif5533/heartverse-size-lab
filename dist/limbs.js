import * as THREE from 'three';

// Arm and leg blood vessels, drawn along each child's own limb joints (MakeHuman joint markers).
//
// The Human Reference Atlas vessel model covers the trunk and head only, so the main limb vessels are drawn
// here as an illustration: arteries (brachial, radial, ulnar, palmar arch, digital; iliac, femoral, popliteal,
// tibial, dorsalis pedis) and veins (cephalic, basilic, median cubital, brachial; femoral, great and small
// saphenous, dorsal arches), with small side branches. Their courses follow textbook anatomy; their exact
// positions and sizes are illustrative, not measured.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function random(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

// A tube whose radius tapers from r0 to r1 along a smooth curve through the points.
function tube(buf,points,r0,r1,radial=8,wave=0,rnd=null){
  if(wave&&rnd&&points.length>1){   // add gentle bends between the given points so vessels do not run dead straight
    const out=[points[0]];
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=b.clone().sub(a),len=d.length(),n=Math.max(1,Math.round(len/(wave*6)));
      const side=new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).cross(d).normalize();
      for(let k=1;k<=n;k++){const p=a.clone().lerp(b,k/n);if(k<n)p.addScaledVector(side,Math.sin(k*1.7+rnd()*3)*wave);out.push(p);}}
    points=out;
  }
  if(buf.inside){   // follow the curve in ~1 cm steps and keep every step inside the skin, deeper than the vessel's radius
    const c0=new THREE.CatmullRomCurve3(points,false,'centripetal'),steps=Math.max(4,Math.ceil(c0.getLength()/1));
    points=c0.getSpacedPoints(steps).map((p,i)=>buf.inside(p,(r0+(r1-r0)*i/steps)+buf.margin));
  }
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),len=curve.getLength(),seg=Math.max(6,Math.ceil(len/Math.max(r0,.15)/1.6));
  const frames=curve.computeFrenetFrames(seg,false),base=buf.pos.length/3;
  for(let i=0;i<=seg;i++){
    const u=i/seg,p=curve.getPointAt(u),r=r0+(r1-r0)*u,N=frames.normals[i],B=frames.binormals[i];
    for(let j=0;j<radial;j++){const a=j/radial*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      buf.pos.push(p.x+r*(c*N.x+s*B.x),p.y+r*(c*N.y+s*B.y),p.z+r*(c*N.z+s*B.z));}
  }
  for(let i=0;i<seg;i++)for(let j=0;j<radial;j++){const a=base+i*radial+j,b=base+i*radial+(j+1)%radial,c=a+radial,d=b+radial;buf.idx.push(a,c,b,b,c,d);}
  // round the ends
  for(const [i,sign] of [[0,-1],[seg,1]]){const u=i/seg,p=curve.getPointAt(u),cap=buf.pos.length/3,r=(r0+(r1-r0)*u);
    const tan=curve.getTangentAt(u).multiplyScalar(sign*r*.6);buf.pos.push(p.x+tan.x,p.y+tan.y,p.z+tan.z);
    for(let j=0;j<radial;j++){const a=base+i*radial+j,b=base+i*radial+(j+1)%radial;sign>0?buf.idx.push(a,b,cap):buf.idx.push(b,a,cap);}}
  return curve;
}

// Small side branches along a vessel, curving around the limb and staying inside it.
function twigs(buf,curve,limbAxis,limbCentreAt,count,len,r,rnd){
  for(let k=0;k<count;k++){
    const u=.12+.76*rnd(),p=curve.getPointAt(u),t=curve.getTangentAt(u);
    let out=p.clone().sub(limbCentreAt(u));out.addScaledVector(limbAxis,-out.dot(limbAxis));
    if(out.lengthSq()<1e-6)out=V(rnd()-.5,0,rnd()-.5);out.normalize();
    const side=out.clone().cross(t).normalize().multiplyScalar(rnd()<.5?-1:1),l=len*(.6+.6*rnd()),dir=rnd()<.5?1:-1;
    const pts=[p,p.clone().addScaledVector(t,dir*l*.45).addScaledVector(side,l*.18).addScaledVector(out,-l*.06),p.clone().addScaledVector(t,dir*l*.95).addScaledVector(side,l*.3).addScaledVector(out,-l*.14)];
    const c=tube(buf,pts,r,r*.45,6);
    if(rnd()<.7){const v=c.getPointAt(.55+.3*rnd()),tt=c.getTangentAt(.6),s2=side.clone().negate().addScaledVector(out,.3*(rnd()-.5)).normalize(),l2=l*(.35+.3*rnd());
      tube(buf,[v,v.clone().addScaledVector(tt,dir*l2*.5).addScaledVector(s2,l2*.2),v.clone().addScaledVector(tt,dir*l2).addScaledVector(s2,l2*.32)],r*.55,r*.3,5);}
  }
}

export function createLimbVessels(){
  const style={artery:{colour:'#e01e30'},vein:{colour:'#2f7ee0'}};
  const make=c=>new THREE.MeshPhysicalMaterial({color:c,roughness:.36,clearcoat:.45,clearcoatRoughness:.4,metalness:0,envMapIntensity:.55});
  const arteries=new THREE.Mesh(new THREE.BufferGeometry(),make(style.artery.colour)),veins=new THREE.Mesh(new THREE.BufferGeometry(),make(style.vein.colour));
  const group=new THREE.Group();group.name='Limb vessels (illustrative)';group.add(arteries,veins);
  for(const m of [arteries,veins])m.frustumCulled=false;

  function build(plan,trunk){
    const J=plan.joints,H=plan.H,margin=.25*H/128,A={pos:[],idx:[],inside:plan.inside,margin},Vn={pos:[],idx:[],inside:plan.inside,margin},rnd=random(20261117+plan.age);
    const fwd=V(0,0,1),r=H/128;   // radii are set for a 128 cm child and scale with height
    for(const sgn of [1,-1]){
      const s=sgn>0?'l':'r',j=n=>J[`${s}-${n}`];
      // ---- arm ----
      const C=j('clavicle'),S=j('shoulder'),E=j('elbow'),W=j('hand'),palm=j('hand-2').clone().lerp(j('hand-3'),.5);
      const frame=(p,q)=>{const d=q.clone().sub(p).normalize(),a=fwd.clone().addScaledVector(d,-fwd.dot(d)).normalize(),l=d.clone().cross(a).normalize();if(l.x*sgn<0)l.negate();return {d,a,l};};
      const up=frame(S,E),lo=frame(E,W),rU=3.1*r,rF=2.4*r,rW=1.9*r;
      const at=(p,f,a,l)=>p.clone().addScaledVector(f.a,a).addScaledVector(f.l,l);
      const start=C.clone().lerp(S,.35).add(V(0,-.6*r,.6*r));
      const cubital=at(E,lo,.45*rF,-.1*rF);
      const brachial=tube(A,[start,at(S,up,.25*rU,-.35*rU),at(S.clone().lerp(E,.5),up,.3*rU,-.5*rU),cubital],.4*r,.33*r);
      const split=at(E.clone().lerp(W,.18),lo,.4*rF,0);
      tube(A,[cubital,split],.27*r,.25*r);
      const thumbBase=j('finger-1-1'),pinkyBase=j('finger-5-1');
      const radial=tube(A,[split,at(E.clone().lerp(W,.55),lo,.4*rF,.45*rF),at(W,lo,.45*rW,.6*rW),thumbBase.clone().lerp(palm,.3)],.22*r,.16*r,8,.3*r,rnd);
      const ulnar=tube(A,[split,at(E.clone().lerp(W,.55),lo,.35*rF,-.5*rF),at(W,lo,.4*rW,-.65*rW),pinkyBase.clone().lerp(palm,.35)],.22*r,.16*r,8,.3*r,rnd);
      // palmar arch and digital arteries
      const arch=[thumbBase.clone().lerp(palm,.3)];for(const f of [2,3,4,5])arch.push(j(`finger-${f}-1`).clone().lerp(palm,.45));
      tube(A,arch,.14*r,.14*r,6);
      for(const f of [1,2,3,4,5]){const b=j(`finger-${f}-1`),m1=j(`finger-${f}-2`),m2=j(`finger-${f}-3`),tip=j(`finger-${f}-4`);
        tube(A,[b.clone().lerp(palm,.4),b,m1,m2,tip.clone().lerp(m2,.25)],.09*r,.05*r,6);}
      // veins: brachial companion, cephalic (thumb side), basilic (little-finger side), median cubital, dorsal hand network
      const vstart=start.clone().add(V(sgn*.3*r,-.4*r,.5*r));
      tube(Vn,[vstart,at(S,up,.15*rU,-.55*rU),at(S.clone().lerp(E,.5),up,.2*rU,-.68*rU),at(E,lo,.3*rF,-.3*rF)],.36*r,.3*r);
      const cephalic=tube(Vn,[vstart,at(S,up,.7*rU,.2*rU),at(S.clone().lerp(E,.5),up,.5*rU,.75*rU),at(E,lo,.35*rF,.82*rF),at(E.clone().lerp(W,.5),lo,.05*rF,.85*rF),at(W,lo,-.3*rW,.75*rW),j('finger-2-1').clone().lerp(palm,.2).addScaledVector(lo.a,-.6*rW)],.3*r,.18*r,8,.45*r,rnd);
      const basilic=tube(Vn,[at(S.clone().lerp(E,.35),up,0,-.75*rU),at(S.clone().lerp(E,.7),up,.15*rU,-.85*rU),at(E,lo,.2*rF,-.85*rF),at(E.clone().lerp(W,.5),lo,-.1*rF,-.85*rF),at(W,lo,-.35*rW,-.7*rW),j('finger-4-1').clone().lerp(palm,.2).addScaledVector(lo.a,-.6*rW)],.28*r,.17*r,8,.45*r,rnd);
      tube(Vn,[at(E,lo,.4*rF,.75*rF),at(E,lo,.6*rF,0),at(E,lo,.4*rF,-.7*rF)],.18*r,.18*r,6);
      for(const f of [2,3,4,5]){const b=j(`finger-${f}-1`),m1=j(`finger-${f}-2`);tube(Vn,[b.clone().lerp(W,.55).addScaledVector(lo.a,-.6*rW),b.clone().addScaledVector(lo.a,-.35*rW),m1.clone().addScaledVector(lo.a,-.25*rW)],.08*r,.05*r,6);}
      const armCentre=u=>u<.5?S.clone().lerp(E,u*2):E.clone().lerp(W,(u-.5)*2);
      twigs(A,brachial,up.d,u=>S.clone().lerp(E,u),9,3.6*r,.11*r,rnd);twigs(A,radial,lo.d,u=>E.clone().lerp(W,u),7,3*r,.1*r,rnd);twigs(A,ulnar,lo.d,u=>E.clone().lerp(W,u),7,3*r,.1*r,rnd);
      twigs(Vn,cephalic,up.d,armCentre,12,3.8*r,.11*r,rnd);twigs(Vn,basilic,lo.d,armCentre,11,3.6*r,.11*r,rnd);

      // ---- leg ----
      const G0=j('upper-leg'),K=j('knee'),Ak=j('ankle'),F1=j('foot-1'),F2=j('foot-2');
      const th=frame(G0,K),sh=frame(K,Ak),rT=5.2*r,rC=3.8*r,rA=1.8*r;
      const groin=G0.clone().add(V(-sgn*2.4*r,.4*r,2.2*r));
      // iliac vessels from the lower end of the aorta and vena cava in the trunk model
      tube(A,[trunk.aortaEnd,trunk.aortaEnd.clone().lerp(groin,.5).add(V(0,-.8*r,.6*r)),groin],.42*r,.4*r);
      tube(Vn,[trunk.cavaEnd,trunk.cavaEnd.clone().lerp(groin,.5).add(V(sgn*.5*r,-1*r,0)),groin.clone().add(V(-sgn*.7*r,-.3*r,-.3*r))],.5*r,.46*r);
      const popliteal=at(K,sh,-.45*rC,-.05*rC);
      const femoral=tube(A,[groin,at(G0.clone().lerp(K,.3),th,.4*rT,-.42*rT),at(G0.clone().lerp(K,.68),th,.05*rT,-.5*rT),popliteal],.4*r,.33*r,8,.25*r,rnd);
      const antTib=tube(A,[popliteal,at(K.clone().lerp(Ak,.12),sh,.1*rC,.3*rC),at(K.clone().lerp(Ak,.55),sh,.45*rC,.25*rC),at(Ak,sh,.65*rA,.1*rA),F2.clone().add(V(0,.6*r,-.4*r))],.25*r,.17*r,8,.35*r,rnd);
      const postTib=tube(A,[popliteal,at(K.clone().lerp(Ak,.3),sh,-.45*rC,-.2*rC),at(Ak,sh,-.35*rA,-.75*rA),F1.clone().lerp(j('toe-1-1'),.4).add(V(0,-.3*r,0))],.25*r,.16*r,8,.35*r,rnd);
      for(const tname of ['toe-1-3','toe-2-4','toe-3-4','toe-4-4','toe-5-4'])tube(A,[F2.clone().add(V(0,.5*r,-.3*r)),J[`${s}-${tname}`].clone().lerp(F2,.35)],.08*r,.05*r,6);
      const femVein=tube(Vn,[groin.clone().add(V(-sgn*.7*r,-.3*r,-.3*r)),at(G0.clone().lerp(K,.3),th,.3*rT,-.55*rT),at(G0.clone().lerp(K,.68),th,-.05*rT,-.62*rT),at(K,sh,-.55*rC,-.2*rC)],.46*r,.38*r,8,.25*r,rnd);
      const saph=tube(Vn,[at(G0.clone().lerp(K,.05),th,.45*rT,-.35*rT),at(G0.clone().lerp(K,.5),th,.1*rT,-.85*rT),at(K,sh,-.25*rC,-.9*rC),at(K.clone().lerp(Ak,.5),sh,-.1*rC,-.9*rC),at(Ak,sh,.45*rA,-.85*rA),F1.clone().add(V(-sgn*1.1*r,.5*r,.8*r))],.3*r,.2*r,8,.55*r,rnd);
      tube(Vn,[at(K,sh,-.8*rC,.1*rC),at(K.clone().lerp(Ak,.5),sh,-.9*rC,.25*rC),at(Ak,sh,-.6*rA,.75*rA),F1.clone().add(V(sgn*1.2*r,.4*r,-.2*r))],.24*r,.18*r);
      tube(Vn,[F1.clone().add(V(-sgn*1.1*r,.5*r,.8*r)),F2.clone().add(V(0,.8*r,0)),F1.clone().add(V(sgn*1.2*r,.4*r,-.2*r))],.16*r,.16*r,6);
      const legCentre=u=>u<.5?G0.clone().lerp(K,u*2):K.clone().lerp(Ak,(u-.5)*2);
      twigs(A,femoral,th.d,u=>G0.clone().lerp(K,u),9,4*r,.13*r,rnd);twigs(A,antTib,sh.d,u=>K.clone().lerp(Ak,u),7,3.4*r,.1*r,rnd);twigs(A,postTib,sh.d,u=>K.clone().lerp(Ak,u),6,3.4*r,.1*r,rnd);
      twigs(Vn,saph,th.d,legCentre,11,4*r,.11*r,rnd);twigs(Vn,femVein,th.d,u=>G0.clone().lerp(K,u),6,3.8*r,.11*r,rnd);
    }
    for(const [mesh,buf] of [[arteries,A],[veins,Vn]]){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(buf.pos,3));g.setIndex(buf.idx);g.computeVertexNormals();
      mesh.geometry.dispose();mesh.geometry=g;
    }
  }
  return {group,build};
}
