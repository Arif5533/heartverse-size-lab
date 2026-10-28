// Xu et al. 2025, Table 4. GAMLSS reference centiles, not raw means.
// LVEDV includes trabeculations and papillary muscles (smooth segmentation).
export const reference = {
  study: 'Xu et al. (2025)', doi: 'https://doi.org/10.1016/j.jocmr.2025.101885',
  table: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0020',
  population: '191 healthy Chinese children aged 4–18; 3T cardiac MRI',
  statistic: 'GAMLSS fitted 50th percentile of LV end-diastolic volume (mL)',
  segmentation: 'Trabeculations and papillary muscles included in cavity volume',
  bsa: [0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9],
  female: {
    p50:[39.9,48.3,56.4,64.3,72.2,80.1,87.8,95.8,103.4,109.8,114.8,118.9,122.9,126.9],
    p5:[32.5,39.4,46,52.4,58.9,65.3,71.5,78,84.3,89.5,93.6,96.9,100.2,103.4],
    p95:[46.6,56.3,65.8,75,84.2,93.4,102.3,111.6,120.6,128,133.9,138.6,143.3,147.9]
  },
  male: {
    p50:[42,50.1,58.4,66.1,72.5,80.3,89.8,99.4,109.3,119.2,128.6,137.4,145.4,153.5],
    p5:[34,40.6,47.2,53.5,58.6,64.9,72.6,80.4,88.4,96.4,104,111.1,117.6,124.1],
    p95:[51.1,61,71.1,80.5,88.2,97.7,109.3,121,133,145.1,156.6,167.2,177.1,186.8]
  },
  checked:'2026-10-14'
};
export function lookup(bsa,sex) {
  const index=reference.bsa.findIndex(value=>Math.abs(value-bsa)<1e-8);
  if(index<0 || !['female','male'].includes(sex)) throw new RangeError('Select a published BSA step and study sex group.');
  const row=reference[sex];
  return {bsa,sex,volume:row.p50[index],p5:row.p5[index],p95:row.p95[index],baseline:row.p50[4],scale:Math.cbrt(row.p50[index]/row.p50[4])};
}

// SCMR 2025 update, Table 3: papillary muscles/trabeculations in LV volume.
// Pooled adult mean and reference limits, NOT BSA-conditioned medians.
export const adultReference = {
  study: 'SCMR reference values, 2025 update',
  doi: 'https://doi.org/10.1016/j.jocmr.2025.101853',
  table: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0015',
  population: 'Adult men; pooled MRI references; n = 4867 for absolute LVEDV',
  statistic: 'Pooled mean ± SD and published lower–upper reference limits',
  segmentation: 'Papillary muscles and trabeculations included in LV cavity volume',
  mean: 143, sd: 31, lower: 81, upper: 204, n: 4867,
  checked: '2026-10-14'
};
export function lookupAdult(volume) {
  if(!Number.isFinite(volume)||volume<adultReference.lower||volume>adultReference.upper) throw new RangeError('Select a volume within the published adult reference limits.');
  return {population:'adult-men',sex:'male',volume,lower:adultReference.lower,upper:adultReference.upper,baseline:adultReference.mean,scale:Math.cbrt(volume/adultReference.mean),statistic:volume===adultReference.mean?'Published pooled mean':'Exploratory volume within reference limits'};
}

