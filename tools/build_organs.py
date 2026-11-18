"""Package Human Reference Atlas organs and vessels for dist/child.html.

Source: HuBMAP Human Reference Atlas 3D reference organs (Visible Human Male), CC BY 4.0
(https://humanatlas.io/3d-reference-library; files from cdn.humanatlas.io/hra-releases). Download the GLB files
listed in SOURCES into one folder, then:

  /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_organs.py -- <folder>

Each organ is reduced (outer surfaces only, then decimated) and grouped for display. Coordinates stay in the
atlas body frame, converted to y up with the front of the body at +z and the body's left at +x (metres).
dist/child.js fits them into the child at each age using the landmarks written to organs.json.

Writes dist/models/organs/organs.bin (per group: uint16 triangle indices, then int16 x, y, z quantised between
json.bounds.min and json.bounds.max) and organs.json.
"""
import bpy, sys, json, datetime
from pathlib import Path
import numpy as np

SRC = Path(sys.argv[sys.argv.index('--') + 1])
OUT = Path(__file__).resolve().parent.parent / 'dist/models/organs'
SOURCES = {
    'VH_M_Blood_Vasculature.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Blood_Vasculature.glb',
    'VH_M_Heart.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Heart.glb',
    '3d-vh-m-lung.glb': 'https://cdn.humanatlas.io/hra-releases/v1.4/models/3d-vh-m-lung.glb',
    'VH_M_Liver.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Liver.glb',
    'VH_M_Small_Intestine.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Small_Intestine.glb',
    'SBU_M_Intestine_Large.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/SBU_M_Intestine_Large.glb',
    'VH_M_Kidney_L.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Kidney_L.glb',
    'VH_M_Kidney_R.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Kidney_R.glb',
    'VH_M_Spleen.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Spleen.glb',
    'VH_M_Urinary_Bladder.glb': 'https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Urinary_Bladder.glb',
    '3d-vh-m-pancreas.glb': 'https://cdn.humanatlas.io/hra-releases/v2.0/models/3d-vh-m-pancreas.glb',
    '3d-vh-m-trachea.glb': 'https://cdn.humanatlas.io/hra-releases/v1.4/models/3d-vh-m-trachea.glb',
    '3d-vh-m-main-bronchus.glb': 'https://cdn.humanatlas.io/hra-releases/v1.4/models/3d-vh-m-main-bronchus.glb',
}
EYE = lambda name: any(k in name for k in ('ophthalm', 'opthalm', 'retinal'))   # tiny eye vessels: they scribble over the face at this scale
# group: (file, keep(object name, material name) -> bool, decimate ratio, colour, opacity)
GROUPS = {
    'arteries':  ('VH_M_Blood_Vasculature.glb', lambda o, m: 'vein' not in m and not EYE(o), .32, '#d4202a', 1.0),
    'veins':     ('VH_M_Blood_Vasculature.glb', lambda o, m: 'vein' in m and not EYE(o), .32, '#2f5fd0', 1.0),
    'heart':     ('VH_M_Heart.glb', lambda o, m: 'atrium' in o or 'ventricle' in o, .3, '#c8303a', 1.0),
    'lungs':     ('3d-vh-m-lung.glb', lambda o, m: m.startswith('lung'), 1.0, '#ec9fae', .45),
    'airway':    (('3d-vh-m-trachea.glb', '3d-vh-m-main-bronchus.glb'), lambda o, m: 'cartilage' not in o and 'carina' not in o, .5, '#e8d3c4', .9),
    'liver':     ('VH_M_Liver.glb', lambda o, m: o.startswith('VH_M_liver_capsule'), .45, '#b5523c', .72),
    'spleen':    ('VH_M_Spleen.glb', lambda o, m: True, .6, '#8a3f63', .85),
    'kidneys':   (('VH_M_Kidney_L.glb', 'VH_M_Kidney_R.glb'), lambda o, m: 'capsule' in o, .5, '#9b3540', .95),
    'pancreas':  ('3d-vh-m-pancreas.glb', lambda o, m: True, .12, '#e3b07a', .8),
    'small_intestine': ('VH_M_Small_Intestine.glb', lambda o, m: True, .7, '#e9a08e', .5),
    'large_intestine': ('SBU_M_Intestine_Large.glb', lambda o, m: True, .7, '#d8927a', .5),
    'bladder':   ('VH_M_Urinary_Bladder.glb', lambda o, m: True, .7, '#e6c46a', .75),
}

def load(file):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SRC / file))
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']

