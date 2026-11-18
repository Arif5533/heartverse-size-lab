"""Generate the child body for dist/child.html with MPFB (the MakeHuman add-on for Blender).

Three shapes share one mesh: MakeHuman's baby (1 year), child (10 years) and a 14-year-old. MakeHuman blends
its age targets linearly between baby and child and between child and young adult, so the page interpolates
any age from 1 to 14 from these shapes.

Each shape keeps the body plus MakeHuman's eye, eyelash and tights helper meshes (the tights are cut down to
shorts, hips to mid-thigh), and is smoothed with one level of subdivision. Per-vertex data for the page: part (skin, left eye,
right eye, eyelashes, shorts) and weights for the scalp (hair), lips and nails. Scalp comes from MPFB's scalp
face list; lips and nails from MPFB's skin mask textures, sampled at each vertex's texture coordinates.

Settings: neutral gender (0.5), average muscle, weight, proportions and height, equal mix of the three
MakeHuman ethnicity targets, smallest cup size.

  /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/generate_body.py

Writes dist/models/child-body/body.bin and body.json. Layout of body.bin (little-endian):
  uint32 triangle indices, sorted by part;
  per shape: uint16 x, y, z per vertex, quantised between json.bounds.min and json.bounds.max (metres, y up);
  uint8 part, scalp, lips and nails per vertex (four bytes per vertex).
"""
import bpy, bmesh, gzip, json, datetime
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'dist/models/child-body'
SHAPES = [('baby', 1), ('child', 10), ('teen', 14)]
def age_value(years):  # MakeHuman age scale: 0 = baby (1 y), 0.1875 = child (10 y), 0.5 = young adult (25 y)
    return (years - 1) / 9 * 0.1875 if years <= 10 else 0.1875 + (years - 10) / 15 * 0.3125

bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
import bl_ext.user_default.mpfb as mpfb
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
DATA = Path(mpfb.__file__).parent / 'data'
GROUPS = json.loads((DATA / 'mesh_metadata/basemesh_vertex_groups.json').read_text())
SCALP_FACES = [int(f) for f in json.loads(gzip.decompress((DATA / 'uv_layers/scalp_solid.json.gz').read_bytes()))]
PARTS = {'skin': 0, 'eye_left': 1, 'eye_right': 2, 'lashes': 3, 'shorts': 4}
KEEP = {'body': 'skin', 'helper-l-eye': 'eye_left', 'helper-r-eye': 'eye_right', 'helper-tights': 'shorts',
        'helper-l-eyelashes-1': 'lashes', 'helper-l-eyelashes-2': 'lashes', 'helper-r-eyelashes-1': 'lashes', 'helper-r-eyelashes-2': 'lashes'}

def mask(name):
    img = bpy.data.images.load(str(DATA / 'textures' / name))
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[:, :, 0], w, h
MASKS = {'lips': [mask('mpfb_lips.jpg')], 'nails': [mask('mpfb_fingernails.jpg'), mask('mpfb_toenails.jpg')]}

