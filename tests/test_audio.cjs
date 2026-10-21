const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
class Context {
  constructor(){this.currentTime=10;this.destination={};this.created=[];}
  createDynamicsCompressor(){return {threshold:{},ratio:{},connect(){}};}
  createBufferSource(){const source={playbackRate:{},connect(){},start(time,offset){this.startTime=time;this.offset=offset;},stop(){this.stopped=true;},disconnect(){}};this.created.push(source);return source;}
  resume(){return Promise.resolve();}
  close(){this.closed=true;}
}
function mixer(){
  const window={AudioContext:Context};
  vm.runInNewContext(fs.readFileSync('stem-client.js','utf8'),{window});
  const m=new window.StemMixer();
  for(const name of ['guitar','bass','drums','vocals','piano','other']){
    m.buffers[name]={duration:20};
    m.gains[name]={gain:{setTargetAtTime(value){this.value=value;}}};
  }
  return m;
}
test('all six stems use exactly the same clock, offset, and playback rate',async()=>{
  const m=mixer();await m.start(3, .8);
  assert.equal(m.sources.length,6);
  assert.ok(m.sources.every(s=>s.startTime===10.025&&s.offset===3&&s.playbackRate.value===.8));
  const old=[...m.sources];await m.start(7,1);
  assert.ok(old.every(s=>s.stopped));assert.ok(m.sources.every(s=>s.offset===7));
});
test('other fader controls vocals/piano/other while guitar mute is isolated',()=>{
  const m=mixer();m.mix({guitar:.9,bass:.7,drums:.8,other:.4},{guitar:true});
  assert.equal(m.gains.guitar.gain.value,0);assert.equal(m.gains.bass.gain.value,.7);
  for(const key of ['vocals','piano','other'])assert.equal(m.gains[key].gain.value,.4);
});
test('stop during async audio resume prevents delayed playback',async()=>{
  const m=mixer();let resume;m.context.resume=()=>new Promise(resolve=>resume=resolve);
  const playing=m.start(0,1);m.stop();resume();await playing;
  assert.equal(m.sources.length,0);assert.equal(m.running,false);
});
test('dispose stops sources and releases the decoded buffers',async()=>{
  const m=mixer();await m.start(0,1);const sources=[...m.sources];m.dispose();
  assert.ok(sources.every(s=>s.stopped));assert.equal(Object.keys(m.buffers).length,0);assert.equal(m.context.closed,true);
});