def geometry(objects, ratio):
    pos, tri, base, part = [], [], 0, []
    for k, o in enumerate(objects):
        if ratio < 1:
            mod = o.modifiers.new('reduce', 'DECIMATE'); mod.ratio = ratio
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = o.evaluated_get(dg).to_mesh(); mesh.calc_loop_triangles()
        n = len(mesh.vertices)
        co = np.empty(n * 3); mesh.vertices.foreach_get('co', co); co = co.reshape(n, 3)
        co = (np.c_[co, np.ones(n)] @ np.array(o.matrix_world).T)[:, :3]
        t = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int64); mesh.loop_triangles.foreach_get('vertices', t)
        pos.append(co); tri.append(t + base); base += n; part.append(np.full(n, k))
    p = np.vstack(pos); t = np.concatenate(tri); part = np.concatenate(part)
    # Weld vertices shared by neighbouring parts (lung segments, heart chambers) so normals are smooth across seams,
    # then drop vertices no triangle uses.
    key = np.round(p / 4e-4).astype(np.int64)
    _, first, remap = np.unique(key, axis=0, return_index=True, return_inverse=True)
    t = first[remap.ravel()][t]
    used, t = np.unique(t, return_inverse=True); p = p[used]; part = part[used]
    geometry.part = part                                                    # which input object each vertex came from
    return np.stack([p[:, 0], p[:, 2], -p[:, 1]], 1), t   # z-up -> y-up, front +z

def centre(file, test):
    objs = [o for o in load(file) if test(o.name)]
    p, _ = geometry(objs, 1.0)
    return p.mean(0), p.min(0), p.max(0)

groups = {}
for name, (files, keep, ratio, colour, opacity) in GROUPS.items():
    parts = []
    for f in (files if isinstance(files, tuple) else (files,)):
        sel = [o for o in load(f) if keep(o.name, o.data.materials[0].name if o.data.materials else '')]
        parts.append(geometry(sel, ratio))
        if name == 'heart':
            heart_part = geometry.part; heart_names = [o.name for o in sel]
    offs = np.cumsum([0] + [len(q) for q, _ in parts[:-1]])
    p = np.vstack([q for q, _ in parts]); t = np.concatenate([tt + o for (_, tt), o in zip(parts, offs)])
    assert len(p) < 65536, f'{name}: {len(p)} vertices'
    groups[name] = {'positions': p, 'triangles': t.astype(np.uint16), 'colour': colour, 'opacity': opacity}
    print(f'{name}: {len(p)} vertices, {len(t)//3} triangles', flush=True)

# Heart chambers and an illustrative activation order, for showing the electrical wave on the page.
# Order follows the textbook human sequence (Durrer et al., Circulation 1970;41:899-912): atria from the sinus node
# outward; ventricles from the septum and apex outward, with the bases last. Distances on this atlas heart stand in
# for conduction paths, so the order is qualitative; its timing on the page comes from the child's P, PR, QRS and QT.
hp = groups['heart']['positions']
CHAMBER = {'right_cardiac_atrium': 0, 'left_cardiac_atrium': 1, 'heart_right_ventricle': 2, 'heart_left_ventricle': 3}
chamber = np.array([next(v for k, v in CHAMBER.items() if k in heart_names[i]) for i in heart_part], dtype=np.uint8)
atr, ven = chamber <= 1, chamber >= 2
RA, LA, RV, LV = (hp[chamber == c] for c in range(4))
sa = RA[np.argmax(RA[:, 1])]
lvc, rvc = LV.mean(0), RV.mean(0); sm = (lvc + rvc) / 2; ybase = np.percentile(hp[ven][:, 1], 85)
av = RA[np.argmin(np.linalg.norm(RA - np.array([sm[0], ybase, sm[2]]), axis=1))]
apex = LV[np.argmax(np.linalg.norm(LV - av, axis=1))]
his = av + .22 * (apex - av)
act = np.zeros(len(hp))
act[atr] = np.linalg.norm(hp[atr] - sa, axis=1); act[atr] /= act[atr].max()
ax = apex - his; s_ = np.clip(((hp[ven] - his) @ ax) / (ax @ ax), 0, 1)
d_axis = np.linalg.norm(hp[ven] - (his + s_[:, None] * ax), axis=1)
act[ven] = .6 * d_axis / d_axis.max() + .4 * (1 - s_); act[ven] = (act[ven] - act[ven].min()) / np.ptp(act[ven])
far = lambda P_, ref: P_[np.argmax(np.linalg.norm(P_ - ref, axis=1))]
conduction = {'sinus_node': sa, 'av_node': av, 'his_end': his, 'apex': apex,
              'left_bundle': [his, his + .55 * ax + .25 * (lvc - sm), .9 * apex + .1 * lvc, lvc + .7 * (far(LV, rvc) - lvc)],
              'right_bundle': [his, his + .45 * ax + .35 * (rvc - sm), rvc + .6 * (far(RV, lvc) - rvc)]}
