import * as THREE from 'three';

// Display masks use only the model's existing painted colors, not anatomical segmentation.
export function createContrastMaterial(source, uniforms, featuresOnly=false){
  const material=new THREE.MeshPhysicalMaterial({
    map:source.map,normalMap:source.normalMap,normalScale:new THREE.Vector2(1.15,1.15),
    aoMap:source.aoMap,aoMapIntensity:.8,roughness:.53,metalness:.025,
    clearcoat:.12,clearcoatRoughness:.55,side:THREE.FrontSide,
    transparent:!featuresOnly,depthWrite:featuresOnly,alphaTest:featuresOnly?.22:0,alphaToCoverage:featuresOnly
  });
  material.onBeforeCompile=shader=>{
    shader.uniforms.tissueOpacity=uniforms.tissueOpacity;
    shader.uniforms.vesselEmphasis=uniforms.vesselEmphasis;
    shader.uniforms.surfaceDetail=uniforms.surfaceDetail;
    shader.fragmentShader=`uniform float tissueOpacity;
      uniform float vesselEmphasis;
      uniform float surfaceDetail;
      vec2 paintedFeature(vec3 linearColor){
        vec3 c=pow(max(linearColor,vec3(0.0)),vec3(1.0/2.2));
        float blue=smoothstep(0.05,0.3,c.b-max(c.r,c.g));
        float purity=c.r/max(c.r+c.g+c.b,0.001);
        float red=smoothstep(0.86,0.96,purity)*smoothstep(0.65,0.9,c.r);
        return vec2(red,blue);
      }
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 painted=pow(max(diffuseColor.rgb,vec3(0.0)),vec3(1.0/2.2));
      vec2 feature=paintedFeature(diffuseColor.rgb);
      // Broad painted areas stay translucent; fine lines get a separate crisp pass.
      vec2 nearby=(paintedFeature(texture2D(map,vMapUv+vec2(.006,0.0)).rgb)
        +paintedFeature(texture2D(map,vMapUv-vec2(.006,0.0)).rgb)
        +paintedFeature(texture2D(map,vMapUv+vec2(0.0,.006)).rgb)
        +paintedFeature(texture2D(map,vMapUv-vec2(0.0,.006)).rgb))*.25;
      vec2 fineFeature=feature*smoothstep(vec2(.12),vec2(.65),feature-nearby*.95);
      float fineMask=max(fineFeature.r,fineFeature.g)*vesselEmphasis;
      float detail=dot(painted,vec3(.24,.65,.11));
      float pale=smoothstep(.40,.78,min(painted.r,min(painted.g,painted.b)));
      vec3 tissue=mix(vec3(.045,.072,.09),vec3(.43,.28,.30),pow(detail,.72));
      tissue=mix(tissue,vec3(.66,.50,.37)*painted,pale);
      vec3 warmVessel=vec3(.83,.22,.12)*(.65+.35*painted.r);
      vec3 coolVessel=vec3(.025,.34,.42)*(.65+.35*painted.b);
      vec3 featureColor=mix(warmVessel,coolVessel,feature.g);
      ${featuresOnly?`
      diffuseColor.rgb=featureColor;
      diffuseColor.a=fineMask;
      `:`
      tissue=mix(tissue,coolVessel,feature.g*.35);
      diffuseColor.rgb=tissue;
      diffuseColor.a*=tissueOpacity*(1.0-fineMask);
      `}
    `);
    if(featuresOnly)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      totalEmissiveRadiance+=featureColor*.18*vesselEmphasis;
    `);
    if(!featuresOnly)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float silhouette=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.8);
      outgoingLight+=vec3(.20,.38,.42)*silhouette*surfaceDetail;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>featuresOnly?'heart-features-v3':'heart-shell-v3';
  return material;
}
