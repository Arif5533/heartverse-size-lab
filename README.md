# Heartverse · Heart Size Lab

An interactive anatomy studio for exploring published heart-size references, transparent 3D anatomy, and illustrative 4D motion.

**[Open the website](https://arif5533.github.io/heartverse-size-lab/)** · **[Research & sources](https://arif5533.github.io/heartverse-size-lab/#research)**

## Explore

- Pediatric reference volumes for girls and boys across published body-surface-area settings, plus a separate adult-men reference.
- Transparent, dot, mesh, and color-detail anatomy, with orbit, zoom, view presets, and image export.
- An illustrative cardiac cycle with play/pause, phase, and speed controls.
- A separate 49-frame released Time2Track motion comparison.
- The proposed Heartverse ECG research framework, its complete Figure 1 caption, and the original downloadable PDF.

## Scientific scope

The numerical output is left-ventricular end-diastolic cavity volume. The anatomical mesh is an artistic illustration; it is not a segmented pediatric scan or calibrated whole-heart measurement. Uniform visual scaling follows the cube root of the volume ratio. The main 4D motion is simulated for illustration.

Pediatric settings use exact published BSA rows from [Xu et al. (2025), Table 4](https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0020), covering a study population aged 4–18. BSA is not an age estimate. Adult-men values use the separate [SCMR 2025 reference update, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0015). These populations do not form a continuous developmental growth curve.

The research figure describes a **proposed study**, with proposed ages 1–16 subject to available patients and reliable rhythm labels. Its diagrams are schematic, not experimental results. This website does not perform ECG generation, classification, or clinical diagnosis. The Time2Track example is independent of the size controls and does not validate the illustrative animation.

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
- `dist/reference.js`: published reference values and bounded lookup.
- `dist/research-motion.js`: released motion-example player.
- `dist/method-figure.js`: research figure enlargement and zoom.
- `dist/media/research/`: original method PDF, web image, and exact caption.
- `dist/models/`, `dist/vendor/`, `dist/media/time2track/`: attributed third-party assets.

## Attribution and licenses

**3D anatomy:** This work is based on [“Human_heart_3d_model”](https://sketchfab.com/3d-models/human-heart-3d-model-5e442ad98b574fdf844432b246fcf323) by [marxtrax](https://sketchfab.com/marxtrax), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Materials, lighting, display colors, orientation, visual scale, and illustrative motion are adapted. The original credit and modification notes are included with the model.

**Three.js:** MIT license; see [THREE-LICENSE.txt](dist/vendor/THREE-LICENSE.txt).

**Time2Track motion example:** © 2026 Ziquan Wei, Tingting Dan, Guorong Wu; MIT license. The released shift-invariant baseline animation is adapted to a 49-frame WebP atlas. See [asset provenance](dist/media/time2track/source.json) and [license](dist/media/time2track/LICENSE.txt). The viewer's adjustable display timing is not measured physiological timing.

Third-party license terms apply to their respective assets. No blanket license is granted for the original Heartverse code, design, or research figure by this repository.
