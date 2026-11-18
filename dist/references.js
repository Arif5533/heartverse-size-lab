// One numbered reference list for the child heart lab. Every claim on the page carries a marker [n] that opens
// this list at entry n. Published references were checked against Crossref (DOI, title, journal, volume, pages)
// and, where the text is open, against the text itself. Project analyses are marked as unpublished.
// Counts in the project entries are filled from the data files (setReferenceData), not typed here.

let D={children:'—',profile:'—',realTachy:'—',simECGs:'—'};
export function setReferenceData(d){D={...D,...d};}

export const REFS=[
  // ---- data behind the page ----
  {key:'tan2025',cite:()=>'Tan J, Fan H, Luo J, et al. A pediatric ECG database with disease diagnosis covering 11643 children. <i>Sci Data</i> 2025;12. Data on Figshare, CC BY 4.0.',url:'https://doi.org/10.1038/s41597-025-05225-z',
    use:'The hospital ECGs (ZZU, China) behind all of this page’s child data.'},
  {key:'hv1',cite:()=>`Heartverse Stage 1: ECG measurements by age and sex in ${D.profile} children aged 1–14 with normal ECGs from the ZZU database [1]. Unpublished project analysis, October 2026.`,
    use:'Normal bands by age, typical P, PR, QRS and QT times, QT–heart-rate exponents, usual heart-rate ranges, and the measuring software used to check the simulator.'},
  {key:'hv2',cite:()=>`Heartverse Stage 2 simulator: a 12-lead heartbeat and age model fitted to ${D.children} children aged 1–14 with normal ECGs from the ZZU database [1], with checks against their median beats. Unpublished project analysis, November 2026.`,
    use:'The 12-lead waves, the heart arrow and its loops, the lead directions, and the “how close to real children” numbers.'},
  {key:'hvqt',cite:()=>`Heartverse QT analyses: QTc by formula in ${D.realTachy} ZZU children [1] whose ECG was labelled sinus tachycardia, and QT measured on ${D.simECGs} simulated ECGs. Unpublished project analysis, November 2026.`,
    use:'The “In real children” card and the simulator QT check.'},
  {key:'rijnbeek2001',cite:()=>'Rijnbeek PR, Witsenburg M, Schrama E, Hess J, Kors JA. New normal limits for the paediatric electrocardiogram. <i>Eur Heart J</i> 2001;22:702–711. Values transcribed from the reprint in the author’s PhD thesis (Erasmus University Rotterdam, 2007), chapter 3.',url:'https://doi.org/10.1053/euhj.2000.2399',
    use:'Published normal values (points on the growth charts); the heart-rate band below 3 years.'},
  {key:'saarel2018',cite:()=>'Saarel EV, Granger S, Kaltman JR, et al. Electrocardiograms in healthy North American children in the digital age. <i>Circ Arrhythm Electrophysiol</i> 2018;11:e005808.',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6034977/',
    use:'Published normal values (points on the growth charts).'},
  {key:'who2006',cite:()=>'WHO Multicentre Growth Reference Study Group. WHO Child Growth Standards based on length/height, weight and age. <i>Acta Paediatr</i> 2006;95(S450):76–85. Medians from the WHO simplified field tables.',url:'https://doi.org/10.1111/j.1651-2227.2006.tb02378.x',
    use:'Median height at ages 1–5 (length at 1 year).'},
  {key:'deonis2007',cite:()=>'de Onis M, et al. Development of a WHO growth reference for school-aged children and adolescents. <i>Bull World Health Organ</i> 2007;85:660–667. Medians from the WHO simplified field tables.',url:'https://doi.org/10.2471/BLT.07.043497',
    use:'Median height at ages 6–14.'},
  // ---- how the heart and the ECG work ----
  {key:'openstax',cite:()=>'Betts JG, Young KA, Wise JA, et al. <i>Anatomy and Physiology 2e</i>, section 19.2 Cardiac muscle and electrical activity. OpenStax, 2022. CC BY 4.0.',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity',
    use:'The conduction system (sinus node, AV node, His bundle, bundle branches, Purkinje fibres), what the P wave, QRS and T wave are, and when the chambers squeeze.'},
  {key:'openstax20',cite:()=>'Betts JG, Young KA, Wise JA, et al. <i>Anatomy and Physiology 2e</i>, section 20.5 Circulatory pathways. OpenStax, 2022. CC BY 4.0.',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways',
    use:'Courses of the main arm and leg arteries and veins drawn in the figure.'},
  {key:'durrer1970',cite:()=>'Durrer D, van Dam RT, Freud GE, Janse MJ, Meijler FL, Arzbaecher RC. Total excitation of the isolated human heart. <i>Circulation</i> 1970;41:899–912.',url:'https://doi.org/10.1161/01.CIR.41.6.899',
    use:'The order in which the ventricles fire (septum first, inside to outside, posterobasal left ventricle and right-ventricular outflow last).'},
  {key:'macalpin2003',cite:()=>'MacAlpin RN. Left septal fascicular block: myth or reality? <i>Indian Pacing Electrophysiol J</i> 2003;3:157–177. (Open summary of Durrer 1970.)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC1513523/',
    use:'Checked summary of Durrer’s findings (the original is not openly available).'},
  {key:'zuchowski2023',cite:()=>'Żuchowski B, Błaszyk K, Piskorski J, Wykrętowicz A, Guzik P. Dependence of the atrioventricular conduction time on the conduction through the atrioventricular node and His–Purkinje system. <i>J Clin Med</i> 2023;12:1330.',url:'https://doi.org/10.3390/jcm12041330',
    use:'His-to-ventricle time in adults (mean 43.7 ms in 64 patients), for the set 35 ms in the animation.'},
  {key:'dickinson2005',cite:()=>'Dickinson DF. The normal ECG in childhood and adolescence. <i>Heart</i> 2005;91:1626–1630.',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC1769212/',
    use:'How and why the ECG changes from birth to adolescence; normal QTc in children; the usual QRS axis.'},
  {key:'einthoven1912',cite:()=>'Einthoven W. The different forms of the human electrocardiogram and their signification. <i>Lancet</i> 1912;179:853–861.',url:'https://doi.org/10.1016/S0140-6736(00)50560-1',
    use:'Limb leads I, II and III and the triangle that gives their textbook directions (0°, +60°, +120°).'},
  {key:'goldberger1942',cite:()=>'Goldberger E. A simple, indifferent, electrocardiographic electrode of zero potential and a technique of obtaining augmented, unipolar, extremity leads. <i>Am Heart J</i> 1942;23:483–492.',url:'https://doi.org/10.1016/S0002-8703(42)90293-X',
    use:'The augmented leads aVR, aVL and aVF (textbook directions −150°, −30°, +90°).'},
  {key:'burger1946',cite:()=>'Burger HC, van Milaan JB. Heart-vector and leads. <i>Br Heart J</i> 1946;8:157–161.',url:'https://doi.org/10.1136/hrt.8.3.157',
    use:'Each lead records the heart vector’s projection on that lead’s own direction (the “shadow” rule).'},
  {key:'kligfield2007',cite:()=>'Kligfield P, Gettes LS, Bailey JJ, et al. Recommendations for the standardization and interpretation of the electrocardiogram, part I. <i>Circulation</i> 2007;115:1306–1324.',url:'https://doi.org/10.1161/CIRCULATIONAHA.106.180200',
    use:'Standard chest electrode positions and ECG display.'},
  {key:'umedic',cite:()=>'Gordon Center for Simulation and Innovation in Medical Education, University of Miami. <i>Essential Electrocardiography</i>: Standardization (UMedic course).',url:'https://ilearn.courses.med.fiu.edu/published/Essential_ECG/ECG_intro/std.html',
    use:'Standard paper speed 25 mm/s and 1 mV = 10 mm.'},
  // ---- QT correction ----
  {key:'bazett1920',cite:()=>'Bazett HC. An analysis of the time-relations of electrocardiograms. <i>Heart</i> 1920;7:353–370. Reprinted: <i>Ann Noninvasive Electrocardiol</i> 1997;2:177–194.',url:'https://doi.org/10.1111/j.1542-474X.1997.tb00325.x',
    use:'Bazett’s QT correction, QT/RR<sup>1/2</sup>.'},
  {key:'fridericia1920',cite:()=>'Fridericia LS. Die Systolendauer im Elektrokardiogramm bei normalen Menschen und bei Herzkranken. <i>Acta Med Scand</i> 1920;53:469–486.',url:'https://doi.org/10.1111/j.0954-6820.1920.tb18266.x',
    use:'Fridericia’s QT correction, QT/RR<sup>1/3</sup>.'},
  {key:'haq2025',cite:()=>'Haq KT, McLean KM, Anderson-Barker GC, et al. Validation of a demography-based adaptive QT correction formula. <i>Circ Arrhythm Electrophysiol</i> 2025;18:e013237.',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12884567/',
    use:'The age-adaptive QT correction (QTcAd).'},
  {key:'andrsova2020',cite:()=>'Andršová I, Hnatkova K, Helánová K, et al. Problems with Bazett QTc correction in paediatric screening of prolonged QTc interval. <i>BMC Pediatr</i> 2020;20:558.',url:'https://doi.org/10.1186/s12887-020-02460-8',
    use:'440 ms as the borderline upper limit of normal QTc in children; Bazett over-corrects at fast heart rates.'},
  // ---- the 3D figure ----
  {key:'hra',cite:()=>'HuBMAP Human Reference Atlas, 3D reference organs, Visible Human Male (K. Browne, H. Schlehlein). CC BY 4.0. Reduced, recoloured and refitted to each child.',url:'https://humanatlas.io/3d-reference-library',
    use:'Heart, lungs, liver, airway, abdominal organs and trunk vessels in the figure (adult shapes, sizes illustrative).'},
  {key:'makehuman',cite:()=>'MakeHuman base mesh and targets via the MPFB add-on for Blender. CC0.',url:'https://static.makehumancommunity.org/about/license.html',
    use:'The child’s body shape at 1, 10 and 14 years.'},
  {key:'marxtrax',cite:()=>'marxtrax. “Human_heart_3d_model”. Sketchfab, CC BY 4.0; materials adapted.',url:'https://sketchfab.com/3d-models/human-heart-3d-model-5e442ad98b574fdf844432b246fcf323',
    use:'The cutaway heart in the QT readings close-up.'},
  {key:'time2track',cite:()=>'Time2Track code repository (GitHub, Chrisa142857/time2track), released Subject A animation, 49 frames of one generated cardiac cycle.',url:'https://github.com/Chrisa142857/time2track/blob/0a9da5232b6902dccf2fcf3db0a50019fe4c8745/example_ecg_gif/ecg_heart_shift_invariant_8L_256d_49frames_subjectA.gif',
    use:'How the heart’s size changes through one beat, used for the squeeze animation (projected size, not measured volume).'},
];
const INDEX=Object.fromEntries(REFS.map((r,i)=>[r.key,i+1]));
export const refNumber=key=>{const n=INDEX[key];if(!n)throw new Error(`Unknown reference ${key}`);return n;};
const plain=html=>html.replace(/<[^>]+>/g,'');
// Inline marker, e.g. cite('hv1','tan2025') -> [1, 2]; each number opens its reference.
export function cite(...keys){
  const ks=[...new Set(keys.flat())].sort((a,b)=>refNumber(a)-refNumber(b));
  return `<sup class="cite">[${ks.map(k=>`<a href="#ref-${k}" data-ref="${k}" title="${plain(REFS[refNumber(k)-1].cite()).replace(/"/g,'&quot;')}">${refNumber(k)}</a>`).join(', ')}]</sup>`;
}
export function referenceListHTML(keys=REFS.map(r=>r.key)){
  return keys.map(k=>{const r=REFS[refNumber(k)-1];
    return `<li value="${refNumber(k)}" id="ref-${k}">${r.cite()}${r.url?` <a href="${r.url}" target="_blank" rel="noopener noreferrer">Link ↗</a>`:''}<small>Used for: ${r.use}</small></li>`;}).join('');
}
