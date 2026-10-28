"""Compare every heart-function, muscle and height value with the primary-source XML.

Xu 2025 Tables 1, 2, 5, 6, 7 and SCMR 2025 Tables 3, 24, 26, 28, 48, 49, 104.
Run: python3 checks/verify-physiology.py
"""
import json, re, subprocess, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

rootdir = Path(__file__).resolve().parents[1]
ref = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {physiologyReference} from './dist/reference.js'; console.log(JSON.stringify(physiologyReference))"], cwd=rootdir))
fetch = lambda pmc: ET.fromstring(urllib.request.urlopen(f'https://www.ebi.ac.uk/europepmc/webservices/rest/{pmc}/fullTextXML').read())
xu, scmr = fetch('PMC12182818'), fetch('PMC12159681')

def cells(root, table_id):
    table = next(t for t in root.iter('table-wrap') if t.get('id') == table_id)
    return [[' '.join(''.join(td.itertext()).split()) for td in tr.findall('td')] for tr in table.iter('tr')]

def numeric(root, table_id, max_first=None):
    rows = []
    for row in cells(root, table_id):
        try: values = [None if c == '-' else float(c.replace('−', '-')) for c in row]
        except ValueError: continue
        if len(values) >= 8 and values[0] is not None and (max_first is None or values[0] <= max_first): rows.append(values)
    return rows

checked = 0
def same(expected, actual, label):
    global checked
    assert expected == actual, f'{label}: source {expected} vs site {actual}'
    checked += len(expected) if isinstance(expected, list) else 1

def centiles(rows, offset, keep=lambda r: True):
    """5th, 50th and 95th columns starting at offset (5,10,25,50,75,90,95)."""
    rows = [r for r in rows if keep(r)]
    return {'p5': [r[offset] for r in rows], 'p50': [r[offset + 3] for r in rows], 'p95': [r[offset + 6] for r in rows]}

# Xu Tables 5–7: boys columns 1–7, girls 8–14, same 14 BSA rows as Table 4.
for key, table in [('lvesv', 'tbl0025'), ('lvsv', 'tbl0030'), ('lvm', 'tbl0035')]:
    rows = numeric(xu, table)
    assert len(rows) == 14
    for sex, offset in [('male', 1), ('female', 8)]:
        for c, values in centiles(rows, offset).items(): same(values, ref['bsa'][sex][key][c], f'Xu {key} {sex} {c}')

# Xu Table 2 LVEF and Table 1 heart rate, "Total" boys/girls columns.
def total(root, table_id, label):
    row = next(r for r in cells(root, table_id) if r and r[0].startswith(label))
    return row[1], row[2]
ef = [re.findall(r'[\d.]+', v) for v in total(xu, 'tbl0010', 'LVEF')]
for sex, (mean, sd) in zip(['male', 'female'], ef): same([float(mean), float(sd)], [ref['bsa']['lvef'][sex]['mean'], ref['bsa']['lvef'][sex]['sd']], f'Xu LVEF {sex}')
hr = [re.findall(r'[\d.]+', v) for v in total(xu, 'tbl0005', 'Heart rate')]
for sex, (median, low, high) in zip(['male', 'female'], hr):
    site = ref['bsa']['mriHeartRate'][sex]; same([float(median), float(low), float(high)], [site['median'], *site['iqr']], f'Xu heart rate {sex}')

# SCMR Tables 24 (boys) and 26 (girls): EDV columns 1–7, ESV 8–14, SV 15–21; rows to 180 cm.
for sex, table in [('male', 'tbl0120'), ('female', 'tbl0130')]:
    rows = numeric(scmr, table, 180)
    same([r[0] for r in rows], ref['height'][sex]['height'], f'height rows {sex}')
    for key, offset in [('lvedv', 1), ('lvesv', 8), ('lvsv', 15)]:
        for c, values in centiles(rows, offset).items(): same(values, ref['height'][sex][key][c], f'Voges {key} {sex} {c}')

# SCMR Table 28: LV mass excluding papillary muscles; girls have no 110 cm row.
rows = numeric(scmr, 'tbl0140', 180)
for sex, offset in [('male', 1), ('female', 8)]:
    for c, values in centiles(rows, offset, lambda r: r[offset] is not None).items(): same(values, ref['height'][sex]['lvm'][c], f'Voges mass {sex} {c}')

# SCMR Table 104: GLS by height, both sexes.
rows = numeric(scmr, 'tbl0520', 180)
same([r[0] for r in rows], ref['strain']['height'], 'strain rows')
for c, values in centiles(rows, 1).items(): same(values, ref['strain']['gls'][c], f'GLS {c}')

# SCMR Tables 48–49: mid-ventricular columns 8–14.
for sex, table in [('male', 'tbl0240'), ('female', 'tbl0245')]:
    rows = numeric(scmr, table)
    same([r[0] for r in rows], ref['thickness']['bsa'], f'thickness rows {sex}')
    for c, values in centiles(rows, 8).items(): same(values, ref['thickness'][sex][c], f'thickness {sex} {c}')

# SCMR Table 3: mean, SD, lower and upper limits for men (columns 3–4) and women (6–7).
labels = {'lvedv': 'LVEDV (mL)', 'lvesv': 'LVESV (mL)', 'lvsv': 'LVSV (mL)', 'lvef': 'LVEF (%)', 'lvm': 'LVM (g)', 'co': 'LVCO (L/min)'}
table3 = cells(scmr, 'tbl0015')
for key, label in labels.items():
    row = next(r for r in table3 if r and r[0] == label)
    for sex, (m, lim) in [('male', (3, 4)), ('female', (6, 7))]:
        mean, sd = (float(x) for x in row[m].split('±')); low, high = (float(x) for x in row[lim].split('-'))
        same([mean, sd, low, high], ref['adult'][sex][key], f'SCMR Table 3 {key} {sex}')

print(f'PASS: {checked} heart-function, muscle, height and adult values match Xu 2025 Tables 1, 2, 5–7 and SCMR 2025 Tables 3, 24, 26, 28, 48, 49, 104.')
