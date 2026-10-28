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
