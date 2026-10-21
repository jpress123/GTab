const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const window={};vm.runInNewContext(fs.readFileSync('guitar-notation.js','utf8'),{window});const g=window.GuitarNotation;
test('reference D fingering and sounded pitches agree',()=>{assert.deepEqual(Array.from(g.shape('D').frets),[-1,-1,0,2,3,2]);assert.deepEqual(Array.from(g.shape('D').fingers),[0,0,0,1,3,2]);assert.deepEqual(Array.from(g.midi('D')),[50,57,62,66]);});
test('all generated progression shapes contain exactly the correct triad tones',()=>{
 const roots=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
 const qualities={'':[0,4,7],m:[0,3,7],dim:[0,3,6],aug:[0,4,8]};
 roots.forEach((root,r)=>Object.entries(qualities).forEach(([q,intervals])=>{
  const expected=intervals.map(x=>(r+x)%12).sort((a,b)=>a-b),actual=[...new Set(g.midi(root+q).map(x=>x%12))].sort((a,b)=>a-b);
  assert.deepEqual(actual,expected,root+q);
 }));
});
test('diagram and tablature escape labels, retain multi-digit frets and techniques',()=>{
 assert.ok(g.diagram('D').includes('E string muted'));
 const tab=g.tabs(['e|--12b14--5h7p5--|','B|----------------|']);
 assert.ok(tab.includes('>12</text>'));assert.ok(tab.includes('>b</text>'));assert.ok(tab.includes('>h</text>'));
 assert.ok(!g.card('<img src=x>').includes('<img'));assert.ok(g.card('<img src=x>').includes('&lt;img'));
});
