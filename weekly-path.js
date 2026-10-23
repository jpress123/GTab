/* Weekly, evidence-labelled progression path. Rewards never imply measured musicianship. */
(function(root){
const ladder=[
 {preset:'minor',family:'rock',key:9,chords:['Am','F','C','G'],name:'Hear the next third',cue:'Sing C → A → E → B before each chord arrives.'},
 {preset:'classic',family:'other',key:0,chords:['C','F','G','C'],name:'Keep the motif, change the ending',cue:'One rhythm. A new destination at each change.'},
 {preset:'blues',family:'rock',key:9,chords:['A7','D7','A7','E7','D7','A7'],name:'Hear the 12-bar turn',cue:'Save your answer for the IV chord and turnaround.'},
 {preset:'andalusian',family:'andalusian',key:9,chords:['Am','G','F','E'],name:'Anticipate the dominant',cue:'Hear G♯ arriving over E, then resolve to A.'},
 {preset:'neoclassical',family:'neoclassical',key:9,chords:['Am','Dm','E','Am'],name:'Build tension, release it',cue:'Short sequence → dominant tension → tonic landing.'},
 {preset:'sevenths',family:'jazz',key:0,chords:['Dm7','G7','Cmaj7'],name:'Connect the ii–V–I',cue:'Hear the guide tones pull toward the next chord.'}
];
const forms=['E','D','C','A','G','E'];
function mission(index){index=Math.max(0,Math.min(23,Number(index)||0));return {...ladder[index%6],index,level:Math.floor(index/6)+1,caged:forms[index%6],tempo:65+(index%6)*5};}
function evidence(history,index){const sessions=[...new Map(history.filter(s=>s.curriculum==='bridges-v2'&&s.weekMission===index&&s.completed&&s.seconds>=1800).map(s=>[s.id,s])).values()];return {sessions,ready:sessions.length>=3&&sessions.some(s=>s.sessionKind==='morning')&&sessions.some(s=>s.sessionKind==='evening'),passed:sessions.some(s=>s.bridgePassed===true)};}
function unlocked(history){let i=0;while(i<23){const e=evidence(history,i);if(!e.ready||!e.passed)break;i++;}return i;}
function xp(history){const complete=[...new Map(history.filter(s=>s.curriculum==='bridges-v2'&&s.completed&&s.seconds>=1800).map(s=>[s.id,s])).values()];return complete.length*100+Array.from({length:24},(_,i)=>evidence(history,i)).filter(e=>e.ready&&e.passed).length*200;}
function bridgeDemo(){
 const notes=[{string:'G',fret:9,midi:64},{string:'G',fret:5,midi:60},{string:'D',fret:7,midi:57}];
 const events=[];
 for(const phase of ['listen','sing','play']){
  for(let step=0;step<8;step++)events.push({phase,chord:'Am',step,note:notes[step===7?2:[2,6].includes(step)?1:0],rest:[1,3,5].includes(step)});
  for(let step=0;step<8;step++)events.push({phase,chord:'F',step,note:notes[2],rest:step!==0});
 }
 return {notes,events,target:notes[2]};
}
root.WeeklyModel={mission,evidence,unlocked,xp,bridgeDemo};
if(typeof document==='undefined')return;
let stopDemo=()=>{};
function mountDemo(host){
 stopDemo();
 const box=document.createElement('details');box.className='bridge-demo';
 box.innerHTML=`<summary>▶ Hear it: Am → F · sing, then play</summary><div class="demo-body"><p class="demo-route"><strong>Am</strong> → <strong>F</strong> <span>A = third of F</span></p><p id="demo-cue" role="status">Listen → sing → play · 45 BPM · 32 seconds</p><div class="pattern-scroll demo-neck"></div><div class="demo-beats">${['1','&','2','&','3','&','4','&'].map((b,i)=>`<span data-demo-beat="${i}">${b}</span>`).join('')}</div><p class="notation-help">Gold ring: sing A before F arrives. D string, fret 7. Land again on beat 1, then breathe.</p><button class="bak-btn" id="demo-start">Listen, sing & play</button> <button class="bak-btn red" id="demo-stop" disabled>Stop</button></div>`;
 host.append(box);
 const demo=bridgeDemo(),model={events:demo.notes.map((n,i)=>({index:i,notes:[n]}))};
 box.querySelector('.demo-neck').innerHTML=PracticePatterns.board(model,5);
 const target=box.querySelector('[data-pattern-events="2"]');target.classList.add('demo-target');target.querySelector('title').textContent='Target A: third of F. D string, fret 7. Sing before the chord changes.';
 const start=box.querySelector('#demo-start'),stop=box.querySelector('#demo-stop'),cue=box.querySelector('#demo-cue');
 let voice,request=0;
 const runner=new PracticePatterns.Runner({play(e,d){
  if(!box.isConnected){stopDemo();return;}
  if(e.step===0)(e.chord==='Am'?[45,52,57,60]:[41,48,53,57]).forEach((m,i)=>voice.triggerAttackRelease(Tone.Frequency(m,'midi').toNote(),d*7,Tone.now()+i*.012,.24));
  if(e.phase==='listen'&&!e.rest)voice.triggerAttackRelease(Tone.Frequency(e.note.midi,'midi').toNote(),d*(e.chord==='F'?3:.8),Tone.now()+.025,.85);
 },onStep(i){const e=demo.events[i];cue.textContent=({listen:'LISTEN · hear the melody',sing:'SING · your voice, guitar resting',play:'PLAY · repeat your sung phrase'})[e.phase]+' · '+e.chord+(e.chord==='F'?' · land on A, breathe':' · hear A coming');box.querySelectorAll('[data-demo-beat]').forEach(n=>n.classList.toggle('current',+n.dataset.demoBeat===e.step));box.querySelectorAll('[data-pattern-events]').forEach(n=>n.classList.toggle('current',!e.rest&&demo.notes[+n.dataset.patternEvents].midi===e.note.midi));},onFinish(){stopDemo();cue.textContent='Nice work. Repeat with the same notes and a new rhythm.';start.textContent='Repeat demo';}});
 stopDemo=()=>{request++;runner.stop();voice?.dispose();voice=null;start.disabled=false;stop.disabled=true;box.querySelectorAll('.current').forEach(n=>n.classList.remove('current'));};
 stop.onclick=()=>{stopDemo();cue.textContent='Stopped · ready when you are.';};
 start.onclick=async()=>{
  if(root.DailyPractice?.active){cue.textContent='Finish your current session before starting this short demo.';return;}
  root.stopLicks?.();root.stopProgression?.();root.stopRoutine?.();root.stopMetronome?.();if(typeof audioTrack!=='undefined')audioTrack.pause();
  stopDemo();const id=++request;start.disabled=true;stop.disabled=false;cue.textContent='Loading guitar…';
  try{await ensureTone();if(id!==request)return;voice=StudioSound.voice('guitar');runner.start(demo.events,{bpm:45});}catch(error){stopDemo();cue.textContent='Could not start audio. Tap to retry. '+error.message;}
 };
 box.addEventListener('toggle',()=>{if(!box.open)stopDemo();});
}
// Stop the example before another player or navigation can take over.
document.addEventListener('click',e=>{if(!e.target.closest('.bridge-demo')&&e.target.closest('button, a'))stopDemo();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDemo();});
let chosen=null,started=null;try{const p=JSON.parse(localStorage.getItem('gtab-weekly-path'));if(p&&Number.isInteger(p.index)&&p.index>=0&&p.index<24&&Number.isFinite(new Date(p.start).getTime())){chosen=p.index;started=p.start;}}catch{}
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function history(){return root.PracticeHistory?.sessions||[];}
function current(){const rows=history();if(chosen===null)chosen=Math.min(unlocked(rows),Math.max(0,...rows.filter(s=>s.curriculum==='bridges-v2').map(s=>s.weekMission||0)));chosen=Math.min(chosen,unlocked(rows));if(!started){const d=new Date();const anchor=new Date(2026,9,22);const elapsed=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,9,22))/86400000);anchor.setDate(anchor.getDate()+Math.max(0,Math.floor(elapsed/7))*7);started=dateKey(anchor);}return mission(chosen);}
function persist(){try{localStorage.setItem('gtab-weekly-path',JSON.stringify({index:chosen,start:started}));}catch{}}
function nextDate(){current();const d=new Date(started+'T12:00:00');d.setDate(d.getDate()+7);return d;}
function refresh(){root.PracticeHistory?.refresh();}
root.WeeklyPractice={current,get start(){current();return started;},mount(host){const m=current(),rows=history(),e=evidence(rows,m.index),end=new Date(started+'T12:00:00');end.setDate(end.getDate()+6);const start=new Date(started+'T12:00:00');const next=nextDate();const canAdvance=e.ready&&e.passed&&dateKey(new Date())>=dateKey(next)&&m.index<23;
 const road=m.level===2?RoutineModel.build(m.key,m.preset,['arpeggios'],1).chords.map(c=>c.name):m.chords;const cue=m.level===2?'Sing the next third or seventh. Small steps, clear arrivals.':m.cue;const node=document.createElement('section');node.className='weekly-map';node.innerHTML=`<div class="weekly-heading"><div><span class="eyebrow">WEEK ${m.index+1} · ${start.toLocaleDateString(undefined,{month:'short',day:'numeric'})}–${end.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><h1>Play into the next chord.</h1></div><span class="xp-medal" aria-label="${xp(rows)} experience points">★ ${xp(rows)} XP</span></div><ol class="level-path">${PracticeLevels.levels.map((l,i)=>`<li class="${i+1===m.level?'active':i+1<m.level?'earned':''}"><span>${i+1<m.level?'✓':i+1}</span>${l.name}${i+1>m.level?'<small>Locked</small>':''}</li>`).join('')}</ol><div class="weekly-mission"><span class="eyebrow">${m.caged} AREA · ${m.tempo} BPM</span><h2>${m.name}</h2><div class="chord-road">${road.map((c,i)=>`<span>${c}</span>${i<road.length-1?'<b aria-hidden="true">→</b>':''}`).join('')}</div><p>${cue}</p><div class="week-progress" aria-label="${e.sessions.length} of 3 sessions completed">${[0,1,2].map(i=>`<span class="${i<e.sessions.length?'earned':''}">${i<e.sessions.length?'✓':'○'}</span>`).join('')}<small>${Math.min(3,e.sessions.length)}/3 sessions · morning + evening</small></div><button class="bak-btn small" id="weekly-check" ${e.ready&&!e.passed?'':'disabled'}>${e.passed?'★ Bridge badge earned':'Claim bridge badge'}</button>${e.passed?`<button class="bak-btn small" id="weekly-next" ${canAdvance?'':'disabled'}>${m.index===23?'Path complete':canAdvance?'Start next week →':'Next opens '+next.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</button>`:''}<div id="weekly-assessment" hidden><p>Self-check: in three consecutive loops, I…</p><label><input type="checkbox" id="bridge-sing"> sang the destination before the change</label><label><input type="checkbox" id="bridge-land"> anticipated it, then landed on beat 1</label><label><input type="checkbox" id="bridge-space"> repeated a motif and left breathing space</label><button class="bak-btn small" id="bridge-claim">Confirm my successful take</button><p id="bridge-result" role="status">Self-assessed skill badge · not a microphone grade.</p></div></div>`;host.append(node);mountDemo(node);
 document.getElementById('weekly-check').onclick=()=>document.getElementById('weekly-assessment').hidden=false;
 document.getElementById('bridge-claim').onclick=()=>{if(!['bridge-sing','bridge-land','bridge-space'].every(id=>document.getElementById(id).checked)){document.getElementById('bridge-result').textContent='Keep practising until all three feel secure. Your session rewards stay earned.';return;}const fresh=evidence(history(),m.index);if(!fresh.ready||fresh.passed)return;root.PracticeHistory.passBridge(fresh.sessions.at(-1).id);};
 if(document.getElementById('weekly-next'))document.getElementById('weekly-next').onclick=()=>{if(!canAdvance||root.DailyPractice?.active)return;chosen++;started=dateKey(new Date());persist();refresh();};persist();
 }};
})(typeof window==='undefined'?globalThis:window);
