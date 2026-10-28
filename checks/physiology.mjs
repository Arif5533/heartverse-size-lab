// Checks the heart-function lookups: every published row resolves, centiles
// are ordered, cubic scaling preserves the height-mode volume, and values
// that are not published (other rows, interpolated heights) are rejected.
import assert from 'node:assert/strict';
import { reference, physiologyReference, lookupHeight, physiologyAt } from '../dist/reference.js';

const ordered=(c,label)=>assert.ok(c.p5<=c.p50&&c.p50<=c.p95,`${label}: centiles out of order`);
let count=0;
for(const sex of ['female','male']){
  for(const bsa of reference.bsa){
    const p=physiologyAt('children',sex,{bsa});count++;
    for(const key of ['lvedv','lvesv','lvsv','lvm'])ordered(p[key],`${sex} ${bsa} m² ${key}`);
    assert.ok(p.lvesv.p50<p.lvedv.p50&&p.lvsv.p50<p.lvedv.p50,`${sex} ${bsa} m²: ESV and SV must be below EDV`);
    assert.equal(p.thickness===null,bsa<0.8,`${sex} ${bsa} m²: wall thickness exists only from 0.8 m²`);
    if(p.thickness)ordered(p.thickness,`${sex} ${bsa} m² thickness`);
  }
  for(const height of physiologyReference.height[sex].height){
    const r=lookupHeight(height,sex),p=physiologyAt('children',sex,{height});count++;
    assert.ok(Math.abs(r.baseline*r.scale**3-r.volume)<1e-9,'Cubic scaling must preserve the height-mode volume');
    assert.equal(p.lvedv.p50,r.volume);
    for(const key of ['lvedv','lvesv','lvsv','lvm'])ordered(p[key],`${sex} ${height} cm ${key}`);
    assert.ok(p.gls&&p.gls.p5<p.gls.p50&&p.gls.p50<p.gls.p95,`${height} cm: strain centiles`);
    assert.equal(p.lvef,undefined,'No EF is published by height');
  }
}
assert.equal(lookupHeight(physiologyReference.height.baseline,'female').scale,1);
assert.equal(physiologyAt('children','female',{bsa:1}).lvsv.p50,44.1);
assert.equal(physiologyAt('children','male',{height:140}).lvm.p50,54);
assert.deepEqual(physiologyAt('adult-men','male',{}).lvsv,[91,19,53,128]);
for(const [height,sex] of [[110,'female'],[190,'male'],[135,'male'],[140,'unknown'],[NaN,'female']])assert.throws(()=>lookupHeight(height,sex),RangeError);
for(const setting of [{bsa:.65},{bsa:2},{height:115}])assert.throws(()=>physiologyAt('children','female',setting),RangeError);
console.log(`PASS: ${count} child settings (28 BSA, 15 height) give ordered centiles, ESV/SV below EDV, wall thickness only from 0.8 m², strain on every height row and volume-preserving scaling; adult values and invalid rows checked.`);
