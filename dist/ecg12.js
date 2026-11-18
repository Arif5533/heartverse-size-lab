// 12-lead ECG and heart vector of the typical child, a direct JavaScript copy of the Heartverse Stage 2
// simulator (experiments/vcg-simulator: beatmodel.py kernels, simulate.py timing and lead projection).
// Data: data/child-heart.json, written by vcg-simulator/export_web.py. No browser or three.js needed.
//
// Heart vector d(t) = Σ a_k exp(−(t − c_k)² / 2w_k²) with 2 P, 4 QRS and 2 T kernels; centres and widths are
// fractions of their wave's window (P onset→P end, QRS onset→QRS end, QRS end→T end). Leads = M·d_ventricular
// + MP·d_atrial. Vector axes: X to the child's left, Y downward, Z backward (inverse Dower convention).

export const LEADS=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
const WINDOW=[-400,800];   // ms around each QRS onset in which a beat contributes, as in simulate.py

export function createHeartbeat(data){
  const kinds=data.waves;   // ['P','P','QRS','QRS','QRS','QRS','T','T']
  function child(age,sex){
    if(!Number.isInteger(age)||age<1||age>14)throw new RangeError('Age must be a whole number from 1 to 14.');
    const c=data.children[sex]?.[age-1];if(!c)throw new RangeError('Sex must be female or male.');return c;
  }
  // A beat at the given heart rate. QT follows the child's age-band QT–RR exponent, as in simulate.py.
  function model(age,sex,hr){
    const c=child(age,sex),cal=data.calibration_ms;
    hr=hr??c.heart_rate_bpm;if(!(hr>=30&&hr<=260))throw new RangeError('Heart rate out of range.');
    const rr=60000/hr,qt=c.qt_ms*Math.pow(c.heart_rate_bpm/hr,c.qt_rr_exponent);
    const iv={pr:c.pr_ms-cal.pr,p:c.p_ms-cal.p,qrs:c.qrs_ms-cal.qrs,qt:qt-cal.qt};
    const win={P:[-iv.pr,-iv.pr+iv.p],QRS:[0,iv.qrs],T:[iv.qrs,iv.qt]};
    const centre=[],width=[];
    kinds.forEach((k,i)=>{const [a,b]=win[k],d=b-a;centre.push(a+c.shape[2*i]*d);width.push(c.shape[2*i+1]*d);});
    const amp=c.amp,M=c.M,MP=c.MP;
    // Heart vector of one beat, t in ms after its QRS onset: atrial (P kernels) and ventricular parts.
    function beat(t,outA,outV){
      for(let k=0;k<kinds.length;k++){
        const g=Math.exp(-((t-centre[k])**2)/(2*width[k]*width[k])),a=amp[k],o=k<2?outA:outV;
        o[0]+=a[0]*g;o[1]+=a[1]*g;o[2]+=a[2]*g;
      }
    }
    // Summed vectors at time T (ms), with QRS onsets at t0 + n·RR (n ≥ firstBeat).
    function vectorAt(T,t0=0,firstBeat=-Infinity){
      const a=[0,0,0],v=[0,0,0],n0=Math.max(firstBeat,Math.ceil((T-t0-WINDOW[1])/rr)),n1=Math.floor((T-t0-WINDOW[0])/rr);
      for(let n=n0;n<=n1;n++){const t=T-(t0+n*rr);if(t>WINDOW[0]&&t<WINDOW[1])beat(t,a,v);}
      return {a,v};
    }
    function leadsAt(T,t0=0,firstBeat=-Infinity,out=new Array(12)){
      const {a,v}=vectorAt(T,t0,firstBeat);
      for(let i=0;i<12;i++)out[i]=M[i][0]*v[0]+M[i][1]*v[1]+M[i][2]*v[2]+MP[i][0]*a[0]+MP[i][1]*a[1]+MP[i][2]*a[2];
      return out;
    }
    // Where in the beat a time falls: ms since the latest QRS onset, from −PR (P onset) to RR − PR.
    function beatTime(T,t0=0){let e=((T-t0)%rr+rr)%rr;if(e>=rr-c.pr_ms)e-=rr;return e;}
    return {age,sex,hr,rr,qt,pr:c.pr_ms,p:c.p_ms,qrs:c.qrs_ms,restingHr:c.heart_rate_bpm,qtRestingMs:c.qt_ms,M,MP,iv,
      vectorAt,leadsAt,beatTime,
      // the ventricular lead vector of lead i (how that lead "looks" at the heart vector)
      leadVector:i=>M[i].slice()};
  }
  return {model,child,leads:LEADS};
}
