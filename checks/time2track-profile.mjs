// Re-measures the Time2Track ground-truth size profile used for cycle timing.
// macOS: sips -s format bmp dist/media/time2track/shift-invariant-a.webp --out /tmp/atlas.bmp
// then:  node checks/time2track-profile.mjs /tmp/atlas.bmp
// Counts yellow ground-truth pixels in the right half of each 768×384 frame,
// applies a circular 5-frame moving average, and scales to 0 (smallest)–1 (fullest).
import { readFileSync } from 'node:fs';
import { groundTruthSize } from '../dist/cycle-profile.js';
const buf=readFileSync(process.argv[2]);
const off=buf.readUInt32LE(10),W=buf.readInt32LE(18),row=W*3,fw=768,fh=384,area=[];
for(let f=0;f<49;f++){
  const ox=(f%7)*fw,oy=Math.floor(f/7)*fh;let n=0;
  for(let y=40;y<fh;y++)for(let x=fw/2;x<fw;x++){const i=off+(oy+y)*row+(ox+x)*3,b=buf[i],g=buf[i+1],r=buf[i+2];if(r+g+b<=690&&r>150&&g>100&&r>b+50)n++;}
  area.push(n);
}
const smooth=area.map((_,i)=>{let s=0;for(let k=-2;k<=2;k++)s+=area[(i+k+49)%49];return s/5;});
const lo=Math.min(...smooth),hi=Math.max(...smooth),norm=smooth.map(v=>(v-lo)/(hi-lo));
const worst=Math.max(...norm.map((v,i)=>Math.abs(v-groundTruthSize[i])));
if(worst>.006){console.error(`FAIL: stored profile differs from measurement by up to ${worst.toFixed(3)}`);process.exit(1);}
console.log(`PASS: stored cycle profile matches all 49 measured frames (max difference ${worst.toFixed(3)}).`);
