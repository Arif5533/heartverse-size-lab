// QT arithmetic for the child heart lab. Pure functions: no DOM, no three.js.
//
// The "true" QT is the simulator's own value. It starts from the Heartverse
// Stage 1 profile QT for the child's age and sex (observed at the cohort's
// usual heart rate) and moves along the Stage 1 age-band QT–RR relation to the
// selected heart rate: QT = QTref × (HRref / HR)^b.
// The correction formulas below are then applied to that known QT.

export const BANDS=[[1,3,'1-3'],[3,6,'3-6'],[6,10,'6-10'],[10,15,'10-15']];
export const LIMIT_MS=440;           // common borderline line for QTc
export const DRIFT_STABLE_MS=8;      // |drift| below this is shown as stable
export const WEEKS_PER_YEAR=365.25/7;

export const bazett=(qt,hr)=>qt/Math.sqrt(60/hr);
export const fridericia=(qt,hr)=>qt/Math.cbrt(60/hr);
// Haq et al., Circ Arrhythm Electrophysiol 2025;18:e013237, Equation 2.
// x is age in weeks. The value is normalised to the mean resting heart rate
// for that age, not to 60 bpm, so it is not on the 440 ms scale.
export function qtcAdaptive(qt,hr,ageYears){
  const x=ageYears*WEEKS_PER_YEAR;
  return qt+.75*Math.pow(x,.12)*(hr+10.8*Math.log(x)-154);
}

export function createModel(data){
  const check=(age,sex)=>{
    if(!Number.isInteger(age)||age<1||age>14)throw new RangeError('Age must be a whole number from 1 to 14 years.');
    if(sex!=='female'&&sex!=='male')throw new RangeError('Sex must be female or male.');
  };
  const pick=(age,sex,key,sub)=>{check(age,sex);const row=data[sex][key];return (sub?row[sub]:row)[age-1];};
  const band=age=>BANDS.find(([a,b])=>a<=age&&age<b)[2];
  const exponent=age=>data.qt_rr[band(age)].exponent;
  const restingRate=(age,sex)=>Math.round(pick(age,sex,'heart_rate_bpm','p50'));
  const rateRange=(age,sex)=>[pick(age,sex,'heart_rate_bpm','p2'),pick(age,sex,'heart_rate_bpm','p98')];
  // level: 'p50' typical QT, 'p90' upper-normal QT for the age.
  function trueQT(age,sex,hr,level='p50'){
    if(!(hr>=30&&hr<=260))throw new RangeError('Heart rate out of range.');
    return pick(age,sex,'qt_ms',level)*Math.pow(pick(age,sex,'qt_reference_heart_rate_bpm')/hr,exponent(age));
  }
  const all=(age,sex,hr,level)=>{const qt=trueQT(age,sex,hr,level);return {qt,bazett:bazett(qt,hr),fridericia:fridericia(qt,hr),adaptive:qtcAdaptive(qt,hr,age)};};
  // Every formula at the selected rate, plus its drift from the same child at the resting rate for the age.
  function readings(age,sex,hr,level='p50'){
    const now=all(age,sex,hr,level),rest=all(age,sex,restingRate(age,sex),level),rr=60000/hr,pr=pick(age,sex,'pr_ms');
    const drift={};for(const k of ['bazett','fridericia','adaptive'])drift[k]=now[k]-rest[k];
    return {...now,rest,drift,rr,restingRate:restingRate(age,sex),exponent:exponent(age),band:band(age),
      // The T wave reaches the next P wave when QT is longer than RR − PR.
      tMeetsNextP:now.qt>rr-pr};
  }
  // Parameters for ecg.js buildECG(). Lead II R amplitude is not profiled in Stage 1 and is illustrative.
  function ecgParams(age,sex,hr,level='p50'){
    const qt=trueQT(age,sex,hr,level),m=k=>({median:pick(age,sex,k)});
    return {rr:60/hr,qt,pr:m('pr_ms'),pDur:m('p_ms'),qrsDur:m('qrs_ms'),
      pAxis:pick(age,sex,'p_axis_deg'),qrsAxis:pick(age,sex,'qrs_axis_deg'),tAxis:pick(age,sex,'t_axis_deg'),
      pII:pick(age,sex,'p_amp_ii_mv'),tII:pick(age,sex,'t_ii_mv'),rII:1.3};
  }
  return {data,band,exponent,restingRate,rateRange,trueQT,readings,ecgParams};
}
