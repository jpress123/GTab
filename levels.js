/* Four musical vocabularies, all directed into the next chord. */
(function(root){
const levels=[
 {name:'Triads',types:['triads'],goal:'Aim a three-note phrase into the next chord.',task:'Sing the next third. Approach it with a nearby triad tone, anticipate it on the last upbeat, then hold it through the change.'},
 {name:'Seventh arpeggios',types:['arpeggios'],goal:'Connect thirds and sevenths across the changes.',task:'Hear the seventh as part of the chord. Use small melodic steps into the next third or seventh; keep a recognizable rhythm.'},
 {name:'Pentatonic',types:['pentatonic'],goal:'Use the box to travel toward a destination.',task:'Build a short pentatonic motif. Leave space, then aim at the next chord tone. The destination may sit outside the pentatonic box.'},
 {name:'Scales',types:['scales'],goal:'Turn scale fragments into sentences that resolve.',task:'Choose the next chord tone before playing. Approach from above or below, anticipate the change and land. Sing the phrase first.'}
].map(l=>({...l,tempo:70,key:9,preset:'minor',shape:0,mode:'response'}));
function get(n){return levels[Math.max(0,Math.min(3,Math.floor(Number(n)||1)-1))];}
let selected=1;try{selected=Math.max(1,Math.min(4,Number(localStorage.getItem('gtab-bridge-level'))||1));}catch{}
root.PracticeLevels={levels,get,get selected(){return selected;},set(n){selected=Math.max(1,Math.min(4,Math.floor(Number(n)||1)));try{localStorage.setItem('gtab-bridge-level',selected);}catch{}root.applyPracticeLevel?.(selected);}};
})(typeof window==='undefined'?globalThis:window);
