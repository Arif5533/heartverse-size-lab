import * as THREE from 'three';

// Organs and blood vessels inside the child.
//
// The shapes are the Human Reference Atlas 3D reference organs (HuBMAP, Visible
// Human Male, CC BY 4.0), reduced by tools/build_organs.py. They come from one
// adult, so they are fitted into the child at each age, not measured in
// children: heights follow anchors (bladder, heart, top of the trachea, eyes);
// in the trunk, width and depth are scaled at each height so the organs fill
// the child's own outline; in the head they follow the distance between the eyes. Children's organ proportions differ from an
// adult's; the result is an illustration.
const smooth=THREE.MathUtils.smoothstep,lerp=THREE.MathUtils.lerp;
// Display style: solid, softly lit organs in clean anatomical-illustration colours.
const STYLE={
  heart:{colour:'#c8102e',opacity:1,roughness:.4,clearcoat:.45,sheen:0,bump:.35,grain:1.4,show:true},
  lungs:{colour:'#ee98ac',opacity:1,roughness:.66,sheen:.3,bump:.6,grain:.9,show:true},
  liver:{colour:'#b4503f',opacity:1,roughness:.55,clearcoat:.2,bump:.25,grain:.8,show:true},
  airway:{colour:'#c9b8aa',opacity:1,roughness:.6,bump:.2,show:true},
  arteries:{colour:'#e01e30',opacity:1,roughness:.36,clearcoat:.45,sheen:0,show:true},
  veins:{colour:'#2f7ee0',opacity:1,roughness:.36,clearcoat:.45,sheen:0,show:true},
  kidneys:{colour:'#8e2f3a',opacity:1,roughness:.5,bump:.2,show:true},
  spleen:{colour:'#6e2f4f',opacity:1,roughness:.5,bump:.2,show:true},
  pancreas:{colour:'#dca86c',opacity:1,roughness:.6,bump:.4,grain:2,show:true},
  small_intestine:{colour:'#a5645a',opacity:1,roughness:.62,clearcoat:.15,bump:.3,grain:1.5,show:true},
  large_intestine:{colour:'#9a5f4f',opacity:1,roughness:.62,clearcoat:.15,bump:.35,grain:1.2,show:true},
  bladder:{colour:'#e2bd6a',opacity:1,roughness:.5,clearcoat:.2,show:false},
};
// Fine surface relief from 3D noise in world space (no textures needed), so surfaces are not plastic-smooth.
function surfaceDetail(material,strength,grain){
  if(!strength)return;
  material.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vOrg;').replace('#include <project_vertex>','#include <project_vertex>\nvOrg=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vOrg;
      float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){return .55*vn(p)+.3*vn(p*2.3)+.15*vn(p*5.1);}`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      {vec3 p=vOrg*${(grain*1.6).toFixed(2)};const float e=.06;float c=fbm(p);
       vec3 g=vec3(fbm(p+vec3(e,0,0))-c,fbm(p+vec3(0,e,0))-c,fbm(p+vec3(0,0,e))-c)/e;
       g=(viewMatrix*vec4(g,0.)).xyz;normal=normalize(normal-${strength.toFixed(2)}*.35*(g-dot(g,normal)*normal));}`);
  };
  material.customProgramCacheKey=()=>`organ-detail-${strength}-${grain}`;
}

