// Shared cardiac-cycle timing for the 4D heart, the Time2Track panel and the
// sample ECG. The profile is the projected size of the Time2Track ground-truth
// mesh (Subject A) in each of its 49 frames: yellow-pixel area, 5-frame
// circular moving average, scaled so 1 = fullest and 0 = smallest.
// The source GIF has no frame durations, so frames are assumed evenly spaced
// over one cycle. Projected area is a size proxy, not a measured volume.
export const groundTruthSize=[
  .98,1,1,.96,.91,.86,.79,.72,.64,.57,.46,.34,.27,.2,.13,.1,.11,.08,.05,.03,.04,.01,0,0,0,
  .03,.06,.12,.18,.26,.32,.38,.42,.47,.49,.54,.6,.67,.69,.77,.8,.84,.87,.92,.94,.95,.94,.96,.97
];
export const FRAMES=groundTruthSize.length;
// Landmarks as cycle phases (frame index / 49): contraction starts after
// frame 3, the size stays near its minimum (< 10%) from frame 16 to frame 27.
export const CYCLE={contractionStart:3/49,contractedStart:15/49,relaxationStart:26/49};

// Size at any phase in [0, 1), linearly interpolated and periodic.
export function cycleSize(phase){
  const x=(((phase%1)+1)%1)*FRAMES,i=Math.floor(x),f=x-i;
  return groundTruthSize[i%FRAMES]*(1-f)+groundTruthSize[(i+1)%FRAMES]*f;
}
export const phaseToFrame=phase=>Math.min(FRAMES-1,Math.floor((((phase%1)+1)%1)*FRAMES));