// ECG reference values for the sample ECG. Each entry is
// [median, 2nd percentile, 98th percentile]; QTc uses Bazett's formula.
// Children: Rijnbeek et al. 2001, Table 2 (thesis Table 3.2), ages 1–16 only.
// Lead II R and P amplitudes are medians from the same study (thesis Tables 3.5, 3.3).
// Adult men: Rijnbeek et al. 2014, Table 2 (PQ duration used as PR interval).
export const ecgReference = {
  pediatric: {
    study: 'Rijnbeek et al. (2001)', doi: 'https://doi.org/10.1053/euhj.2000.2399',
    fullText: 'https://repub.eur.nl/pub/38768',
    population: '1912 healthy Dutch children aged 11 days–16 years; 12-lead ECG at 1200 Hz; MEANS measurements',
    statistic: 'Median (2nd, 98th percentile)',
    bands: ['1–3 years','3–5 years','5–8 years','8–12 years','12–16 years'],
    male: {
      hr: [[119,97,155],[98,73,123],[88,62,113],[78,55,101],[73,48,99]],
      pAxis: [[48,-12,78],[43,-13,69],[41,-54,72],[39,-17,76],[40,-24,76]],
      pDur: [[80,63,113],[87,67,102],[92,73,108],[98,78,117],[100,82,118]],
      pr: [[118,86,151],[121,98,152],[129,99,160],[134,105,174],[139,107,178]],
      qrsAxis: [[64,-4,118],[70,7,112],[70,-10,112],[70,-21,114],[65,-9,112]],
      qrsDur: [[71,54,88],[75,58,92],[80,63,98],[85,67,103],[91,78,111]],
      qtc: [[412,383,455],[412,377,448],[411,371,443],[411,373,440],[407,362,449]],
      rII: [1.27,1.36,1.24,1.39,1.31], pII: [0.15,0.13,0.12,0.12,0.13]
    },
    female: {
      hr: [[128,95,178],[101,78,124],[89,68,115],[80,58,110],[76,54,107]],
      pAxis: [[47,1,90],[44,-6,90],[42,-13,77],[42,-15,82],[45,-18,77]],
      pDur: [[83,62,104],[84,66,101],[89,71,107],[94,75,114],[98,78,122]],
      pr: [[113,78,147],[123,99,153],[124,92,156],[129,103,163],[135,106,176]],
      qrsAxis: [[69,2,121],[69,3,106],[74,27,117],[66,5,117],[66,5,101]],
      qrsDur: [[68,54,85],[71,58,88],[77,59,95],[82,66,99],[87,72,106]],
      qtc: [[417,381,447],[415,388,442],[409,375,449],[410,365,447],[414,370,457]],
      rII: [1.27,1.38,1.33,1.32,1.32], pII: [0.16,0.13,0.12,0.14,0.15]
    },
    checked: '2026-10-28'
  },
  adultMen: {
    study: 'Rijnbeek et al. (2014)', doi: 'https://doi.org/10.1016/j.jelectrocard.2014.07.022',
    fullText: 'https://hdl.handle.net/1887/117357',
    population: '13,354 cardiologically healthy Dutch adults aged 16–90 (7326 men); standard 12-lead ECG; MEANS measurements',
    statistic: 'Median (2nd, 98th percentile)',
    bands: ['16–19 years','20–29 years','30–39 years','40–49 years','50–59 years','60–69 years','70–79 years','80–89 years'],
    male: {
      hr: [[73,49,107],[65,45,94],[65,46,95],[66,47,95],[67,48,94],[67,48,95],[67,50,99],[74,40,97]],
      pAxis: [[59,-22,81],[53,-8,79],[57,-13,81],[61,-1,82],[61,3,81],[61,-1,82],[63,-4,82],[63,-79,105]],
      pDur: [[106,90,136],[110,90,128],[110,90,134],[110,90,134],[116,94,140],[120,94,146],[120,94,144],[121,92,152]],
      pr: [[148,118,200],[150,118,196],[152,118,198],[152,115,200],[160,124,206],[164,126,220],[164,129,228],[172,122,290]],
      qrsAxis: [[74,-15,111],[66,-25,98],[69,-29,100],[69,-40,97],[56,-49,92],[42,-62,90],[33,-66,83],[15,-60,83]],
      tAxis: [[51,-3,73],[45,0,77],[50,0,78],[54,-2,81],[51,-4,84],[54,-14,86],[56,0,90],[57,-142,93]],
      qrsDur: [[100,82,126],[100,80,126],[100,78,124],[100,78,122],[100,80,124],[100,80,124],[101,80,131],[98,70,136]],
      qtc: [[416,379,460],[409,364,453],[413,365,458],[416,372,462],[418,375,463],[419,379,463],[421,379,478],[430,388,500]]
    },
    checked: '2026-10-28'
  },
  // Not reported in the tables above; fixed, illustrative display choices.
  illustrative: { pediatricTAxis: 45, tII: 0.3, adultRII: 1.1, adultPII: 0.12 }
};