// The heart's electrical wave, drawn on the atlas heart. Uniforms are progress through each phase of the beat:
// atria during the P wave, ventricles during the QRS, recovery during the T wave (0 = start, 1 = end).
// The order across the heart is the textbook human sequence (Durrer et al., Circulation 1970) stored per vertex
// by tools/build_organs.py; recovery runs broadly in reverse, which is why the T wave follows the QRS direction.
const EXCITE={uOn:{value:0},uAtr:{value:-1},uVen:{value:-1},uRec:{value:-1}};
function excitation(material){
  const before=material.onBeforeCompile;
  material.onBeforeCompile=s=>{
    before?.(s);Object.assign(s.uniforms,EXCITE);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float chamber;attribute float activation_order;varying float vAct;varying float vCh;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvAct=activation_order;vCh=chamber;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vAct;varying float vCh;uniform float uOn;uniform float uAtr;uniform float uVen;uniform float uRec;')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        if(uOn>0.){
          float excited,front;
          if(vCh<1.5){   // atria: activated during the P wave, recovered while the ventricles fire
            excited=step(vAct,uAtr)*(1.-smoothstep(0.,.6,uVen));
            front=(1.-smoothstep(0.,.12,abs(uAtr-vAct)))*step(0.,uAtr)*step(uAtr,1.08);
          }else{         // ventricles: activated during the QRS, recovered during the T wave
            excited=step(vAct,uVen)*(1.-step(1.-vAct,uRec));
            front=(1.-smoothstep(0.,.1,abs(uVen-vAct)))*step(0.,uVen)*step(uVen,1.08);
          }
          totalEmissiveRadiance+=uOn*(vec3(.95,.42,.06)*.5*excited+vec3(1.,.9,.5)*1.8*front);
        }`);
  };
  const key=material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey=()=>(key?key():'')+'-excitation';
}

export async function createOrgans(){
  const base='./models/organs/';
  const [meta,buffer]=await Promise.all([fetch(base+'organs.json').then(r=>{if(!r.ok)throw new Error('Organ description failed to load');return r.json();}),
    fetch(base+'organs.bin').then(r=>{if(!r.ok)throw new Error('Organ models failed to load');return r.arrayBuffer();})]);
  const lo=meta.bounds.min,hi=meta.bounds.max,L=meta.landmarks;
  const group=new THREE.Group();group.name='Organs and vessels (Human Reference Atlas, CC BY 4.0)';
  const parts={};
  for(const [name,g] of Object.entries(meta.groups)){
    const q=new Int16Array(buffer,g.position_offset,g.vertices*3),src=new Float32Array(g.vertices*3);
    for(let i=0;i<src.length;i++){const k=i%3;src[i]=lo[k]+(hi[k]-lo[k])*(q[i]+32767)/65534;}
    const geometry=new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(buffer,g.index_offset,g.indices),1));
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(src.length),3));
    const st=STYLE[name]||{colour:g.colour,opacity:g.opacity,roughness:.6,show:true};
    const see=st.opacity<.98,material=new THREE.MeshPhysicalMaterial({color:st.colour,roughness:st.roughness,metalness:0,clearcoat:st.clearcoat||0,clearcoatRoughness:.4,
      sheen:st.sheen??.35,sheenRoughness:.6,sheenColor:new THREE.Color(st.colour).lerp(new THREE.Color('#ffffff'),.5),side:THREE.DoubleSide,
      transparent:see,opacity:st.opacity,depthWrite:!see,envMapIntensity:.55});
    surfaceDetail(material,st.bump||0,st.grain||1);
    for(const [k,off] of Object.entries(g.attributes||{}))   // heart: chamber and activation order, one byte per vertex
      geometry.setAttribute(k,new THREE.BufferAttribute(new Uint8Array(buffer,off,g.vertices),1,k==='activation_order'));
    if(name==='heart')excitation(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.renderOrder=see?.5:0;mesh.frustumCulled=false;mesh.visible=st.show;
    group.add(mesh);parts[name]={mesh,src,material,show:st.show,baseEmissive:0};
  }
  const heart=parts.heart;let heartCentre=new THREE.Vector3();
  // Atlas organ envelope by height (trunk only): half-width and front/back, smoothed so the fit bends gently.
  const EN=80,e0=L.vessels_bottom,e1=L.trachea_top,env={half:new Float32Array(EN).fill(0),zmin:new Float32Array(EN).fill(1e9),zmax:new Float32Array(EN).fill(-1e9)};
  for(const p of Object.values(parts)){const s=p.src;for(let i=0;i<s.length;i+=3){const y=s[i+1];if(y<e0||y>e1)continue;
    const b=Math.min(EN-1,Math.floor((y-e0)/(e1-e0)*EN));env.half[b]=Math.max(env.half[b],Math.abs(s[i]));env.zmin[b]=Math.min(env.zmin[b],s[i+2]);env.zmax[b]=Math.max(env.zmax[b],s[i+2]);}}
  for(const k of ['half','zmin','zmax']){
    const a=env[k],ok=[...a.keys()].filter(b=>Math.abs(a[b])<1e8&&!(k==='half'&&a[b]===0));
    for(let b=0;b<EN;b++)if(!ok.includes(b)){const lo_=ok.filter(c=>c<b).pop(),hi_=ok.find(c=>c>b);a[b]=lo_===undefined?a[hi_]:hi_===undefined?a[lo_]:a[lo_]+(a[hi_]-a[lo_])*(b-lo_)/(hi_-lo_);}
    const sm=Float32Array.from(a,(v,b)=>{let t=0,c=0;for(let d=-4;d<=4;d++){const j=b+d;if(j>=0&&j<EN){t+=a[j];c++;}}return t/c;});
    if(k==='half')for(let b=0;b<EN;b++)a[b]=Math.max(sm[b],a[b]*.9,.02);else a.set(sm);
  }
  const envAt=(k,y)=>{const f=THREE.MathUtils.clamp((y-e0)/(e1-e0)*EN-.5,0,EN-1),i=Math.floor(f),j=Math.min(EN-1,i+1);return env[k][i]+(env[k][j]-env[k][i])*(f-i);};
  const profAt=(pr,k,y)=>{const f=THREE.MathUtils.clamp(y/pr.H*pr.N-.5,0,pr.N-1),i=Math.floor(f),j=Math.min(pr.N-1,i+1);return pr[k][i]+(pr[k][j]-pr[k][i])*(f-i);};

  // Piecewise-linear height map through the anchors (atlas metres -> child centimetres).
  function heightMap(plan){
    const e=plan.eyes,eyeY=(e.left.y+e.right.y)/2,head=(e.left.x-e.right.x)/(L.eye_left[0]-L.eye_right[0]);
    const eyeVh=(L.eye_left[1]+L.eye_right[1])/2,top=eyeVh+.05;   // nothing is drawn above the eyes; the last anchor only closes the map
    // The lowest atlas structures (rectum, pelvic veins) end at the pelvic floor, just above the crotch.
    const xs=[L.vessels_bottom,L.bladder[1],L.heart[1],L.trachea_top,eyeVh,top];
    const ys=[plan.crotch+.03*plan.trunk,plan.crotch+.117*plan.trunk,plan.heart.y,plan.neck,eyeY,eyeY+(top-eyeVh)*head];
    return y=>{
      let i=y<xs[1]?0:y<xs[2]?1:y<xs[3]?2:y<xs[4]?3:4;
      return ys[i]+(y-xs[i])*(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
    };
  }
  function fit(plan){
    const Y=heightMap(plan),e=plan.eyes,pr=plan.profile,FILL=.84;
    const head=(e.left.x-e.right.x)/(L.eye_left[0]-L.eye_right[0]);
    const eyeYvh=(L.eye_left[1]+L.eye_right[1])/2,eyeZvh=(L.eye_left[2]+L.eye_right[2])/2,eyeZ=(e.left.z+e.right.z)/2;
    // Above the heart the outline widens into the shoulders; organs there must not widen with it (the lung tops are narrow).
    const hv=L.heart[1],ht=Y(hv),sxHeart=FILL*profAt(pr,'half',ht)/envAt('half',hv);
    const szHeart=FILL*(profAt(pr,'front',ht)-profAt(pr,'back',ht))/Math.max(envAt('zmax',hv)-envAt('zmin',hv),.02);
    // In the pelvis the outline widens into the hips while the atlas structures narrow; cap the scale there too.
    const pv=L.bladder[1]+.07,pt=Y(pv),sxPelvis=FILL*profAt(pr,'half',pt)/envAt('half',pv);
    const szPelvis=FILL*(profAt(pr,'front',pt)-profAt(pr,'back',pt))/Math.max(envAt('zmax',pv)-envAt('zmin',pv),.02);
    // Atlas point -> child point. Trunk: fill the child's outline at this height. Head: scale by the distance between the eyes.
    const map=(x,y,z,out,i)=>{
      const t=smooth(y,L.trachea_top,eyeYvh),yc=Y(y),ya=Math.min(y,L.trachea_top),yt=Y(ya);
      let sx=FILL*profAt(pr,'half',yt)/envAt('half',ya);if(ya>hv)sx=Math.min(sx,sxHeart);if(ya<pv)sx=Math.min(sx,sxPelvis);
      const cF=profAt(pr,'front',yt),cB=profAt(pr,'back',yt),zMin=envAt('zmin',ya),zMax=envAt('zmax',ya);
      let sz=FILL*(cF-cB)/Math.max(zMax-zMin,.02);if(ya>hv)sz=Math.min(sz,szHeart);if(ya<pv)sz=Math.min(sz,szPelvis);
      const zTorso=(cF+cB)/2+(z-(zMax+zMin)/2)*sz;
      out[i]=x*lerp(sx,head,t);out[i+1]=yc;out[i+2]=lerp(zTorso,eyeZ+(z-eyeZvh)*head,t);
    };
    for(const p of Object.values(parts)){
      const out=p.mesh.geometry.attributes.position.array,s=p.src;
      for(let i=0;i<s.length;i+=3)map(s[i],s[i+1],s[i+2],out,i);
      p.mesh.geometry.attributes.position.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();
    }
    // Illustration choice: set the intestines slightly deeper and narrower so the aorta, vena cava and their
    // branches read in front of them, as in atlas plates.
    for(const k of ['small_intestine','large_intestine']){const g=parts[k].mesh.geometry,a_=g.attributes.position,b_=new THREE.Box3().setFromBufferAttribute(a_),c_=b_.getCenter(new THREE.Vector3()),dz=(b_.max.z-b_.min.z);
      for(let i=0;i<a_.count;i++)a_.setXYZ(i,c_.x+(a_.getX(i)-c_.x)*.94,a_.getY(i),c_.z+(a_.getZ(i)-c_.z)*.85-dz*.16);a_.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
    // Illustration choice, as in anatomy atlases: draw the front, inner edges of the lungs back towards the sides
    // so the heart shows between them. Outer edges stay where they are, so the lungs stay inside the chest; the heart
    // itself is not moved, so it stays joined to its coronary vessels and the great vessels.
    const hb=new THREE.Box3().setFromBufferAttribute(heart.mesh.geometry.attributes.position),hs=hb.getSize(new THREE.Vector3()),hc=hb.getCenter(new THREE.Vector3());
    {const g=parts.lungs.mesh.geometry,l=g.attributes.position,lb=new THREE.Box3().setFromBufferAttribute(l),half=Math.max(lb.max.x-hc.x,hc.x-lb.min.x);
      for(let i=0;i<l.count;i++){
        const x=l.getX(i),dx=x-hc.x,side=Math.sign(dx)||1,d=(l.getY(i)-hc.y)/(hs.y*1.15);
        const near=1-Math.min(1,Math.abs(dx)/half),front=smooth(l.getZ(i),hc.z-hs.z*.6,hc.z+hs.z*.4);
        l.setX(i,x+side*hs.x*.75*Math.exp(-d*d*.7)*near*near*front);
      }
      l.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
    // Anything that would show through the skin (vessels near the collarbones and pelvis, mostly) is moved just inside it.
    {const v=new THREE.Vector3(),m=.3*plan.H/128;for(const [k,p] of Object.entries(parts)){if(k==='heart')continue;const a_=p.mesh.geometry.attributes.position;
      for(let i=0;i<a_.count;i++){v.fromBufferAttribute(a_,i);plan.inside(v,m);a_.setXYZ(i,v.x,v.y,v.z);}a_.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();}}
    // The heart beats about its own centre: recentre its vertices on the mesh origin.
    const a=heart.mesh.geometry.attributes.position,box=new THREE.Box3().setFromBufferAttribute(a);box.getCenter(heartCentre);
    for(let i=0;i<a.count;i++)a.setXYZ(i,a.getX(i)-heartCentre.x,a.getY(i)-heartCentre.y,a.getZ(i)-heartCentre.z);
    a.needsUpdate=true;heart.mesh.position.copy(heartCentre);heart.mesh.geometry.computeBoundingSphere();
    const size=box.getSize(new THREE.Vector3());
    // Lower ends of the aorta and the inferior vena cava, where the leg vessels join the trunk.
    const endOf=(src,y0,y1,maxX)=>{const m=[0,0,0];let n=0;for(let i=0;i<src.length;i+=3)if(src[i+1]>y0&&src[i+1]<y1&&Math.abs(src[i])<maxX){m[0]+=src[i];m[1]+=src[i+1];m[2]+=src[i+2];n++;}
      const o=[0,0,0];map(m[0]/n,m[1]/n,m[2]/n,o,0);return new THREE.Vector3(...o);};
    // Conduction landmarks (sinus node, AV node, bundle branches), mapped the same way as the heart.
    const mapPoint=v=>{const o=[0,0,0];map(v[0],v[1],v[2],o,0);return new THREE.Vector3(...o);};
    const C=meta.conduction,conduction={sinusNode:mapPoint(C.sinus_node),avNode:mapPoint(C.av_node),hisEnd:mapPoint(C.his_end),apex:mapPoint(C.apex),
      leftBundle:C.left_bundle.map(mapPoint),rightBundle:C.right_bundle.map(mapPoint)};
    return {heart:{x:heartCentre.x,y:heartCentre.y,z:heartCentre.z,size:Math.max(size.x,size.y,size.z)},conduction,
      trunk:{aortaEnd:endOf(parts.arteries.src,.19,.215,.035),cavaEnd:endOf(parts.veins.src,.17,.195,.045)}};
  }
  return {group,meta,fit,
    // squeeze: 0 relaxed, 1 fully contracted. glow: 0–1 during the QT interval.
    pulse(squeeze,glow){heart.mesh.scale.set(1-.085*squeeze,1-.05*squeeze,1-.085*squeeze);heart.material.emissive.setRGB(.45*glow,.04*glow,.06*glow);},
    // showAtlasHeart: false when the detailed cutaway heart takes its place. heartOnly: show just the heart
    // and the vessels, so the liver and gut do not cover the lower heart in a close-up.
    setView(view,showAtlasHeart=view!=='heart',heartOnly=false){
      heart.mesh.visible=showAtlasHeart;
      for(const [k,p] of Object.entries(parts))if(k!=='heart')p.mesh.visible=p.show&&(heartOnly?k==='arteries'||k==='veins':view!=='heart'||!['lungs','airway'].includes(k));
    },
    // Electrical wave on the atlas heart: progress through P, QRS and T (see EXCITE); on = 0 hides it.
    excite(on,atrial,ventricular,recovery){EXCITE.uOn.value=on;EXCITE.uAtr.value=atrial;EXCITE.uVen.value=ventricular;EXCITE.uRec.value=recovery;},
    heartMesh:heart.mesh};
}
