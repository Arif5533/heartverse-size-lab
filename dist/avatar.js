import * as THREE from 'three';

// Child body for the child heart lab.
//
// The shape is MakeHuman's base body (CC0) with its eye, eyelash and tights
// helpers, generated with the MPFB add-on at three ages that share one mesh:
// baby (1 year), child (10 years) and a 14-year-old (tools/generate_body.py).
// MakeHuman blends age linearly between those targets, so any age from 1 to 14
// is interpolated here the same way, then scaled to a rounded typical height.
// The body is see-through by default (outline, face and hair stay visible), or lit skin with a see-through window over the heart.
// Lips, nails and scalp come from MakeHuman's own masks; eyebrows are drawn
// from the eye positions. It illustrates body shape; it measures no child.
// WHO median height (cm) at each whole year of age, 1–14. Age 1: length, birth–2 years table; ages 2–5: height,
// 2–5 years table (WHO Child Growth Standards, Acta Paediatr 2006); ages 6–14: WHO growth reference 5–19 years
// (de Onis et al., Bull World Health Organ 2007). Read from the WHO simplified field tables (percentiles).
export const WHO_HEIGHT_CM={
  female:[74.0,85.7,95.1,102.7,109.4,115.1,120.8,126.6,132.5,138.6,145.0,151.2,156.4,159.8],
  male:[75.7,87.1,96.1,103.3,110.0,116.0,121.7,127.3,132.6,137.8,143.1,149.1,156.0,163.2]};
// The figure is the same for girls and boys, so it uses the average of the two medians.
export const HEIGHT_CM=WHO_HEIGHT_CM.female.map((f,i)=>Math.round((f+WHO_HEIGHT_CM.male[i])/2*10)/10);
export const SKIN_TONES={light:'#efc5a6',medium:'#cf9670',tan:'#a46c48',deep:'#64402c'};
const lerp=THREE.MathUtils.lerp,smooth=THREE.MathUtils.smoothstep;
const HAIR={light:'#3a2618',medium:'#2a1a10',tan:'#1f140d',deep:'#120c09'};

function skinMaterial(u){
  const m=new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.58,metalness:0,sheen:.5,sheenRoughness:.55,sheenColor:new THREE.Color('#ff9c86'),
    clearcoat:.06,clearcoatRoughness:.6,transparent:true,depthWrite:false});
  m.onBeforeCompile=s=>{
    Object.assign(s.uniforms,u);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float hairW;varying vec3 vHvWorld;varying float vHair;')
      .replace('#include <project_vertex>','#include <project_vertex>\nvHvWorld=(modelMatrix*vec4(transformed,1.)).xyz;vHair=hairW;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vHvWorld;varying float vHair;uniform vec3 heartPos;uniform float windowR;uniform float fade;uniform float skinAlpha;uniform float glassy;uniform vec3 smoke;uniform vec4 eyeL;uniform vec4 eyeR;uniform float browDensity;uniform vec3 browColor;
        float browW(vec4 e){
          if(vHvWorld.z<e.z)return 0.;
          float side=sign(e.x),u=(vHvWorld.x-e.x)*side/e.w,v=(vHvWorld.y-e.y)/e.w;
          float c=1.28+.08*u-.15*(u-.25)*(u-.25),h=mix(.25,.12,smoothstep(-1.,1.6,u));
          float along=smoothstep(-1.25,-.85,u)*(1.-smoothstep(1.3,1.75,u));
          return (1.-smoothstep(h*.4,h,abs(v-c)))*along*(.72+.28*sin(u*55.+v*9.));
        }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        // Transparent look: the whole body, head included, is glass with no facial features.
        float g=glassy;
        float strands=.5+.5*sin(dot(vHvWorld,vec3(2.9,.35,2.4))*7.)*sin(dot(vHvWorld,vec3(-2.1,.6,3.1))*11.);
        diffuseColor.rgb*=mix(1.,.72+.56*strands,vHair*(1.-g));
        float brows=clamp(max(browW(eyeL),browW(eyeR))*browDensity,0.,1.)*(1.-g);
        diffuseColor.rgb=mix(diffuseColor.rgb,browColor,brows);
        // Glass look (as in anatomy viewers): a dark smoky shell tinted by the skin tone; painted hair and brows are left out.
        diffuseColor.rgb=mix(diffuseColor.rgb,smoke,g);
        float hvD=length((vHvWorld-heartPos)/vec3(windowR,windowR*1.12,windowR*1.7));
        float hvWin=1.-smoothstep(.72,1.,hvD);`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance+=vec3(.20,.50,.55)*(smoothstep(.66,.84,hvD)-smoothstep(.88,1.06,hvD))*.55*(1.-g);`)
      // Glass body: clear in the middle of each surface and bright at the outline (Fresnel), so the inside shows through.
      .replace('#include <opaque_fragment>',`
        float rim=pow(1.-abs(dot(normalize(normal),normalize(vViewPosition))),2.4);
        float body=mix(.97,mix(skinAlpha,.9,rim),g);
        diffuseColor.a*=mix(body,.12,hvWin*(1.-glassy))*fade;
        outgoingLight=mix(outgoingLight,outgoingLight*.8+diffuseColor.rgb*.25+vec3(.98,.88,.78)*rim*.7,g);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey=()=>'heartverse-skin-v9';
  return m;
}
function eyeMaterial(u){
  const m=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.32,clearcoat:1,clearcoatRoughness:.04,transparent:true});
  m.onBeforeCompile=s=>{
    Object.assign(s.uniforms,u);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 eyeDir;varying vec3 vEyeDir;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvEyeDir=eyeDir;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEyeDir;uniform vec3 irisColor;uniform float fade;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 d=normalize(vEyeDir);float a=acos(clamp(d.z,-1.,1.)),ang=atan(d.y,d.x);
        const float irisR=.47,pupilR=.18;
        float streak=.5+.5*sin(ang*41.+a*11.)*sin(ang*17.);
        vec3 iris=mix(irisColor*.55,irisColor*1.25,streak*smoothstep(pupilR,irisR,a));
        iris=mix(iris,irisColor*.28,smoothstep(irisR*.78,irisR,a));
        vec3 sclera=mix(vec3(.94,.91,.88),vec3(.86,.72,.70),smoothstep(1.5,2.4,a));
        vec3 c=mix(iris,sclera,smoothstep(irisR-.025,irisR+.025,a));
        c=mix(vec3(.015),c,smoothstep(pupilR-.02,pupilR+.02,a));
        diffuseColor=vec4(c,fade);`);
  };
  m.customProgramCacheKey=()=>'heartverse-eye-v2';
  return m;
}

