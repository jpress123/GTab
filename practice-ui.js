/* Interval study controls share the exact frets used by sampled playback. */
let patternModel,patternBpm=100;
const patternRootByGenre={standard:4,rock:4,blues:9,jazz:10,neoclassical:4};
const patternRunner=new PracticePatterns.Runner({
  play(event,duration){event.notes.forEach((note,i)=>lickSynth.triggerAttackRelease(Tone.Frequency(note.midi,'midi').toNote(),duration*.86,Tone.now()+.025+i*.007,.76));},
  onStep(index,repeat,total){
    document.querySelectorAll('#pattern-panel [data-event]').forEach(n=>n.classList.toggle('current',+n.dataset.event===index));
    document.querySelectorAll('#pattern-panel [data-pattern-events]').forEach(n=>n.classList.toggle('current',n.dataset.patternEvents.split(',').includes(String(index))));
    el('pattern-status').textContent=`Repetition ${repeat} of ${total} · note ${index+1} of ${patternModel.events.length}`;
    document.querySelectorAll('#pattern-tab .current').forEach(n=>{const passage=n.closest('.tab-passage');const x=n.getBoundingClientRect().left-passage.getBoundingClientRect().left;if(x<35||x>passage.clientWidth-60)passage.scrollLeft+=x-60;});
    const active=document.querySelector('#pattern-sequence .current');if(active)el('pattern-sequence').scrollLeft=active.offsetLeft-el('pattern-sequence').offsetLeft-60;
  },
  onFinish(){stopPatternPractice();el('pattern-status').textContent='Practice complete';}
});
window.stopPatternPractice=function(){
  patternRunner.stop();if(!el('pattern-start'))return;
  el('pattern-start').disabled=false;el('pattern-repeats').disabled=false;
  el('pattern-status').textContent='Ready to practice';
  document.querySelectorAll('#pattern-panel .current').forEach(n=>n.classList.remove('current'));
};
function updatePatternSpeed(){
  const speed=+el('pattern-speed').value;patternRunner.setSpeed(speed);
  el('pattern-speed-value').textContent=`${speed}% · ${Math.round(patternBpm*speed/100)} BPM`;
}
function renderPattern(){
  const root=+el('pattern-root').value;
  el('pattern-neck').innerHTML=PracticePatterns.board(patternModel,root);
  el('pattern-sequence').innerHTML=PracticePatterns.sequence(patternModel,root);
  el('pattern-tab').innerHTML=PracticePatterns.tabs(patternModel,root);
  updatePatternSpeed();
}
function setPattern(name,tab,bpm){
  stopLicks();patternModel=PracticePatterns.parse(tab);patternBpm=bpm;
  el('pattern-title').textContent=name;el('pattern-root').value=patternRootByGenre[S.genre]??4;renderPattern();
}
window.loadStudyPattern=function(){if(!el('pattern-panel'))return;const study=TAB_DATA[S.genre]||TAB_DATA.standard;setPattern(study.label,study.tab,{blues:90,jazz:110,neoclassical:140,rock:120,standard:100}[S.genre]||100);};
window.selectLickPattern=function(lick){setPattern(lick.name,lick.tab,lick.bpm);el('pattern-panel').scrollIntoView({block:'start',behavior:'smooth'});};
window.startPatternPractice=async function(){
  stopLicks();const request=lickRun;audioTrack.pause();stopMetronome();
  el('pattern-start').disabled=true;el('pattern-status').textContent='Loading guitar…';
  try{
    await ensureTone();if(request!==lickRun)return;
    if(lickSynth)lickSynth.dispose();lickSynth=StudioSound.voice('guitar');
    el('pattern-repeats').value=Math.max(1,Math.min(32,Math.floor(+el('pattern-repeats').value)||1));
    el('pattern-repeats').disabled=true;
    patternRunner.start(patternModel.events,{bpm:patternBpm,speed:+el('pattern-speed').value,repetitions:+el('pattern-repeats').value});
  }catch(error){stopLicks();el('pattern-status').textContent=error.message;}
};
document.addEventListener('DOMContentLoaded',()=>{
  const panel=document.createElement('section');panel.className='panel pattern-panel';panel.id='pattern-panel';
  panel.innerHTML=`<div class="pattern-heading"><div><div class="panel-title">Interval practice</div><h2 id="pattern-title"></h2></div><button class="bak-btn small red" id="pattern-study">Full study</button></div>
  <p class="notation-help">Follow the same colors across the neck and tab. 1 is the root; arrows show the interval between successive notes. Select any lick’s “View pattern” to study it here.</p>
  <div class="pattern-controls"><label>Root <select class="retro-select" id="pattern-root" aria-label="Interval root">${['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'].map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label class="pattern-speed-label">Speed <output id="pattern-speed-value"></output><input id="pattern-speed" aria-label="Practice speed" type="range" min="25" max="200" step="5" value="100"></label><label>Repetitions <input id="pattern-repeats" aria-label="Practice repetitions" type="number" min="1" max="32" step="1" value="3"></label></div>
  <div class="pattern-transport"><button class="bak-btn" id="pattern-start">▶ Start practice</button><button class="bak-btn red" id="pattern-stop">■ Stop</button><span id="pattern-status" role="status">Ready to practice</span></div>
  <div class="pattern-scroll" id="pattern-neck" tabindex="0" aria-label="Scrollable interval fretboard"></div><div class="pattern-sequence" id="pattern-sequence" tabindex="0" aria-label="Ordered note intervals"></div><div id="pattern-tab"></div>
  <p class="notation-help">Tab: large numbers = frets · small labels = intervals from the root. Playback uses even eighth notes; bends, slides and ornaments are approximated as separate notes. Speed changes timing, keeping pitch unchanged.</p>`;
  el('tab-view').after(panel);
  el('pattern-root').onchange=()=>{stopLicks();renderPattern();};el('pattern-speed').oninput=updatePatternSpeed;
  el('pattern-start').onclick=startPatternPractice;el('pattern-stop').onclick=stopLicks;el('pattern-study').onclick=loadStudyPattern;
  loadStudyPattern();
});