// Heart function, muscle and height references for children, with the
// matching adult values. Each array is [5th, 50th, 95th] centiles by row.
// Xu 2025 Tables 5–7: LVESV, LVSV and LV mass on the same 14 BSA rows and
// segmentation as Table 4. Tables 1–2: heart rate during MRI (median, IQR)
// and LVEF (mean ± SD) by sex, not by BSA.
// SCMR 2025 Tables 24, 26 and 28 reproduce Voges et al. 2023 (by body height,
// 1.5T, clinically referred children with normal CMR, UK/Germany):
// volumes with papillary muscles in the cavity, and the matching LV mass
// without them. Rows above 180 cm are omitted. Table 104 reproduces
// Voges et al. 2022 LV global longitudinal strain by height (both sexes).
// SCMR Tables 48–49 reproduce Krupickova et al. 2021 mid-ventricular wall
// thickness by BSA (0.8–2.2 m²; no rows below 0.8 m²).
// Adults: SCMR Table 3, the same convention used by the adult volume mode.
export const physiologyReference = {
  bsa: {
    study: 'Xu et al. (2025)', doi: reference.doi,
    tables: {lvesv:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0025',lvsv:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0030',lvm:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12182818/#tbl0035'},
    male: {
      lvesv:{p5:[12.1,14.3,16.7,19.1,20.9,23.2,26.1,29,32.2,35.7,39.3,42.8,46.2,49.5],p50:[15.8,18.7,21.8,25,27.3,30.3,34.2,38,42.1,46.7,51.4,56,60.4,64.8],p95:[19.7,23.3,27.1,31.1,34,37.8,42.5,47.3,52.4,58.1,64,69.7,75.2,80.6]},
      lvsv:{p5:[21.4,25.6,29.7,33.4,36.6,40.6,45.3,50,54.6,59.1,63,66.4,69.4,72.4],p50:[26.3,31.4,36.4,40.9,44.9,49.7,55.5,61.2,66.9,72.3,77.1,81.3,85,88.6],p95:[32.3,38.5,44.7,50.3,55.1,61.1,68.1,75.2,82.2,88.9,94.7,99.9,104.5,108.9]},
      lvm:{p5:[16.8,19.8,22.8,25.9,28.8,32.3,36.8,41.4,46.2,51.1,55.5,59.3,62.9,66.4],p50:[21.4,25.2,28.9,32.9,36.6,41.1,46.7,52.5,58.6,65,70.5,75.3,79.9,84.4],p95:[26.7,31.4,36.1,41,45.7,51.3,58.4,65.6,73.2,81.2,88.1,94.1,99.8,105.4]}
    },
    female: {
      lvesv:{p5:[11,13.8,16.4,18.9,21.5,23.9,26.3,28.7,31.2,33.2,34.8,36.2,37.5,38.8],p50:[14.4,18,21.4,24.7,28.1,31.3,34.3,37.6,40.7,43.4,45.5,47.3,49,50.7],p95:[17.3,21.6,25.8,29.7,33.7,37.6,41.3,45.2,49,52.2,54.8,56.9,58.9,61]},
      lvsv:{p5:[21,24.8,28.6,32.4,36.2,40.2,44,47.6,51.2,54.3,57,59.4,61.7,64],p50:[25.5,30.2,34.8,39.4,44.1,49,53.6,58,62.4,66.2,69.5,72.3,75.1,77.9],p95:[29.9,35.3,40.7,46.1,51.6,57.3,62.7,67.9,72.9,77.4,81.2,84.6,87.8,91.1]},
      lvm:{p5:[14.1,18.6,22.6,25.9,29,32.3,35.7,39.4,42.7,45.7,48.7,51.7,54.6,57.6],p50:[17.2,22.6,27.5,31.5,35.2,39.2,43.4,47.8,51.9,55.5,59.1,62.8,66.4,70],p95:[20.4,26.9,32.7,37.4,41.8,46.6,51.6,56.9,61.7,66,70.3,74.6,78.9,83.2]}
    },
    // Table 2 "Total" columns (mean ± SD) and Table 1 heart rate (median [IQR]).
    lvef: {male:{mean:61.6,sd:2.8,n:102},female:{mean:61.2,sd:2.6,n:89}},
    mriHeartRate: {male:{median:80.6,iqr:[71.5,93.2]},female:{median:81.9,iqr:[70.6,92]}}
  },
  height: {
    study: 'Voges et al. (2023), reproduced in SCMR 2025 Tables 24, 26, 28',
    primaryDoi: 'https://doi.org/10.1002/jmri.28299', doi: adultReference.doi,
    tables: {male:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0120',female:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0130',lvm:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0140'},
    population: '154 children (101 boys) referred for CMR without cardiovascular disease, UK and Germany; 1.5T bSSFP; mean age 13.9 ± 2.8 years',
    segmentation: 'Papillary muscles and trabeculations in the cavity volume; LV mass excludes them',
    baseline: 140,
    male: {
      height:[110,120,130,140,150,160,170,180],
      lvedv:{p5:[47,55,65,75,88,102,118,136],p50:[58,69,81,95,112,132,155,182],p95:[93,108,119,130,147,167,191,220]},
      lvesv:{p5:[16,19,23,27,33,39,45,53],p50:[21,26,31,38,45,55,66,80],p95:[29,36,43,52,64,77,93,113]},
      lvsv:{p5:[19,28,36,44,51,59,67,76],p50:[28,39,49,59,70,80,90,101],p95:[38,50,62,75,88,101,114,126]},
      lvm:{p5:[24,28,34,40,47,56,66,78],p50:[32,38,45,54,64,77,92,110],p95:[39,47,56,68,82,99,120,145]}
    },
    female: {
      height:[120,130,140,150,160,170,180],
      lvedv:{p5:[17,37,56,75,95,114,132],p50:[55,72,89,105,122,139,156],p95:[94,107,121,135,150,164,179]},
      lvesv:{p5:[13,19,25,31,37,43,49],p50:[26,33,39,46,52,59,66],p95:[39,46,53,60,68,75,82]},
      lvsv:{p5:[14,23,32,41,49,58,67],p50:[29,39,49,59,70,80,90],p95:[44,55,67,78,90,102,113]},
      lvm:{p5:[20,27,34,41,48,54,60],p50:[34,43,52,61,70,79,88],p95:[47,58,69,81,92,104,116]}
    }
  },
  strain: {
    study: 'Voges et al. (2022), reproduced in SCMR 2025 Table 104', primaryDoi: 'https://doi.org/10.1002/jmri.28073',
    table: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0520',
    population: '157 children aged 5–18 (both sexes combined); CMR feature tracking',
    height:[100,110,120,130,140,150,160,170,180],
    gls:{p5:[-30.5,-29.7,-28.9,-28.1,-27.3,-26.6,-25.8,-25.1,-24.3],p50:[-24.5,-23.9,-23.4,-22.8,-22.2,-21.7,-21.1,-20.6,-20],p95:[-18.5,-18.2,-17.9,-17.5,-17.2,-16.8,-16.4,-16.1,-15.7]}
  },
  thickness: {
    study: 'Krupickova et al. (2021), reproduced in SCMR 2025 Tables 48–49', primaryDoi: 'https://doi.org/10.1186/s12968-020-00692-2',
    tables: {male:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0240',female:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159681/#tbl0245'},
    population: '161 children aged 6–18 referred for CMR without cardiovascular disease, UK and Germany; 1.5T',
    level: 'Mid-ventricular, diastole',
    bsa:[0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2],
    male:{p5:[2.3,2.5,2.7,2.9,3.1,3.3,3.5,3.8,4,4.3,4.5,4.8,5.1,5.4,5.7],p50:[3.4,3.6,3.8,4.1,4.3,4.5,4.7,5,5.2,5.4,5.6,5.9,6.1,6.3,6.5],p95:[4.5,4.7,5,5.2,5.5,5.7,5.9,6.1,6.3,6.5,6.7,6.9,7,7.2,7.4]},
    female:{p5:[3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.4,3.5,3.7,4,4.4,5,5.6,6.3],p50:[3.6,3.6,3.7,3.7,3.8,3.9,4.1,4.3,4.6,5,5.3,5.7,6.1,6.6,7.1],p95:[4,4.1,4.3,4.5,4.7,4.9,5.3,5.6,5.9,6.2,6.4,6.6,6.9,7.3,7.8]}
  },
  // SCMR Table 3, mean ± SD and lower–upper limits. Women are the girls' comparison.
  adult: {
    study: 'SCMR 2025 Table 3', table: adultReference.table,
    male: {lvedv:[143,31,81,204],lvesv:[52,18,17,88],lvsv:[91,19,53,128],lvef:[64,7,51,77],lvm:[105,23,60,150],co:[6.1,1.3,3.6,8.6]},
    female: {lvedv:[113,23,68,158],lvesv:[39,13,14,63],lvsv:[74,15,45,103],lvef:[66,6,54,79],lvm:[74,14,47,101],co:[4.9,1.1,2.9,7]}
  },
  checked: '2026-10-28'
};
const centile=(set,i)=>({p5:set.p5[i],p50:set.p50[i],p95:set.p95[i]});
export function lookupHeight(height,sex) {
  const row=physiologyReference.height[sex];
  const index=row?row.height.indexOf(height):-1;
  if(index<0) throw new RangeError('Select a published 10 cm height row for the study sex group.');
  const edv=centile(row.lvedv,index),base=row.lvedv.p50[row.height.indexOf(physiologyReference.height.baseline)];
  return {height,sex,volume:edv.p50,p5:edv.p5,p95:edv.p95,baseline:base,scale:Math.cbrt(edv.p50/base)};
}
// Function and muscle readings for the active size setting. No EF is derived
// from centiles: separate medians need not satisfy SV + ESV = EDV.
export function physiologyAt(population,sex,setting) {
  const p=physiologyReference;
  if(population==='adult-men'){
    const a=p.adult.male;
    return {source:'adult',lvedv:a.lvedv,lvesv:a.lvesv,lvsv:a.lvsv,lvef:a.lvef,lvm:a.lvm,co:a.co};
  }
  if(setting.height!==undefined){
    const row=p.height[sex],i=row.height.indexOf(setting.height),g=p.strain.height.indexOf(setting.height);
    if(i<0)throw new RangeError('Select a published height row.');
    return {source:'height',lvedv:centile(row.lvedv,i),lvesv:centile(row.lvesv,i),lvsv:centile(row.lvsv,i),lvm:centile(row.lvm,i),gls:g<0?null:centile(p.strain.gls,g)};
  }
  const i=reference.bsa.findIndex(v=>Math.abs(v-setting.bsa)<1e-8),t=p.thickness.bsa.findIndex(v=>Math.abs(v-setting.bsa)<1e-8);
  if(i<0||!['female','male'].includes(sex))throw new RangeError('Select a published BSA step and study sex group.');
  const row=p.bsa[sex];
  return {source:'bsa',lvedv:centile(reference[sex],i),lvesv:centile(row.lvesv,i),lvsv:centile(row.lvsv,i),lvm:centile(row.lvm,i),lvef:p.bsa.lvef[sex],thickness:t<0?null:centile(p.thickness[sex],t)};
}