SHORTS_CUT = None
JOINTS = {}
def shape(years):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
    macro = TargetService.get_default_macro_info_dict()
    macro.update({'gender': 0.5, 'age': age_value(years), 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5, 'cupsize': 0.0, 'firmness': 0.5})
    human = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=False, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(human.evaluated_get(depsgraph))   # shape keys applied, original vertex and face order
    obj = bpy.data.objects.new('child', mesh); bpy.context.scene.collection.objects.link(obj)
    part_of = {}
    for group, part in KEEP.items():
        for a, b in GROUPS[group]:
            for i in range(a, b + 1): part_of[i] = part
    z = np.array([v.co.z for v in mesh.vertices]); x = np.array([v.co.x for v in mesh.vertices]); H = z[:13380].max() - z[:13380].min()
    # MakeHuman's joint markers (small cubes in the base mesh): centre of each, y up, for drawing limb vessels on the page.
    co_all = np.array([v.co[:] for v in mesh.vertices])
    joints = {}
    for g, ranges in GROUPS.items():
        if g.startswith('joint-') and ('-l-' in g or '-r-' in g or g in ('joint-pelvis', 'joint-neck')) and 'eye' not in g and 'lid' not in g:
            idx = np.concatenate([np.arange(a, b + 1) for a, b in ranges]); c = co_all[idx].mean(0)
            joints[g[6:]] = [round(float(c[0]), 5), round(float(c[2]), 5), round(float(-c[1]), 5)]
    JOINTS[years] = joints
    midline = [i for i in range(13380) if abs(x[i]) < H * .006 and z[i] > z.min() + H * .2]
    crotch = min(z[i] for i in midline)
    global SHORTS_CUT   # tights -> shorts ending a little above mid-thigh; the cut is chosen on the first shape and reused so all ages share one mesh
    # The tights helper covers legs, trunk and arms; keep hips to mid-thigh only, away from the hands.
    if SHORTS_CUT is None: SHORTS_CUT = {i for i, p in part_of.items() if p == 'shorts' and (z[i] < crotch - H * .085 or z[i] > crotch + H * .115 or abs(x[i]) > H * .16)}
    for i in SHORTS_CUT: del part_of[i]
    vg = {p: obj.vertex_groups.new(name=p) for p in PARTS}
    for i, p in part_of.items(): vg[p].add([i], 1.0, 'REPLACE')
    scalp = obj.vertex_groups.new(name='scalp')
    scalp.add(sorted({v for f in SCALP_FACES for v in mesh.polygons[f].vertices}), 1.0, 'REPLACE')
    bm = bmesh.new(); bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in part_of], context='VERTS')
    bm.to_mesh(mesh); bm.free()
    obj.modifiers.new('smooth', 'SUBSURF').levels = 1
    depsgraph = bpy.context.evaluated_depsgraph_get()
    sub = obj.evaluated_get(depsgraph).to_mesh()
    n = len(sub.vertices)
    co = np.empty(n * 3, dtype=np.float64); sub.vertices.foreach_get('co', co); co = co.reshape(n, 3)
    names = {g.index: g.name for g in obj.vertex_groups}
    part = np.zeros(n, dtype=np.uint8); hair = np.zeros(n)
    for v in sub.vertices:
        best = (0., 0)
        for g in v.groups:
            name = names[g.group]
            if name == 'scalp': hair[v.index] = g.weight
            elif name in PARTS and g.weight > best[0]: best = (g.weight, PARTS[name])   # MakeHuman's own groups are ignored
        part[v.index] = best[1]
    sub.calc_loop_triangles()
    tri = np.array([t.vertices[:] for t in sub.loop_triangles], dtype=np.uint32)
    polys = [tuple(p.vertices) for p in sub.polygons]
    # Lips and nails from MPFB's skin masks at each vertex's texture coordinates (largest value over its corners).
    loops = np.empty(len(sub.loops), dtype=np.int64); sub.loops.foreach_get('vertex_index', loops)
    uv = np.empty(len(sub.loops) * 2); sub.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) % 1.0
    weights = {}
    for key, images in MASKS.items():
        w = np.zeros(n)
        for img, iw, ih in images:
            s = img[np.clip((uv[:, 1] * ih).astype(int), 0, ih - 1), np.clip((uv[:, 0] * iw).astype(int), 0, iw - 1)]
            np.maximum.at(w, loops, s)
        weights[key] = np.where(part == 0, w, 0)
    hair = np.where(part == 0, hair, 0)
    positions = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)        # Blender z-up -> y-up
    return positions, tri, polys, part, hair, weights

result = {}
for name, years in SHAPES:
    result[name] = shape(years)
    p = result[name][0]
    print(f'{name}: {len(p)} vertices, {len(result[name][1])} triangles, height {p[:, 1].max() - p[:, 1].min():.3f} m', flush=True)
base = result['baby']
for name in ('child', 'teen'):
    assert result[name][2] == base[2] and (result[name][3] == base[3]).all(), f'mesh differs between ages ({name})'

positions, tri, _, part, hair, weights = base
order = np.argsort(part[tri[:, 0]], kind='stable'); tri = tri[order]
tri_part = part[tri[:, 0]]
ranges = {p: [int(np.searchsorted(tri_part, k)) * 3, int((tri_part == k).sum()) * 3] for p, k in PARTS.items()}
lo = np.min([result[s][0].min(0) for s, _ in SHAPES], 0); hi = np.max([result[s][0].max(0) for s, _ in SHAPES], 0)
blob = tri.astype('<u4').tobytes(); offsets = {}
for name, _ in SHAPES:
    offsets[name] = len(blob)
    q = np.round((result[name][0] - lo) / (hi - lo) * 65535).astype('<u2'); blob += q.tobytes()
    blob += b'\0' * (-len(blob) % 4)
attr_offset = len(blob)
to8 = lambda a: np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
blob += np.stack([part, to8(hair), to8(weights['lips']), to8(weights['nails'])], 1).tobytes()
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'body.bin').write_bytes(blob)
meta = {'format': 2, 'generated': datetime.date.today().isoformat(), 'vertices': int(len(positions)), 'index_count': int(tri.size),
        'parts': PARTS, 'index_ranges': ranges, 'bounds': {'min': lo.round(6).tolist(), 'max': hi.round(6).tolist()},
        'position_offsets': offsets, 'attribute_offset': attr_offset,
        'joints': {name: JOINTS[years] for name, years in SHAPES}, 'attributes': ['part', 'scalp', 'lips', 'nails'],
        'shape_ages_years': dict(SHAPES), 'units': 'metres, y up, feet at y = 0, facing +z',
        'source': f'MakeHuman base mesh, macro targets, eye, eyelash and tights helpers and skin masks via MPFB 2.0.18 in Blender {bpy.app.version_string}; one level of subdivision',
        'settings': 'gender 0.5, muscle 0.5, weight 0.5, proportions 0.5, height 0.5, cupsize 0, equal ethnicity mix',
        'licence': 'MakeHuman core assets are CC0 (https://static.makehumancommunity.org/about/license.html).'}
(OUT / 'body.json').write_text(json.dumps(meta, indent=1))
print('parts (index counts):', {k: v[1] for k, v in ranges.items()})
print('lips vertices > 0.5:', int((weights['lips'] > .5).sum()), ' nails > 0.5:', int((weights['nails'] > .5).sum()), ' scalp > 0.5:', int((hair > .5).sum()))
print('wrote', OUT / 'body.bin', len(blob), 'bytes', flush=True)
