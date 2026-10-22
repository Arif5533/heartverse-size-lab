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
