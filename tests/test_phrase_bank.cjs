const test=require('node:test'),assert=require('node:assert/strict');
require('../phrase-bank.js');require('../weekly-path.js');
test('each style has fifty distinct performed studies',()=>{
  for(const style of ['Triads','Blues','Harris']){
    const studies=PhraseBank.phrases.filter(p=>p.style===style);
    const lines=studies.map(p=>AmbientLessonModel.melody('lyrical',0,{phraseId:p.id}).map(n=>n.midi).join());
    assert.equal(studies.length,50);assert.equal(new Set(lines).size,50);
  }
});
test('all reaches, keys and registers sound the displayed pitches',()=>{
  const strings={e:64,B:59,G:55,D:50,A:45,E:40};
  for(const width of [3,4,5])for(const position of [1,4,7])for(let key=0;key<12;key++){
    const cfg={phraseId:'harris-33',position,width,key,preset:'sevenths',octaves:2};
    for(const e of AmbientLessonModel.events('pickup',0,false,cfg,1).filter(e=>e.note)){
      assert.equal(e.note.midi,strings[e.note.string]+e.note.fret);
      assert.ok(e.note.fret>=position+12&&e.note.fret<position+width+12);
    }
  }
});
test('response pairs replay the same harmony and melody, including an odd final bar',()=>{
  const events=AmbientLessonModel.events('quarters',0,true,{phraseId:'blues-12',preset:'sevenths'});
  const turns=PhraseBank.turns(events,true);
  assert.equal(turns.filter(e=>e.countIn).length,8);
  assert.deepEqual(turns.filter(e=>e.turn==='Listen').map(e=>e.step),turns.filter(e=>e.turn==='Answer').map(e=>e.step));
  assert.equal(turns.length,56);
});
test('CAGED positions follow the key and cycle without producing out-of-range tab',()=>{
 const cfg={key:9,shape:'E',octaves:3,phraseId:'enclosures-1',passing:true};
 assert.equal(AmbientLessonModel.settings(cfg).position,5);
 for(const [register,base] of [5,0,7].entries()){
   const notes=AmbientLessonModel.events('quarters',0,false,cfg,register).filter(e=>e.note);
   assert.ok(notes.every(e=>e.note.fret>=base&&e.note.fret<=base+4));
 }
 assert.ok(AmbientLessonModel.melody('quarters',0,cfg).length>AmbientLessonModel.melody('quarters',0,{...cfg,passing:false}).length);
});
