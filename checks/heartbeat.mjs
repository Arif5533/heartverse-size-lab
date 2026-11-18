// Checks dist/ecg12.js against the Python simulator: the same typical child rendered by
// vcg-simulator/export_web.py (fixtures/heartbeat_fixture.json, 2 s strips, 500 Hz).   node checks/heartbeat.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeartbeat,LEADS} from '../dist/ecg12.js';
const data=JSON.parse(readFileSync(new URL('../dist/data/child-heart.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('./fixtures/heartbeat_fixture.json',import.meta.url)));
const hb=createHeartbeat(data);
for(const f of fixture){
  const m=hb.model(f.age,f.sex,f.hr),n=f.mv[0].length;let worst=0;
  for(let s=0;s<n;s++){const L=m.leadsAt(s*2,f.first_qrs_onset_ms,0);for(let i=0;i<12;i++)worst=Math.max(worst,Math.abs(L[i]-f.mv[i][s]));}
  assert.ok(worst<.002,`${f.sex} ${f.age} y at ${Math.round(f.hr)} bpm: largest difference ${worst.toFixed(4)} mV`);
  console.log(`${f.sex} ${f.age} y, ${Math.round(f.hr)} bpm: matches the Python simulator within ${worst.toFixed(5)} mV over ${n} samples x 12 leads`);
}
assert.equal(LEADS.length,12);assert.throws(()=>hb.model(0,'female'),RangeError);assert.throws(()=>hb.model(5,'x'),RangeError);
// timing behaves: faster heart -> shorter QT; beatTime runs from -PR to RR-PR
const slow=hb.model(8,'female',70),fast=hb.model(8,'female',140);assert.ok(fast.qt<slow.qt);
for(const T of [0,150,700,1300])assert.ok(slow.beatTime(T)>=-slow.pr-1e-9&&slow.beatTime(T)<slow.rr-slow.pr);
console.log('heartbeat checks passed');
