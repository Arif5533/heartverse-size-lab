// Checks for dist/qt.js and dist/data/qt-profiles.json.   node checks/qt.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createModel,bazett,fridericia,qtcAdaptive,LIMIT_MS} from '../dist/qt.js';

const data=JSON.parse(readFileSync(new URL('../dist/data/qt-profiles.json',import.meta.url)));
const m=createModel(data),near=(a,b,tol)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b} (±${tol})`);

// Formulas at 60 bpm leave QT unchanged; known values otherwise.
near(bazett(400,60),400,1e-9);near(fridericia(400,60),400,1e-9);
near(bazett(300,120),300/Math.sqrt(.5),1e-9);near(fridericia(300,120),300/Math.cbrt(.5),1e-9);
// Haq 2025 Equation 2 at the age-mean heart rate returns QT itself.
const weeks=8*365.25/7,hrMean=-10.8*Math.log(weeks)+154;near(qtcAdaptive(330,hrMean,8),330,1e-9);

for(const sex of ['female','male'])for(let age=1;age<=14;age++){
  const rest=m.restingRate(age,sex),[lo,hi]=m.rateRange(age,sex);
  assert.ok(lo<rest&&rest<hi,`resting rate inside p2–p98 at ${age} ${sex}`);
  // At the QT reference rate the model returns the profile QT exactly.
  const ref=data[sex].qt_reference_heart_rate_bpm[age-1];
  near(m.trueQT(age,sex,ref),data[sex].qt_ms.p50[age-1],1e-9);
  // QT shortens as heart rate rises, and upper-normal QT is longer than typical.
  assert.ok(m.trueQT(age,sex,150)<m.trueQT(age,sex,90));
  assert.ok(m.trueQT(age,sex,rest,'p90')>m.trueQT(age,sex,rest,'p50'));
  const r=m.readings(age,sex,rest);
  for(const k of ['bazett','fridericia','adaptive'])near(r.drift[k],0,1e-9);
  assert.ok(r.bazett<LIMIT_MS&&r.fridericia<LIMIT_MS,`typical child below ${LIMIT_MS} ms at rest (${age} ${sex})`);
  assert.ok(m.readings(age,sex,rest,'p90').bazett<LIMIT_MS,`upper-normal child below ${LIMIT_MS} ms by Bazett at rest (${age} ${sex})`);
  const p=m.ecgParams(age,sex,rest);
  assert.ok(p.qt>200&&p.qt<450&&p.pr.median>90&&p.qrsDur.median>40&&p.pII>0&&p.tII>0);
}
// The age-band rule: Bazett's exponent (0.5) is close to the 1–2 y exponent and too large for older children,
// so Bazett drifts upward with heart rate at 8 years and Fridericia (1/3) drifts less.
const eight=m.readings(8,'female',130);
assert.ok(eight.drift.bazett>10&&Math.abs(eight.drift.fridericia)<eight.drift.bazett);
assert.throws(()=>m.trueQT(0,'female',100),RangeError);assert.throws(()=>m.trueQT(8,'x',100),RangeError);assert.throws(()=>m.trueQT(8,'male',5),RangeError);
// Published numbers carried into the page.
const t=data.real_children.sinus_tachycardia;
assert.equal(t.n,1369);near(t.bazett_above_440.pct,16.7,.05);near(t.fridericia_above_440.pct,1.0,.05);
console.log('qt checks passed',{eightYearOldAt130:{qt:Math.round(eight.qt),bazett:Math.round(eight.bazett),fridericia:Math.round(eight.fridericia),driftBazett:Math.round(eight.drift.bazett),driftFridericia:Math.round(eight.drift.fridericia),driftAdaptive:Math.round(eight.drift.adaptive)}});
for(const [age,hr,level] of [[2,160,'p90'],[5,140,'p90'],[8,130,'p90'],[12,120,'p90'],[12,140,'p50']]){const r=m.readings(age,'female',hr,level);console.log(`age ${age} hr ${hr} ${level}: QT ${Math.round(r.qt)} B ${Math.round(r.bazett)} F ${Math.round(r.fridericia)} Ad ${Math.round(r.adaptive)} drift B ${Math.round(r.drift.bazett)} F ${Math.round(r.drift.fridericia)} Ad ${Math.round(r.drift.adaptive)} tMeetsP ${r.tMeetsNextP}`);}
