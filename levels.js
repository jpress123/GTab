/* Three improvisation vocabularies; CAGED is assumed knowledge, not a gate. */
(function(root){
const levels=[
 {name:'Triad improvisation · major & minor',types:['triads'],goal:'Make three chord tones sing: hear a short phrase, leave space, and connect to the next chord.',task:'Use major and minor triads inside one CAGED area. Sing a two- or three-note idea before playing. Repeat its rhythm over the next chord, changing only the ending. Add a second area when the first feels musical.'},
 {name:'Pentatonic improvisation · major & minor',types:['pentatonic'],goal:'Develop a memorable motif with major or minor pentatonic notes, rather than running the box.',task:'Keep the same progression and CAGED area. Sing a question, answer it on guitar, then vary its rhythm. Use a slide, bend or vibrato intentionally; leave enough silence to hear the chord changes.'},
 {name:'Scale improvisation · major & minor',types:['scales'],goal:'Connect chord-tone destinations with singable major and minor scale phrases.',task:'Choose the destination before the run. Use short scale fragments between chord tones; vary where the phrase begins and ends. Hear the raised seventh over a minor-key dominant. Keep one motif recognizable.'}
].map(l=>({...l,tempo:75,key:9,preset:'minor',shape:0,mode:'response'}));
function get(n){return levels[Math.max(0,Math.min(2,Math.floor(Number(n)||1)-1))];}
let selected=1;try{selected=Math.max(1,Math.min(3,Number(localStorage.getItem('gtab-improv-level'))||1));}catch{}
root.PracticeLevels={levels,get,get selected(){return selected;},set(n){selected=Math.max(1,Math.min(3,Math.floor(Number(n)||1)));try{localStorage.setItem('gtab-improv-level',selected);}catch{}root.applyPracticeLevel?.(selected);}};
})(typeof window==='undefined'?globalThis:window);
