import { ecgReference } from './reference.js?v=3';
import { CYCLE } from './cycle-profile.js?v=1';

// Illustrative sample ECG and vectorcardiogram (the "3D ECG" loop).
// Heart rate, PR, P and QRS duration, QTc and frontal axes are published
// medians (see reference.js). Wave shapes, sagittal (front–back) components,
// T-wave size and the electromechanical delay are illustrative choices.
// Nothing here is computed from the 3D heart mesh.
//
// Vectors use patient axes: x = left, y = inferior (down), z = anterior.

const rad=d=>d*Math.PI/180;
const frontal=(deg,z=0)=>[Math.cos(rad(deg)),Math.sin(rad(deg)),z];
export const LEAD_II=frontal(60);
// The QRS begins shortly before the shared cycle profile starts contracting.
export const CONTRACTION_START=CYCLE.contractionStart, ELECTROMECHANICAL_DELAY=0.03;

export function ecgBands(population){return population==='adult-men'?ecgReference.adultMen.bands:ecgReference.pediatric.bands;}
export function defaultBand(population){return population==='adult-men'?1:3;}

export function ecgParameters(population,sex,band){
  const adult=population==='adult-men',source=adult?ecgReference.adultMen:ecgReference.pediatric;
  const row=adult?source.male:source[sex==='male'?'male':'female'];
  if(!Number.isInteger(band)||band<0||band>=source.bands.length)throw new RangeError('Select a published ECG age group.');
  const pick=key=>({median:row[key][band][0],low:row[key][band][1],high:row[key][band][2]});
  const hr=pick('hr'),qtc=pick('qtc'),rr=60/hr.median;
  const ill=ecgReference.illustrative;
  return {
    population,sex:adult?'male':sex,band,bandLabel:source.bands[band],study:source.study,doi:source.doi,
    hr,rr,pr:pick('pr'),pDur:pick('pDur'),qrsDur:pick('qrsDur'),qtc,
    qt:qtc.median*Math.sqrt(rr), // Bazett: QT = QTc × √RR (ms, RR in s)
    pAxis:pick('pAxis').median,qrsAxis:pick('qrsAxis').median,
    tAxis:adult?pick('tAxis').median:ill.pediatricTAxis,
    rII:adult?ill.adultRII:row.rII[band],pII:adult?ill.adultPII:row.pII[band],tII:ill.tII,
    illustrative:['wave shapes','front–back (sagittal) loop components','T-wave amplitude','electromechanical delay',...(adult?['adult P and R amplitudes']:['pediatric T-wave axis'])]
  };
}

// A wave is an (optionally asymmetric) Gaussian pulse along a fixed 3D direction.
const wave=(center,rise,fall,dir,group)=>({center,rise,fall,dir:[...dir],group});
const add=(a,b,k)=>{a[0]+=b[0]*k;a[1]+=b[1]*k;a[2]+=b[2]*k;};

export function buildECG(p){
  const rr=p.rr,s=x=>x/1000;
  const qrsOnset=CONTRACTION_START*rr-ELECTROMECHANICAL_DELAY;
  const d=s(p.qrsDur.median),pd=s(p.pDur.median),qt=s(p.qt);
  const pOnset=qrsOnset-s(p.pr.median);
  // Onsets and ends sit about 2.8 σ from each pulse centre (≈2% of its peak).
  const sp=pd/7,sq=d*.06,sr=d*.12,ss=d*.07,tf=qt*.08,tr=qt*.14;
  const waves=[
    wave(pOnset+2.8*sp,sp,sp,frontal(p.pAxis-12,.25),'P'),           // right atrium
    wave(pOnset+pd-2.8*sp,sp,sp,frontal(p.pAxis+12,-.25),'P'),       // left atrium
    wave(qrsOnset+2.8*sq,sq,sq,[-.55,-.1,.8].map(v=>v*.14),'QRS'),    // septal: rightward, anterior
    wave(qrsOnset+d*.45,sr,sr,frontal(p.qrsAxis,-.35),'QRS'),         // main ventricular force
    wave(qrsOnset+d-1.5*ss,ss,ss,[-.45,-.75,-.5].map(v=>v*.3),'QRS'), // terminal: rightward, superior, posterior
    wave(qrsOnset+qt-2.8*tf,tr,tf,frontal(p.tAxis,.25),'T')
  ];
  const model={params:p,rr,waves,qrsOnset,pOnset,
    vector(t,group){
      const v=[0,0,0];
      for(const w of waves){
        if(group&&w.group!==group)continue;
        const dt=((t-w.center)%rr+rr*1.5)%rr-rr/2; // periodic distance to the pulse centre
        const sigma=dt<0?w.rise:w.fall;add(v,w.dir,Math.exp(-dt*dt/(2*sigma*sigma)));
      }
      return v;
    },
    lead(t,lead=LEAD_II){const v=model.vector(t);return v[0]*lead[0]+v[1]*lead[1]+v[2]*lead[2];}
  };
  // Calibrate each group's peak in lead II to its reference amplitude (mV).
  for(const [group,target] of [['P',p.pII],['QRS',p.rII],['T',p.tII]]){
    let peak=0;for(let i=0;i<2000;i++){const v=model.vector(i/2000*rr,group);peak=Math.max(peak,v[0]*LEAD_II[0]+v[1]*LEAD_II[1]+v[2]*LEAD_II[2]);}
    for(const w of waves)if(w.group===group)w.dir=w.dir.map(x=>x*target/peak);
  }
  return model;
}
