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
