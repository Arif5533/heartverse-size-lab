# Heartverse · Heart Size Lab

An interactive anatomy studio for exploring published heart-size references, transparent 3D anatomy, and illustrative 4D motion.

**[Open the website](https://arif5533.github.io/heartverse-size-lab/)** · **[Research & sources](https://arif5533.github.io/heartverse-size-lab/#research)**

## Explore

- Pediatric reference volumes for girls and boys by body surface area (BSA) or by body height, plus a separate adult-men reference.
- A heart-function panel for the selected setting: pump (stroke volume, end-systolic volume, ejection fraction, stroke volume compared with adults of the same sex), muscle (LV mass, wall thickness or longitudinal strain), and pulse (resting ECG heart rate and heart rate during MRI).
- Transparent, dot, mesh, and color-detail anatomy, with orbit, zoom, view presets, and image export.
- An illustrative cardiac cycle with play/pause, phase, and speed controls. At 1× it beats at the median heart rate of the selected ECG age group.
- A sample ECG synchronised with the cycle: a lead II strip on standard paper and a 3D ECG loop (vectorcardiogram) around the heart, with an ECG age control for children aged 1–16 (by sex) and adult men aged 16–89.
- A 49-frame released Time2Track motion comparison, synced by default to the 4D cycle. The heart's contraction timing follows the measured size of the Time2Track ground-truth mesh in each frame, so frame N and the 3D heart show the same moment of the beat.
- The proposed Heartverse ECG research framework, its complete Figure 1 caption, and the original downloadable PDF.
- Study preparation, the Figure 2 age-transfer design, and age-group classification results with both comparison tables and the Figure 3 ROC plots.

## Scientific scope

The numerical output is left-ventricular end-diastolic cavity volume. The anatomical mesh is an artistic illustration; it is not a segmented pediatric scan or calibrated whole-heart measurement. Uniform visual scaling follows the cube root of the volume ratio. The main 4D motion is simulated for illustration.

Pediatric settings use exact published BSA rows from [Xu et al. (2025), Table 4](https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0020), covering a study population aged 4–18. BSA is not an age estimate. Adult-men values use the separate [SCMR 2025 reference update, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0015). These populations do not form a continuous developmental growth curve.

Height mode uses [Voges et al. (2023)](https://doi.org/10.1002/jmri.28299) as reproduced in [SCMR 2025 Tables 24 and 26](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0120): exact 10 cm rows, 110–180 cm for boys and 120–180 cm for girls (rows above 180 cm are omitted). That cohort (154 clinically referred children with normal CMR, UK and Germany, 1.5T) differs from Xu's volunteers (3T), so height and BSA modes are not interchangeable.

The heart-function panel shows only published values at the selected row, without interpolation:

| Factor | BSA mode (children) | Height mode (children) | Adult men |
|---|---|---|---|
| Pump: stroke and end-systolic volume | [Xu Tables 5–6](https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0030), 5th/50th/95th | SCMR Tables 24/26 (Voges 2023) | [SCMR Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0015), mean ± SD |
| Ejection fraction | Xu Table 2, by sex only | Not tabulated by height | SCMR Table 3 |
| Stroke volume vs adults | Child median ÷ SCMR Table 3 mean (women for girls, men for boys) | Same | Cardiac output instead (Table 3) |
| Muscle: LV mass | [Xu Table 7](https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0035) | [SCMR Table 28](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0140), papillary muscles excluded | SCMR Table 3 |
| Muscle: wall thickness / strain | Mid-ventricular wall thickness, [SCMR Tables 48–49](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0240) (Krupickova 2021), from 0.8 m² | LV global longitudinal strain, [SCMR Table 104](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0520) (Voges 2022), both sexes | LV mass ÷ EDV, ratio of means |
| Pulse | Rijnbeek ECG heart rate for the ECG age; Xu Table 1 heart rate during MRI | Same | Rijnbeek 2014 heart rate; QRS and QTc |

Strain measures how much the muscle shortens; it is not a direct measure of muscle strength. Each value is a separate published centile, so stroke and end-systolic volume need not sum exactly to end-diastolic volume, and no ejection fraction is derived from centiles. Size, pump and muscle values do not change the sample ECG, and the 4D motion depth is still illustrative.

The sample ECG uses median heart rate, PR, P and QRS duration, Bazett QTc and frontal axes from [Rijnbeek et al. (2001)](https://doi.org/10.1053/euhj.2000.2399) for children aged 1–16 and [Rijnbeek et al. (2014)](https://doi.org/10.1016/j.jelectrocard.2014.07.022) for adult men. Wave shapes, front–back loop components, T-wave size, adult amplitudes, the pediatric T-wave axis, and the electromechanical delay are illustrative. It is not computed from the 3D mesh, heart size does not change it, and it is not a patient ECG or diagnostic.

Figure 1 describes a **proposed study**, with proposed ages 1–16 subject to available patients and reliable rhythm labels. Its diagrams are schematic, not experimental results. This website does not perform ECG generation, classification, or clinical diagnosis. The Time2Track example is independent of the size controls. Its measured size profile sets the 4D cycle timing (frames assumed evenly spaced, projected area as a size proxy); this does not validate the illustrative deformation.

## Run locally

The website is buildless HTML, CSS, and JavaScript. Three.js and the anatomical assets are included.

```sh
python3 -m http.server 4174 --directory dist
```

Open `http://localhost:4174/`. Serve over HTTP rather than opening the HTML file directly. Google Fonts is optional; system font fallbacks are provided.

## Publish updates

Edit the website files in `dist/`, commit, and push to `main`. The [GitHub Pages workflow](.github/workflows/pages.yml) uploads `dist/` and publishes the site automatically. A manual run is also available from the repository's Actions tab.

All application asset paths are relative so the site works at the `/heartverse-size-lab/` project path. No installation, API keys, or backend is required.

## Files

- `dist/index.html`, `dist/style.css`, `dist/studio.css`: interface and responsive design.
- `dist/app.js`, `dist/appearance.js`: anatomy viewer, appearance, and illustrative motion.
- `dist/reference.js`: published reference values and bounded lookup, including the cited ECG norms, heart-function, muscle and height references.
- `dist/ecg.js`: sample ECG and 3D loop model.
- `dist/cycle-profile.js`: shared cycle timing measured from the Time2Track ground-truth frames.
- `checks/time2track-profile.mjs`: re-measures that profile from the frame atlas (see the file header for the macOS command).
- `checks/ecg.mjs`: measures every sample ECG and checks it against the cited norms (`node checks/ecg.mjs`).
- `checks/verify-physiology.py`: compares all 661 heart-function, muscle, height and adult values with the Xu and SCMR source XML (`python3 checks/verify-physiology.py`).
- `checks/physiology.mjs`: checks every BSA and height row, centile order and invalid inputs (`node checks/physiology.mjs`).
- `dist/physiology.css`: heart-function panel and size-measure switch.
- `dist/research-motion.js`: released motion-example player.
- `dist/method-figure.js`: research figure enlargement and zoom.
- `dist/media/research/`: original method PDF, web image, and exact caption.
- `dist/models/`, `dist/vendor/`, `dist/media/time2track/`: attributed third-party assets.

## Attribution and licenses

**3D anatomy:** This work is based on [“Human_heart_3d_model”](https://sketchfab.com/3d-models/human-heart-3d-model-5e442ad98b574fdf844432b246fcf323) by [marxtrax](https://sketchfab.com/marxtrax), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Materials, lighting, display colors, orientation, visual scale, and illustrative motion are adapted. The original credit and modification notes are included with the model.

**Three.js:** MIT license; see [THREE-LICENSE.txt](dist/vendor/THREE-LICENSE.txt).

**Time2Track motion example:** © 2026 Ziquan Wei, Tingting Dan, Guorong Wu; MIT license. The released shift-invariant baseline animation is adapted to a 49-frame WebP atlas. See [asset provenance](dist/media/time2track/source.json) and [license](dist/media/time2track/LICENSE.txt). The viewer's adjustable display timing is not measured physiological timing.

Third-party license terms apply to their respective assets. No blanket license is granted for the original Heartverse code, design, or research figure by this repository.

## Child heart lab (`dist/child.html`, branch `qt-focus`, not published)

A separate page; the original Heartverse page (`dist/index.html`) is unchanged. Started November 17, 2026.

A study tool for a child’s heart and ECG, in three sections (tabs at the top; the address keeps the section and settings):

1. **How a heartbeat works.** One heartbeat of the typical child for the chosen age and sex, slowed down (¼× by default, scrubbable). On the atlas heart: the conduction path (sinus node → AV node → His bundle → bundle branches) with a travelling impulse, the electrical wave spreading over the atria and ventricles and recovering, the heart vector (arrow) with its P, QRS and T loops, and the chosen lead’s direction with the arrow’s shadow on it. Beside it: a 12-lead ECG of the same beat on standard paper (25 mm/s, 10 or 5 mm/mV) with a cursor at the same moment in every lead, a card explaining the current phase, a card on how the chosen lead sees the heart (front and top views of the vector and lead directions), and a card on how close the typical child is to real children of that age.
2. **Growing up.** Ten measurements by age (heart rate, PR, QRS, QT, QTc Bazett, QRS axis, R and S in V1, R in V6, upright T in V1): Stage 1 ZZU centile bands with Rijnbeek 2001 and Saarel 2018 points (median, 2nd–98th centile), the value at the chosen age, a plain-language “why it changes” note (Dickinson, Heart 2005), and the typical child’s leads II, V1 and V6 at two ages overlaid with a table of numbers.
3. **QT readings.** The original page, below.

*References.* `dist/references.js` holds one numbered list of 27 references (published ones checked against Crossref and, where open, their text; project analyses marked unpublished). Every claim on the page carries a marker [n] that opens entry n in “Method and references”, and a card at the end of each section lists the references cited in it. `checks/panels.mjs` fails if a phase, lead, measurement or note has no reference, if a marker names an unknown reference, or if a reference is never cited. Child heights are WHO medians (`WHO_HEIGHT_CM` in `dist/avatar.js`; the figure uses the girls/boys average). Each explanation says only what its sources say: OpenStax Anatomy & Physiology 2e §19.2 (beat phases), Durrer 1970 via MacAlpin 2003 (order inside the ventricles), Kligfield 2007 (electrode positions), Dickinson 2005 (why measures change with age; for heart rate the sources give no cause, and the card says so). Counts (783, 799, 34), QT–RR exponents and the simulator-check ranges are read from the data files, which the export scripts write. Two set values only affect the animation: 35 ms for the His–bundle-branch run (adults average about 44 ms, Żuchowski 2023) and 30 ms from QRS onset to the squeeze.

*What is data and what is drawn.* From data: the 12-lead waves, heart vector, loops and P/PR/QRS/QT times come from the Heartverse Stage 2 simulator (783 ZZU children, ages 1–14) via `experiments/vcg-simulator/export_web.py` → `dist/data/child-heart.json`; `dist/ecg12.js` is a JavaScript copy of the simulator. The typical child = every simulator setting at its age mean and timing at the Stage 1 medians; checked against the real median beats (median lead correlation 0.96–0.98 at ages 3–14; weaker at ages 1–2, where QT runs short and PR long, and the page says so). Growth curves: `experiments/age-profiles/export_growth.py` → `dist/data/growth.json`. Drawn for teaching: the conduction path and its position, the order the glow spreads over the heart (Durrer 1970 sequence, per-vertex order from `tools/build_organs.py`), and the heart itself. Code: `dist/heartbeat3d.js` (3D overlays), `dist/ecg-panels.js` (12-lead, vector views, lead and phase texts), `dist/growth-panel.js` (charts and comparison).

**QT readings: question it answers.** A child’s corrected QT (QTc) can pass or fail depending on the correction formula. Pick age, sex, a typical or upper-normal QT and a heart rate; the page shows the true QT, what Bazett, Fridericia and the age-adaptive formula of Haq et al. 2025 report, whether they disagree about the 440 ms line, and how much each drifts with heart rate. A card shows the same disagreement in 1,369 real children with sinus tachycardia (Bazett 16.7% vs Fridericia 1.0% above 440 ms). “How it works” explains the method, the check, the limits and every source and licence. The address keeps the current settings, so a view can be shared.

**Numbers.** `dist/qt.js` holds the arithmetic. The true QT is the Heartverse Stage 1 profile QT for the age and sex (50th or 90th centile) moved along the Stage 1 age-band QT–RR exponent to the selected heart rate. `dist/data/qt-profiles.json` holds aggregated values only, written by `experiments/qt-alarms/export_site_data.py` in the Heartverse research folder.

**3D figure.**
- *Body:* MakeHuman base body (CC0) generated with the MPFB add-on in Blender at 1, 10 and 14 years on one mesh (`tools/generate_body.py` → `dist/models/child-body/`, with eye and eyelash helpers, tights cut to shorts, skin masks and joint markers), blended by age in `dist/avatar.js` and scaled to a rounded typical height. The default look is warm glass with no face; the Skin look adds a face, hair and shorts with a see-through window over the heart; four skin tones.
- *Organs and trunk vessels:* HuBMAP Human Reference Atlas, Visible Human Male (CC BY 4.0), reduced by `tools/build_organs.py` to `dist/models/organs/`. `dist/organs.js` refits these adult organs into each child: heights through anchors (pelvic floor, bladder, heart, top of the trachea, eyes); in the trunk, width and depth at each height fill the child’s outline, capped at the shoulders and hips. For display, the front inner edges of the lungs are drawn back so the heart shows, the intestines sit slightly deeper, and the bladder and the tiny eye vessels are hidden. Not paediatric measurements.
- *Limb vessels:* the atlas has none, so `dist/limbs.js` draws the main arm and leg arteries and veins along each child’s MakeHuman joint markers, joined to the lower ends of the atlas aorta and vena cava, with side branches. Courses follow textbook anatomy; positions and sizes are illustrative.
- *Inside the skin:* organ and vessel points that would show through the skin are moved just inside it (`plan.inside` in `dist/avatar.js`).
- *Heart:* the atlas heart beats at the selected rate. In QT readings it glows during the QT interval and its Heart view shows the detailed marxtrax cutaway (CC BY 4.0); in How a heartbeat works the Heart view keeps the atlas heart (with only the vessels around it) because it carries the electrical wave.

**Checks.**
```
node checks/qt.mjs         # QT arithmetic, data file and published numbers
node checks/scene.mjs      # ages 1–14: heart inside the chest; organs and limb vessels inside the skin (<1% of points outside)
node checks/heartbeat.mjs  # dist/ecg12.js reproduces the Python simulator (within 0.002 mV)
node checks/panels.mjs     # page measurements match the Stage 1 software; growth data ordered; every explanation names a source; no child counts typed into the page
python3 -m http.server 4176 --directory dist   # then open /child.html
```

**Rebuilding the models** (needs Blender 5.3 with MPFB 2.0.18, and the 13 atlas GLB files listed in `dist/models/organs/organs.json`):
```
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/generate_body.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_organs.py -- <folder with the atlas GLB files>
```
