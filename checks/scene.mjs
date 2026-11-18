// Checks the child figure, fitted organs and limb vessels for every age, without a browser.
//   node checks/scene.mjs
// For ages 1–14: no invalid coordinates; the heart sits inside the chest; organs and limb vessels stay
// inside the skin (a point counts as outside when it lies beyond the nearest skin vertex along that
// vertex's outward normal by more than a small tolerance).
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';

const DIST = new URL('../dist/', import.meta.url);
registerHooks({ resolve(spec, ctx, next) {
  if (spec === 'three') return next(new URL('vendor/three.module.js', DIST).href, ctx);
  return next(spec, ctx);
} });
globalThis.fetch = async url => {
  const data = await readFile(new URL(String(url).replace(/^\.\//, ''), DIST));
  return { ok: true, json: async () => JSON.parse(data.toString()), arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
};
const THREE = await import('three');
const { createAvatar } = await import(new URL('avatar.js', DIST));
const { createOrgans } = await import(new URL('organs.js', DIST));
const { createLimbVessels } = await import(new URL('limbs.js', DIST));

const avatar = await createAvatar(), organs = await createOrgans(), limbs = createLimbVessels();
const skinMesh = avatar.group.children[1];

function skinIndex() {
  const g = skinMesh.geometry, idx = g.index.array, { start, count } = g.drawRange, p = g.attributes.position.array, n = g.attributes.normal.array;
  const used = new Set(); for (let i = start; i < start + count; i++) used.add(idx[i]);
  const cell = 1.5, grid = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (const v of used) { const k = key(p[3 * v], p[3 * v + 1], p[3 * v + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(v); }
  return { outside(x, y, z, tol) {
    let best = -1, bd = Infinity;
    for (let r = 1; r <= 9 && best < 0; r++) {   // up to ~13 cm: points deep in a teenager's trunk are far from any skin vertex
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) for (const v of grid.get(`${cx + i},${cy + j},${cz + k}`) || []) {
        const d = (p[3 * v] - x) ** 2 + (p[3 * v + 1] - y) ** 2 + (p[3 * v + 2] - z) ** 2; if (d < bd) { bd = d; best = v; } }
    }
    if (best < 0) return true;   // nothing within ~13 cm: far outside
    return (x - p[3 * best]) * n[3 * best] + (y - p[3 * best + 1]) * n[3 * best + 1] + (z - p[3 * best + 2]) * n[3 * best + 2] > tol;
  } };
}
function points(mesh) {
  const a = mesh.geometry.attributes.position, m = mesh.matrixWorld, v = new THREE.Vector3(), out = [];
  mesh.updateMatrixWorld(true);
  for (let i = 0; i < a.count; i += 3) { v.fromBufferAttribute(a, i).applyMatrix4(m); out.push(v.x, v.y, v.z); }
  return out;
}
const report = [], failures = [];
const nearestJoint = (J, x, y, z) => { let best = '', d = Infinity; for (const k in J) { const v = J[k], e = (v.x - x) ** 2 + (v.y - y) ** 2 + (v.z - z) ** 2; if (e < d) { d = e; best = k; } } return best; };
for (let age = 1; age <= 14; age++) {
  const plan = avatar.update(age), fitted = organs.fit(plan); avatar.setHeart(fitted.heart); limbs.build(plan, fitted.trunk);
  const skin = skinIndex(), h = fitted.heart, tol = .35 * plan.H / 128, row = { age };
  assert.ok(Math.abs(h.x) < plan.chestHalf && h.z < plan.front && h.z > plan.back, `heart inside the chest at ${age}`);
  for (const [name, meshes, limit] of [['organs', organs.group.children.filter(m => m.visible), .01], ['limb vessels', limbs.group.children, .01]]) {
    let n = 0, out = 0; const where = {};
    for (const mesh of meshes) { const p = points(mesh); for (let i = 0; i < p.length; i += 3) {
      assert.ok(Number.isFinite(p[i] + p[i + 1] + p[i + 2]), `${name} coordinates at ${age}`); n++;
      if (skin.outside(p[i], p[i + 1], p[i + 2], tol)) { out++; const j = nearestJoint(plan.joints, p[i], p[i + 1], p[i + 2]); where[j] = (where[j] || 0) + 1; } } }
    row[name] = `${(100 * out / n).toFixed(2)}%`;
    if (out / n >= limit) failures.push(`${name} at age ${age}: ${(100 * out / n).toFixed(2)}% outside (${Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  }
  report.push(row);
}
console.table(report);
assert.deepEqual(failures, [], failures.join('\n'));
console.log('scene checks passed');