conduction = {k: (np.round(v, 5).tolist() if isinstance(v, np.ndarray) else [np.round(x, 5).tolist() for x in v]) for k, v in conduction.items()}
groups['heart']['attributes'] = {'chamber': chamber, 'activation_order': np.round(act * 255).astype(np.uint8)}
print('heart chambers', np.bincount(chamber).tolist(), 'conduction', {k: v for k, v in conduction.items() if k in ('sinus_node', 'av_node', 'apex')}, flush=True)

# Landmarks in the same frame, for fitting into the child.
heart_c, heart_lo, heart_hi = centre('VH_M_Heart.glb', lambda n: 'atrium' in n or 'ventricle' in n)
bladder_c, _, _ = centre('VH_M_Urinary_Bladder.glb', lambda n: True)
_, trachea_lo, trachea_hi = centre('3d-vh-m-trachea.glb', lambda n: n.startswith('VH_M_trachea'))
eye_l, _, _ = centre('VH_M_Blood_Vasculature.glb', lambda n: 'central_retinal_artery_L' in n)
eye_r, _, _ = centre('VH_M_Blood_Vasculature.glb', lambda n: 'central_retinal_artery_R' in n)
lung_p = groups['lungs']['positions']; vessel_p = np.vstack([groups['arteries']['positions'], groups['veins']['positions']])
landmarks = {'heart': heart_c.round(4).tolist(), 'heart_size': float((heart_hi - heart_lo).max().round(4)), 'bladder': bladder_c.round(4).tolist(),
             'trachea_top': float(trachea_hi[1].round(4)), 'eye_left': eye_l.round(4).tolist(), 'eye_right': eye_r.round(4).tolist(),
             'lungs_min': lung_p.min(0).round(4).tolist(), 'lungs_max': lung_p.max(0).round(4).tolist(),
             'vessels_top': float(vessel_p[:, 1].max().round(4)), 'vessels_bottom': float(vessel_p[:, 1].min().round(4))}

lo = np.min([g['positions'].min(0) for g in groups.values()], 0); hi = np.max([g['positions'].max(0) for g in groups.values()], 0)
blob, meta_groups = b'', {}
for name, g in groups.items():
    entry = {'colour': g['colour'], 'opacity': g['opacity'], 'vertices': len(g['positions']), 'indices': len(g['triangles'])}
    entry['index_offset'] = len(blob); blob += g['triangles'].astype('<u2').tobytes(); blob += b'\0' * (-len(blob) % 4)
    entry['position_offset'] = len(blob)
    q = np.round((g['positions'] - lo) / (hi - lo) * 65534 - 32767).astype('<i2'); blob += q.tobytes(); blob += b'\0' * (-len(blob) % 4)
    for k, a in g.get('attributes', {}).items():      # uint8, one value per vertex
        entry.setdefault('attributes', {})[k] = len(blob); blob += a.astype(np.uint8).tobytes(); blob += b'\0' * (-len(blob) % 4)
    meta_groups[name] = entry
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'organs.bin').write_bytes(blob)
meta = {'format': 1, 'generated': datetime.date.today().isoformat(), 'bounds': {'min': lo.round(6).tolist(), 'max': hi.round(6).tolist()},
        'groups': meta_groups, 'landmarks': landmarks, 'conduction': conduction,
        'heart_attributes': 'chamber: 0 right atrium, 1 left atrium, 2 right ventricle, 3 left ventricle. activation_order: 0-255, earliest to latest within atria or ventricles (illustrative; Durrer et al. 1970 sequence).', 'units': 'metres, y up, front +z, body left +x (Visible Human Male frame)',
        'source': 'HuBMAP Human Reference Atlas 3D reference organs, Visible Human Male (Kristen Browne, Heidi Schlehlein; HuBMAP CCF 3D Reference Object Library)',
        'source_files': SOURCES, 'licence': 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
        'changes': 'Outer surfaces kept, meshes decimated, organs grouped, coordinates converted; positions refitted to the child at display time.'}
(OUT / 'organs.json').write_text(json.dumps(meta, indent=1))
print('landmarks', json.dumps(landmarks)); print('wrote', OUT / 'organs.bin', len(blob), 'bytes', flush=True)