export async function createAvatar(){
  const base='./models/child-body/';
  const [meta,buffer]=await Promise.all([fetch(base+'body.json').then(r=>{if(!r.ok)throw new Error('Body model description failed to load');return r.json();}),
    fetch(base+'body.bin').then(r=>{if(!r.ok)throw new Error('Body model failed to load');return r.arrayBuffer();})]);
  const n=meta.vertices,P=meta.parts,lo=meta.bounds.min,hi=meta.bounds.max;
  const decode=name=>{const q=new Uint16Array(buffer,meta.position_offsets[name],n*3),f=new Float32Array(n*3);
    for(let i=0;i<n*3;i++){const k=i%3;f[i]=lo[k]+(hi[k]-lo[k])*q[i]/65535;}return f;};
  const shapes={baby:decode('baby'),child:decode('child'),teen:decode('teen')};
  const raw=new Uint8Array(buffer,meta.attribute_offset,n*4),part=new Uint8Array(n),scalp=new Float32Array(n),lips=new Float32Array(n),nails=new Float32Array(n);
  for(let i=0;i<n;i++){part[i]=raw[4*i];scalp[i]=raw[4*i+1]/255;lips[i]=raw[4*i+2]/255;nails[i]=raw[4*i+3]/255;}
  const index=new THREE.BufferAttribute(new Uint32Array(buffer,0,meta.index_count),1);
  const hairW=new THREE.BufferAttribute(new Float32Array(n),1),position=new THREE.BufferAttribute(new Float32Array(n*3),3),color=new THREE.BufferAttribute(new Float32Array(n*3),3),eyeDir=new THREE.BufferAttribute(new Float32Array(n*3),3);
  const all=new THREE.BufferGeometry();all.setIndex(index);all.setAttribute('position',position);
  all.computeVertexNormals();const normal=all.getAttribute('normal');

  const uniforms={eyeL:{value:new THREE.Vector4()},eyeR:{value:new THREE.Vector4()},browDensity:{value:.6},browColor:{value:new THREE.Color()},heartPos:{value:new THREE.Vector3()},windowR:{value:8},fade:{value:1},skinAlpha:{value:.2},glassy:{value:1},smoke:{value:new THREE.Color()},irisColor:{value:new THREE.Color('#5b3a20')}};
  const group=new THREE.Group();group.name='Child body (MakeHuman base mesh)';
  function piece(name,material,order){
    const g=new THREE.BufferGeometry();g.setIndex(index);
    for(const [k,a] of [['position',position],['normal',normal],['color',color],['eyeDir',eyeDir],['hairW',hairW]])g.setAttribute(k,a);
    const [start,count]=meta.index_ranges[name];g.setDrawRange(start,count);
    const mesh=new THREE.Mesh(g,material);mesh.renderOrder=order;mesh.frustumCulled=false;group.add(mesh);return mesh;
  }
  // Depth pass first, colour pass second: only the nearest skin surface is drawn, so the far side and the insides stay hidden.
  piece('skin',new THREE.MeshBasicMaterial({colorWrite:false,transparent:true}),1);
  piece('skin',skinMaterial(uniforms),3);
  const eyes=eyeMaterial(uniforms),eyeMeshes=[piece('eye_left',eyes,2),piece('eye_right',eyes,2)];
  const lashes=new THREE.MeshStandardMaterial({color:'#2a1c14',roughness:.85,side:THREE.DoubleSide,transparent:true,opacity:.4,depthWrite:false});const lashMesh=piece('lashes',lashes,2);
  const shorts=new THREE.MeshPhysicalMaterial({color:'#2f4f6b',roughness:.92,sheen:.6,sheenRoughness:.8,sheenColor:new THREE.Color('#7fa6c7'),side:THREE.DoubleSide,transparent:true});
  const shortsMesh=piece('shorts',shorts,0);

  let plan=null,tone='medium',look='transparent';
  const pos=position.array,nor=normal.array;
  function eyeCentres(){
    const c={[P.eye_left]:[0,0,0,0],[P.eye_right]:[0,0,0,0]};
    for(let i=0;i<n;i++){const e=c[part[i]];if(e){e[0]+=pos[3*i];e[1]+=pos[3*i+1];e[2]+=pos[3*i+2];e[3]++;}}
    const out={};
    for(const k of [P.eye_left,P.eye_right]){const e=c[k];out[k]={x:e[0]/e[3],y:e[1]/e[3],z:e[2]/e[3],r:0};}
    for(let i=0;i<n;i++){const e=out[part[i]];if(e){const dx=pos[3*i]-e.x,dy=pos[3*i+1]-e.y,dz=pos[3*i+2]-e.z,l=Math.hypot(dx,dy,dz);e.r=Math.max(e.r,l);eyeDir.array.set([dx/l,dy/l,dz/l],3*i);}}
    eyeDir.needsUpdate=true;return out;
  }
  // MakeHuman's scalp region reaches down to the brows; on the face side, hair stops at a hairline that dips at the temples.
  function hairline(eye){
    const L=eye[P.eye_left],R=eye[P.eye_right],r=(L.r+R.r)/2,ey=(L.y+R.y)/2,ez=Math.max(L.z,R.z),w=hairW.array;
    for(let i=0;i<n;i++){
      if(!scalp[i]){w[i]=0;continue;}
      const u=Math.abs(pos[3*i])/r,v=(pos[3*i+1]-ey)/r,front=smooth(pos[3*i+2],ez-2.4*r,ez-.7*r),line=4.0-.22*u*u;
      w[i]=scalp[i]*(1-front*(1-smooth(v,line-.4,line+.4)));
    }
    hairW.needsUpdate=true;
  }
  function paint(){
    const c=new THREE.Color(SKIN_TONES[tone]),lip=c.clone().lerp(new THREE.Color('#a8524c'),.42),nail=c.clone().lerp(new THREE.Color('#f6e4dc'),.4);
    const hair=new THREE.Color(HAIR[tone]),browC=hair.clone().lerp(c,.25),density=plan?lerp(.62,.97,Math.min(1,plan.t*2)):1,out=new THREE.Color();
    for(let i=0;i<n;i++){
      out.copy(c).lerp(lip,lips[i]).lerp(nail,nails[i]*.85).lerp(hair,hairW.array[i]*density);
      color.array[3*i]=out.r;color.array[3*i+1]=out.g;color.array[3*i+2]=out.b;
    }
    color.needsUpdate=true;uniforms.browColor.value.copy(browC);uniforms.smoke.value.copy(c).multiplyScalar(.62);
  }
  // Trunk outline by height: half-width (walking out from the midline to the first gap) and front and back.
  // At heart level the arms touch the chest, so the chest width is taken just below the armpits and caps the trunk.
  function profile(H,crotch,neck,heartY){
    const N=96,cols=Array.from({length:N},()=>[]),half=new Float32Array(N),front=new Float32Array(N),back=new Float32Array(N),bin=y=>Math.min(N-1,Math.max(0,Math.floor(y/H*N)));
    for(let i=0;i<n;i++){if(part[i]!==P.skin)continue;cols[bin(pos[3*i+1])].push(i);}
    for(let b=0;b<N;b++){const xs=cols[b].map(i=>Math.abs(pos[3*i])).sort((p,q)=>p-q);let w=xs[0]||0;for(const x of xs){if(x-w>H*.008)break;w=x;}half[b]=w;}
    let chestHalf=1e9;for(let b=bin(heartY-H*.08);b<=bin(heartY-H*.02);b++)chestHalf=Math.min(chestHalf,half[b]);
    for(let b=bin(crotch);b<=bin(neck);b++)half[b]=Math.min(half[b],chestHalf*1.06);
    for(let b=0;b<N;b++){let f=-1e9,k=1e9;for(const i of cols[b])if(Math.abs(pos[3*i])<half[b]*.35){const z=pos[3*i+2];if(z>f)f=z;if(z<k)k=z;}front[b]=f;back[b]=k;}
    return {N,H,half,front,back,chestHalf};
  }
  // Keeps points inside the body: a point beyond the nearest skin vertex (along that vertex's outward normal)
  // is moved back in, to `margin` cm below the surface. Used for organs and vessels near the skin.
  function skinGuard(){
    const cell=1.5,grid=new Map(),key=(x,y,z)=>`${Math.floor(x/cell)},${Math.floor(y/cell)},${Math.floor(z/cell)}`;
    for(let i=0;i<n;i++){if(part[i]!==P.skin)continue;const k=key(pos[3*i],pos[3*i+1],pos[3*i+2]);let c=grid.get(k);if(!c)grid.set(k,c=[]);c.push(i);}
    const P_=pos.slice(),N_=nor.slice();
    return (v,margin)=>{
      let best=-1,bd=Infinity;const cx=Math.floor(v.x/cell),cy=Math.floor(v.y/cell),cz=Math.floor(v.z/cell);
      for(let r=1;r<=3&&best<0;r++)for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++)for(const s of grid.get(`${cx+i},${cy+j},${cz+k}`)||[]){
        const d=(P_[3*s]-v.x)**2+(P_[3*s+1]-v.y)**2+(P_[3*s+2]-v.z)**2;if(d<bd){bd=d;best=s;}}
      if(best<0)return v;
      const d=(v.x-P_[3*best])*N_[3*best]+(v.y-P_[3*best+1])*N_[3*best+1]+(v.z-P_[3*best+2])*N_[3*best+2];
      if(d>-margin){v.x-=N_[3*best]*(d+margin);v.y-=N_[3*best+1]*(d+margin);v.z-=N_[3*best+2]*(d+margin);}
      return v;
    };
  }
  function landmarks(H){
    const bins=64,minX=new Float32Array(bins).fill(1e9),maxX=new Float32Array(bins).fill(-1e9);let crotch=H;
    for(let i=0;i<n;i++){
      if(part[i]!==P.skin)continue;
      const x=pos[3*i],y=pos[3*i+1],b=Math.min(bins-1,Math.max(0,Math.floor(y/H*bins)));
      if(x<minX[b])minX[b]=x;if(x>maxX[b])maxX[b]=x;
      if(Math.abs(x)<H*.006&&y<crotch&&y>H*.2)crotch=y;                   // lowest point on the midline: where the legs meet
    }
    let neck=H*.8,narrow=1e9;                                             // the neck is the narrowest level between chest and head
    for(let b=Math.floor(bins*.6);b<Math.floor(bins*.92);b++){const w=maxX[b]-minX[b];if(w>0&&w<narrow){narrow=w;neck=(b+.5)/bins*H;}}
    const trunk=neck-crotch,heartY=neck-trunk*.29;let front=-1e9,back=1e9;
    for(let i=0;i<n;i++){if(part[i]!==P.skin)continue;const y=pos[3*i+1];if(Math.abs(y-heartY)<H*.02&&Math.abs(pos[3*i])<H*.05){const z=pos[3*i+2];if(z>front)front=z;if(z<back)back=z;}}
    const pr=profile(H,crotch,neck,heartY);
    return {neck,crotch,trunk,heartY,front,back,chestHalf:pr.chestHalf,profile:pr};
  }
  function update(age,skinTone=tone){
    tone=skinTone;
    const H=HEIGHT_CM[age-1],t=(age-1)/13;
    const [a,b,k]=age<=10?[shapes.baby,shapes.child,(age-1)/9]:[shapes.child,shapes.teen,(age-10)/4];
    let low=1e9,high=-1e9,cx=0,cz=0,m=0;
    for(let i=0;i<n*3;i++)pos[i]=a[i]+(b[i]-a[i])*k;
    for(let i=0;i<n;i++){if(part[i]!==P.skin)continue;const y=pos[3*i+1];if(y<low)low=y;if(y>high)high=y;cx+=pos[3*i];cz+=pos[3*i+2];m++;}
    cx/=m;cz/=m;const s=H/(high-low);                                     // metres -> centimetres at the height for this age
    // MakeHuman's joint markers, blended and placed the same way as the body (used to draw limb vessels).
    const [ja,jb]=age<=10?[meta.joints.baby,meta.joints.child]:[meta.joints.child,meta.joints.teen],joints={};
    for(const name in ja){const p=ja[name],q=jb[name];joints[name]=new THREE.Vector3(((p[0]+(q[0]-p[0])*k)-cx)*s,((p[1]+(q[1]-p[1])*k)-low)*s,((p[2]+(q[2]-p[2])*k)-cz)*s);}
    for(let i=0;i<n;i++){pos[3*i]=(pos[3*i]-cx)*s;pos[3*i+1]=(pos[3*i+1]-low)*s;pos[3*i+2]=(pos[3*i+2]-cz)*s;}
    const eye=eyeCentres(),L=eye[P.eye_left],R=eye[P.eye_right];
    hairline(eye);all.computeVertexNormals();
    const thick=H*lerp(.002,.0045,t),hw=hairW.array;                       // a thin layer of hair over the scalp
    for(let i=0;i<n;i++)if(hw[i]>0){const w=hw[i]*thick;pos[3*i]+=nor[3*i]*w;pos[3*i+1]+=nor[3*i+1]*w;pos[3*i+2]+=nor[3*i+2]*w;}
    all.computeVertexNormals();position.needsUpdate=true;normal.needsUpdate=true;
    const lm=landmarks(H),depth=lm.front-lm.back,inside=skinGuard();
    // Eyebrows are drawn per pixel in the skin shader, as a soft arch above each eye scaled by eye size.
    uniforms.eyeL.value.set(L.x,L.y,L.z,L.r);uniforms.eyeR.value.set(R.x,R.y,R.z,R.r);uniforms.browDensity.value=lerp(.3,.85,Math.min(1,t*1.4));
    plan={age,H,t,...lm,joints,inside,eyes:{left:L,right:R},face:{x:(L.x+R.x)/2,y:(L.y+R.y)/2-L.r*1.6,z:Math.max(L.z,R.z)},
      // The heart sits behind the breastbone, a little to the child's left. Size is illustrative.
      heart:{x:H*.012,y:lm.heartY,z:lm.back+depth*.6,size:H*lerp(.105,.09,t)}};
    uniforms.heartPos.value.set(plan.heart.x,plan.heart.y,plan.heart.z);uniforms.windowR.value=plan.heart.size*.68;
    paint();
    return plan;
  }
  return {group,update,meta,get plan(){return plan;},
    setHeart(h){plan.heart=h;uniforms.heartPos.value.set(h.x,h.y,h.z);uniforms.windowR.value=h.size*.68;},setTone(t){tone=t;paint();},
    setLook(next){look=next;const glass=look==='transparent';uniforms.glassy.value=glass?1:0;this.setFade(uniforms.fade.value);},
    setFade(v){uniforms.fade.value=v;const glass=look==='transparent';shorts.opacity=v;shortsMesh.visible=!glass;lashes.opacity=.4*v;
      for(const m of [...eyeMeshes,lashMesh])m.visible=!glass;}};   // no face in the glass look
}
