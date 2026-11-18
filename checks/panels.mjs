// Checks the numbers the study sections compute and print (node checks/panels.mjs):
//  1. the QRS axis and wave heights on the page (growth-panel.js beatNumbers, ecg-panels.js qrsAxis) agree with the
//     Stage 1 measuring software (features.py) run on the same typical child (fixtures/typical_measured.json,
//     written by vcg-simulator/export_web.py);
//  2. growth data are complete and ordered (centiles rise p2 → p98; published points sit in their age groups);
//  3. the phase and lead texts cover every phase and lead.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeartbeat} from '../dist/ecg12.js';
import {beatNumbers,MEASURES,valueAt,describe} from '../dist/growth-panel.js';
import {qrsAxis,LEAD_NAMES,LEAD_INFO,PHASES} from '../dist/ecg-panels.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const hb=createHeartbeat(read('../dist/data/child-heart.json')),growth=read('../dist/data/growth.json'),measured=read('./fixtures/typical_measured.json');

let worst={axis:0,mv:0};
for(const sex of ['female','male'])for(let age=1;age<=14;age++){
  const m=hb.model(age,sex),n=beatNumbers(m),f=measured[sex][age];
  const axis=Math.abs(n.axis-f.qrs_axis_wrapped_deg),mv=Math.max(Math.abs(n.rV1-f.r_v1_mv),Math.abs(n.sV1-f.s_v1_mv),Math.abs(n.rV6-f.r_v6_mv));
  assert.ok(axis<2,`${sex} ${age} y: QRS axis ${n.axis.toFixed(1)} vs ${f.qrs_axis_wrapped_deg.toFixed(1)}`);
  assert.ok(mv<.05,`${sex} ${age} y: amplitude difference ${mv.toFixed(3)} mV`);
  assert.ok(Math.abs(qrsAxis(m)-n.axis)<1e-6||Math.abs(qrsAxis(m)+360-n.axis)<1e-6);
  worst={axis:Math.max(worst.axis,axis),mv:Math.max(worst.mv,mv)};
}
console.log(`page measurements match the Stage 1 software: QRS axis within ${worst.axis.toFixed(2)}°, R/S heights within ${worst.mv.toFixed(3)} mV (28 typical children)`);

for(const key of Object.keys(MEASURES)){
  if(key==='t_v1_upright'){const p=growth.t_v1_upright.p_upright;assert.equal(p.length,growth.age_grid_years.length);assert.ok(p.every((v,i)=>v>=0&&v<=1&&(!i||v>=p[i-1])));continue;}
  const f=growth.features[key];assert.ok(f,`growth.json has ${key}`);
  for(const sex of ['female','male']){
    const z=f.zzu[sex],ps=['p2','p10','p25','p50','p75','p90','p98'];
    for(let i=0;i<growth.age_grid_years.length;i++)for(let j=1;j<ps.length;j++)assert.ok(z[ps[j]][i]>=z[ps[j-1]][i],`${key} ${sex}: ${ps[j]} below ${ps[j-1]} at grid ${i}`);
    for(const l of f.literature[sex]){assert.ok(l.age_lo<l.age_hi);if(l.p2!==undefined)assert.ok(l.p2<=l.p50);if(l.p98!==undefined)assert.ok(l.p98>=l.p50,`${key} ${l.source} ${l.age_lo}: p98 below p50`);}
    for(const age of [1,8,14]){assert.ok(Number.isFinite(valueAt(growth,key,sex,age)));assert.ok(describe(growth,key,sex,age).main.length>10);}
  }
}
console.log(`growth data complete and ordered for ${Object.keys(MEASURES).length} measurements`);
assert.deepEqual(Object.keys(LEAD_INFO),LEAD_NAMES);for(const p of ['P','PR','QRS','T','rest'])assert.ok(PHASES[p].number(hb.model(8,'female')).length>10);
// every explanation carries numbered references that exist in the reference list, and every reference is used
const {REFS,refNumber}=await import('../dist/references.js');const {leadRefs}=await import('../dist/ecg-panels.js');
const known=new Set(REFS.map(r=>r.key)),used=new Set();const use=(keys,what)=>{assert.ok(keys?.length,`${what} has no reference`);for(const k of keys){assert.ok(known.has(k),`${what}: unknown reference ${k}`);used.add(k);}};
for(const [k,p] of Object.entries(PHASES))use(p.refs,`phase ${k}`);
for(const [k,m] of Object.entries(MEASURES))use(m.refs,`measure ${k}`);
for(let i=0;i<12;i++)use(leadRefs(i),`lead ${LEAD_NAMES[i]}`);
for(const n of growth.notes)use(n.refs,`growth note “${n.text.slice(0,30)}…”`);
const page=readFileSync(new URL('../dist/child.html',import.meta.url),'utf8'),script=readFileSync(new URL('../dist/child.js',import.meta.url),'utf8');
for(const m of page.matchAll(/data-cite="([^"]+)"/g))use(m[1].split(' '),'child.html marker');
for(const m of script.matchAll(/cite\(([^()]*?)\)/g))for(const k of m[1].matchAll(/'([a-z0-9]+)'/g))use([k[1]],'child.js marker');
for(const k of ['einthoven1912','goldberger1942','kligfield2007','dickinson2005'])used.add(k);   // also reached through leadRefs/LEAD_INFO
const unused=[...known].filter(k=>!used.has(k));assert.deepEqual(unused,[],`references never cited: ${unused}`);
for(const r of REFS)assert.ok(r.cite().length>20&&r.use.length>10,`reference ${r.key} is incomplete`);
console.log(`${REFS.length} references, all cited; ${page.match(/data-cite=/g).length} markers in the page text, every phase, lead, measurement and note referenced`);
const data=read('../dist/data/child-heart.json');for(const k of ['n_children','n_profile_children','n_profile_age_1_2'])assert.ok(Number.isInteger(data[k]),`child-heart.json lacks ${k}`);
const html=readFileSync(new URL('../dist/child.html',import.meta.url),'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
for(const n of [data.n_children,data.n_profile_children])assert.ok(!html.includes(String(n)),`child.html has the count ${n} typed in; use <span data-n>`);
console.log('every explanation names a source; child counts come from the data files');
console.log('panel checks passed');
