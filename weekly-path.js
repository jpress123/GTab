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
function evidence(history,index){const sessions=[...new Map(history.filter(s=>s.curriculum==='bridges-v2'&&s.weekMission===index&&s.completed&&s.seconds>=(s.targetSeconds===3600?3600:1800)).map(s=>[s.id,s])).values()];return {sessions,ready:sessions.length>=3&&sessions.some(s=>s.sessionKind==='morning')&&sessions.some(s=>s.sessionKind==='evening'),passed:sessions.some(s=>s.bridgePassed===true)};}
function unlocked(history){let i=0;while(i<23){const e=evidence(history,i);if(!e.ready||!e.passed)break;i++;}return i;}
function xp(history){const complete=[...new Map(history.filter(s=>s.curriculum==='bridges-v2'&&s.completed&&s.seconds>=(s.targetSeconds===3600?3600:1800)).map(s=>[s.id,s])).values()];return complete.length*100+Array.from({length:24},(_,i)=>evidence(history,i)).filter(e=>e.ready&&e.passed).length*200;}
function bridgeDemo(){
 const notes=[{string:'B',fret:5,midi:64},{string:'G',fret:5,midi:60},{string:'D',fret:7,midi:57},{string:'e',fret:5,midi:69},{string:'D',fret:10,midi:60}];
 const events=[];
 for(const phase of ['listen','sing','play']){
  for(let step=0;step<8;step++)events.push({phase,chord:'Am',step,note:notes[[4,0,3,0,3,0,1,2][step]],rest:[1,5].includes(step)});
  for(let step=0;step<8;step++)events.push({phase,chord:'F',step,note:notes[2],rest:step!==0});
 }
 return {notes,events,target:notes[2]};
}
function dayPreview(m,day){
 const type=['triads','arpeggios','pentatonic','pentatonic','scales','scales','scales'][day];
 if(!type)throw Error('Invalid practice day');
 const plan=RoutineModel.build(m.key,m.preset,[type],1,{caged:m.caged,mode:'together',phrasing:true});
 // Repeat the first landing so the final anticipation audibly resolves.
 plan.events.push({...plan.events[0],finalLanding:true});
 return {...plan,type,day};
}
root.WeeklyModel={mission,evidence,unlocked,xp,bridgeDemo,dayPreview};
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
// Audio remains in this browser's IndexedDB; JSON practice backups exclude recordings.
let closeWeeklyTake=()=>{};
function mountWeeklyHabits(host,m){
 closeWeeklyTake();
 const type='triads';
 const g=RoutineModel.build(m.key,m.preset,[type],1,{caged:m.caged,phrasing:true}).groups[0];
 const phrase=g.model.events.filter((e,i)=>![1,5].includes(i)).map(e=>PracticePatterns.noteName(e.notes[0].midi).replace(/\d/g,'')).join(' → ');
 const box=document.createElement('details');box.className='weekly-habits';
 box.innerHTML=`<summary>This week’s phrase & recording</summary><p><strong>${phrase}</strong> → ${g.destination.chord}</p><p class="notation-help">One melodic idea all week. Sing → play → breathe. Add each day’s vocabulary; keep the rhythm and destination.</p><div class="pattern-scroll">${PracticePatterns.tabs(g.model,g.chord.pc,'both')}</div><p class="notation-help">Friday: record 30 seconds at ${m.tempo} BPM. Sing once, then play your phrase into the changes. Use the same tempo next time.</p><button class="bak-btn" data-take-start>Record 30 seconds</button> <button class="bak-btn red" data-take-stop disabled>Stop & save</button><p data-take-status role="status">Microphone audio stays in this browser. Download to keep a separate copy; practice backups exclude audio.</p><div data-take-list></div>`;
 host.append(box);
 box.querySelectorAll('[data-event="1"],[data-event="5"]').forEach(n=>{n.style.opacity='.25';n.setAttribute('aria-label','Rest');});
 const start=box.querySelector('[data-take-start]'),stop=box.querySelector('[data-take-stop]'),status=box.querySelector('[data-take-status]'),list=box.querySelector('[data-take-list]');
 let recorder,stream,timer,ticker,pending=false,disposed=false,generation=0,urls=[];
 const db=new Promise((resolve,reject)=>{const req=indexedDB.open('gtab-weekly-audio',1);req.onupgradeneeded=()=>req.result.createObjectStore('takes',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const read=async()=>{const d=await db;return new Promise((resolve,reject)=>{const r=d.transaction('takes').objectStore('takes').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});};
 const save=async take=>{const d=await db;return new Promise((resolve,reject)=>{const t=d.transaction('takes','readwrite');t.objectStore('takes').put(take);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});};
 function show(take,label){const url=URL.createObjectURL(take.blob);urls.push(url);const row=document.createElement('div'),title=document.createElement('p'),audio=document.createElement('audio'),link=document.createElement('a');title.textContent=label+' · '+new Date(take.at).toLocaleDateString()+' · '+take.tempo+' BPM';audio.controls=true;audio.src=url;audio.preload='metadata';audio.setAttribute('aria-label',label);link.href=url;link.download='GTab-week-'+(take.week+1)+'-'+take.at+(take.blob.type.includes('mp4')?'.m4a':'.webm');link.textContent='Download take';row.append(title,audio,link);list.append(row);}
 async function render(){const all=await read();if(disposed)return;urls.forEach(URL.revokeObjectURL);urls=[];list.replaceChildren();const current=all.filter(t=>t.week===m.index).sort((a,b)=>a.at-b.at);if(current.length)show(current[0],'First take this week');if(current.length>1)show(current.at(-1),'Latest take this week');const prev=all.filter(t=>t.week<m.index).sort((a,b)=>a.at-b.at).at(-1);if(prev)show(prev,'Previous week · different progression');}
 function release(){clearTimeout(timer);clearInterval(ticker);stream?.getTracks().forEach(t=>t.stop());stream=null;}
 function finish(){generation++;if(recorder?.state==='recording'){recorder.stop();release();stop.disabled=true;status.textContent='Saving your take…';}}
 closeWeeklyTake=()=>{disposed=true;finish();release();urls.forEach(URL.revokeObjectURL);};
 root.stopWeeklyRecording=finish;
 stop.onclick=finish;
 start.onclick=async()=>{
  if(pending||recorder?.state==='recording')return;
  if(root.DailyPractice?.active){status.textContent='Finish your session first, then record your weekly take.';return;}
  if(!navigator.mediaDevices?.getUserMedia||!root.MediaRecorder){status.textContent='Recording needs a supported browser on HTTPS or localhost.';return;}
  pending=true;const attempt=++generation;start.disabled=true;status.textContent='Allow microphone access to record your take.';
  try{await db;root.stopRoutine?.();root.stopLicks?.();root.stopProgression?.();root.PlayingCoach?.close();stream=await navigator.mediaDevices.getUserMedia({audio:true});if(disposed||attempt!==generation){release();start.disabled=false;status.textContent='Recording cancelled.';return;}
   const chunks=[],mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{release();const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});try{if(!blob.size)throw Error('No audio captured');await save({id:crypto.randomUUID(),at:Date.now(),week:m.index,tempo:m.tempo,blob});status.textContent='Saved. Listen for the arrival, rhythm and breathing space.';await render();}catch(e){status.textContent='Could not save in this browser. Download this take now.';if(blob.size&&!disposed)show({blob,at:Date.now(),week:m.index,tempo:m.tempo},'Unsaved take');}finally{start.disabled=false;}};
   recorder.onerror=()=>{finish();release();status.textContent='Recording interrupted. Check microphone access and try again.';};recorder.start();stop.disabled=false;let seconds=0;status.textContent='Recording · 0 / 30 seconds · sing, then play';ticker=setInterval(()=>{seconds++;status.textContent='Recording · '+seconds+' / 30 seconds · sing, then play';},1000);timer=setTimeout(finish,30000);
  }catch(e){release();start.disabled=false;status.textContent='Could not start recording. Check microphone permission and browser storage, then retry.';}finally{pending=false;}
 };
 render().catch(()=>{status.textContent='Browser storage unavailable. Enable site storage to save recordings.';});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)root.stopWeeklyRecording?.();});
document.addEventListener('click',e=>{if(!e.target.closest('.weekly-habits')&&e.target.closest('button,a'))root.stopWeeklyRecording?.();},true);
let stopDayPreview=()=>{};
function mountDayPreview(host,m){
 stopDayPreview();
 const panel=document.createElement('section');panel.id='day-preview';panel.className='day-preview';panel.hidden=true;
 panel.innerHTML='<h3 data-preview-title></h3><p data-preview-plan class="notation-help"></p><div data-preview-road class="chord-road"></div><p data-preview-cue role="status"></p><div data-preview-board class="pattern-scroll demo-neck"></div><p class="notation-help">Gold ring = next chord’s target. Same rhythm and breathing spaces; new melodic colours.</p><button class="bak-btn" data-preview-play>Hear phrase · 45 BPM</button> <button class="bak-btn red" data-preview-stop disabled>Stop</button> <button class="bak-btn small" data-preview-close>Close preview</button>';
 host.querySelector('.week-schedule').after(panel);
 const play=panel.querySelector('[data-preview-play]'),stop=panel.querySelector('[data-preview-stop]'),cue=panel.querySelector('[data-preview-cue]'),board=panel.querySelector('[data-preview-board]');
 let plan,voice,token=0,active;
 function draw(group){active=group;board.innerHTML=PracticePatterns.board(group.model,group.chord.pc);board.querySelectorAll('[data-pattern-events]').forEach(n=>{if(n.dataset.patternEvents.split(',').includes('7'))n.classList.add('demo-target');});}
 const runner=new PracticePatterns.Runner({play(e,d){if(!panel.isConnected){stopDayPreview();return;}if(active!==e.group)draw(e.group);if(e.step===0){const chord=GuitarNotation.midi(e.group.chord.name);(chord.length?chord:e.group.chord.tones.map(pc=>48+pc)).forEach((n,i)=>voice.triggerAttackRelease(Tone.Frequency(n,'midi').toNote(),e.finalLanding?d*2:d*7,Tone.now()+i*.012,.24));}if(!e.rest)voice.triggerAttackRelease(Tone.Frequency(e.notes[0].midi,'midi').toNote(),d*.85,Tone.now()+.025,.85);},onStep(i){const e=plan.events[i];cue.textContent=e.group.chord.name+' → '+e.group.destination.chord+' · aim for '+PracticePatterns.noteName(e.group.destination.note.midi)+(e.finalLanding?' · home again':e.step===7?' · anticipate now':e.step===0?' · land on beat 1':' · sing the destination');board.querySelectorAll('[data-pattern-events]').forEach(n=>n.classList.toggle('current',!e.rest&&n.dataset.patternEvents.split(',').includes(String(e.step))));},onFinish(){stopDayPreview();cue.textContent='Complete · sing that ending, then try another day to hear the change.';}});
 stopDayPreview=()=>{token++;runner.stop();voice?.dispose();voice=null;play.disabled=false;stop.disabled=true;board.querySelectorAll('.current').forEach(n=>n.classList.remove('current'));};
 host.querySelectorAll('[data-preview-day]').forEach(button=>button.onclick=()=>{stopDayPreview();const day=+button.dataset.previewDay;plan=dayPreview(m,day);panel.hidden=false;host.querySelectorAll('[data-preview-day]').forEach(b=>b.setAttribute('aria-expanded',String(b===button)));panel.querySelector('[data-preview-title]').textContent=['Saturday · Triads','Sunday · Seventh arpeggios','Monday · Pentatonics','Tuesday · Pentatonics','Wednesday · Scales','Thursday · Scales','Friday · Scales'][day];panel.querySelector('[data-preview-plan]').textContent=(day===0?'60 min morning + 60 min evening · explore all five CAGED areas.':'30 min morning + 30 min evening.')+' Preview: '+m.caged+' area, one progression loop. '+['Keep the three chord tones clear.','Add seventh colour to the same rhythmic idea.','Use pentatonic colours around the landing.','Keep the notes; sing a new rhythm in your practice.','Connect the target with scale movement.','Keep the phrase short and vary its ending.','Make it sing; finish with your weekly recording.'][day];panel.querySelector('[data-preview-road]').textContent=plan.chords.map(c=>c.name).join(' → ');cue.textContent='Preview only · no practice time or rewards recorded.';draw(plan.groups[0]);});
 play.onclick=async()=>{if(root.DailyPractice?.active){cue.textContent='Finish your saved practice session before listening to a preview.';return;}stopDayPreview();root.stopLicks?.();root.stopRoutine?.();root.stopProgression?.();root.stopMetronome?.();if(typeof audioTrack!=='undefined')audioTrack.pause();const id=++token;play.disabled=true;stop.disabled=false;cue.textContent='Loading guitar…';try{await ensureTone();if(id!==token)return;voice=StudioSound.voice('guitar');active=null;runner.start(plan.events,{bpm:45});}catch(e){stopDayPreview();cue.textContent='Could not start audio. Tap to retry.';}};
 stop.onclick=()=>{stopDayPreview();cue.textContent='Stopped · ready to hear again.';};
 panel.querySelector('[data-preview-close]').onclick=()=>{stopDayPreview();panel.hidden=true;host.querySelectorAll('[data-preview-day]').forEach(b=>b.setAttribute('aria-expanded','false'));};
}
document.addEventListener('click',e=>{if(!e.target.closest('.day-preview')&&e.target.closest('button,a'))stopDayPreview();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDayPreview();});
let chosen=null,started=null;try{const p=JSON.parse(localStorage.getItem('gtab-weekly-path'));if(p&&Number.isInteger(p.index)&&p.index>=0&&p.index<24&&Number.isFinite(new Date(p.start).getTime())){chosen=p.index;started=p.start;if(p.calendar!=='sat-2026-10-24'){const d=new Date(p.start+'T12:00:00');d.setDate(d.getDate()+(6-d.getDay()+7)%7);started=d<new Date(2026,9,24)?'2026-10-24':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}}}catch{}
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function history(){return root.PracticeHistory?.sessions||[];}
function current(){const rows=history();if(chosen===null)chosen=Math.min(unlocked(rows),Math.max(0,...rows.filter(s=>s.curriculum==='bridges-v2').map(s=>s.weekMission||0)));chosen=Math.min(chosen,unlocked(rows));if(!started){const d=new Date();const anchor=new Date(2026,9,24);const elapsed=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,9,24))/86400000);anchor.setDate(anchor.getDate()+Math.max(0,Math.floor(elapsed/7))*7);started=dateKey(anchor);}return mission(chosen);}
function persist(){try{localStorage.setItem('gtab-weekly-path',JSON.stringify({index:chosen,start:started,calendar:'sat-2026-10-24'}));}catch{}}
function nextDate(){current();const d=new Date(started+'T12:00:00');d.setDate(d.getDate()+7);return d;}
function refresh(){root.PracticeHistory?.refresh();}
root.WeeklyPractice={current,get start(){current();return started;},mount(host){const m=current(),rows=history(),e=evidence(rows,m.index),end=new Date(started+'T12:00:00');end.setDate(end.getDate()+6);const start=new Date(started+'T12:00:00');const next=nextDate();const canAdvance=e.ready&&e.passed&&dateKey(new Date())>=dateKey(next)&&m.index<23;
 const road=m.level===2?RoutineModel.build(m.key,m.preset,['arpeggios'],1).chords.map(c=>c.name):m.chords;const cue=m.level===2?'Sing the next third or seventh. Small steps, clear arrivals.':m.cue;const node=document.createElement('section');node.className='weekly-map';node.innerHTML=`<div class="weekly-heading"><div><span class="eyebrow">WEEK ${m.index+1} · ${start.toLocaleDateString(undefined,{month:'short',day:'numeric'})}–${end.toLocaleDateString(undefined,{month:'short',day:'numeric'})} · NEW WEEK EACH SATURDAY</span><h1>Play into the next chord.</h1></div><span class="xp-medal" aria-label="${xp(rows)} experience points">★ ${xp(rows)} XP</span></div><ol class="week-schedule">${['Sat','Sun','Mon','Tue','Wed','Thu','Fri'].map((day,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return `<li class="${dateKey(d)===dateKey(new Date())?'active':''}"><button type="button" data-preview-day="${i}" aria-expanded="false" aria-controls="day-preview"><strong>${day} ${d.getDate()}</strong><span>${['Triads','Arpeggios','Pentatonic','Pentatonic','Scales','Scales','Scales'][i]}</span><small>${i===0?'60 + 60 min':'30 + 30 min'}</small></button></li>`;}).join('')}</ol><div class="weekly-mission"><span class="eyebrow">${m.caged} AREA · ${m.tempo} BPM</span><h2>${m.name}</h2><div class="chord-road">${road.map((c,i)=>`<span>${c}</span>${i<road.length-1?'<b aria-hidden="true">→</b>':''}`).join('')}</div><p>${cue}</p><div class="week-progress" aria-label="${e.sessions.length} of 3 sessions completed">${[0,1,2].map(i=>`<span class="${i<e.sessions.length?'earned':''}">${i<e.sessions.length?'✓':'○'}</span>`).join('')}<small>${Math.min(3,e.sessions.length)}/3 sessions · morning + evening</small></div><button class="bak-btn small" id="weekly-check" ${e.ready&&!e.passed?'':'disabled'}>${e.passed?'★ Bridge badge earned':'Claim bridge badge'}</button>${e.passed?`<button class="bak-btn small" id="weekly-next" ${canAdvance?'':'disabled'}>${m.index===23?'Path complete':canAdvance?'Start next week →':'Next opens '+next.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</button>`:''}<div id="weekly-assessment" hidden><p>Self-check: in three consecutive loops, I…</p><label><input type="checkbox" id="bridge-sing"> sang the destination before the change</label><label><input type="checkbox" id="bridge-land"> anticipated it, then landed on beat 1</label><label><input type="checkbox" id="bridge-space"> repeated a motif and left breathing space</label><button class="bak-btn small" id="bridge-claim">Confirm my successful take</button><p id="bridge-result" role="status">Self-assessed skill badge · not a microphone grade.</p></div></div>`;host.append(node);mountDayPreview(node,m);mountDemo(node);mountWeeklyHabits(node,m);
 document.getElementById('weekly-check').onclick=()=>document.getElementById('weekly-assessment').hidden=false;
 document.getElementById('bridge-claim').onclick=()=>{if(!['bridge-sing','bridge-land','bridge-space'].every(id=>document.getElementById(id).checked)){document.getElementById('bridge-result').textContent='Keep practising until all three feel secure. Your session rewards stay earned.';return;}const fresh=evidence(history(),m.index);if(!fresh.ready||fresh.passed)return;root.PracticeHistory.passBridge(fresh.sessions.at(-1).id);};
 if(document.getElementById('weekly-next'))document.getElementById('weekly-next').onclick=()=>{if(!canAdvance||root.DailyPractice?.active)return;chosen++;const d=new Date();d.setDate(d.getDate()-(d.getDay()+1)%7);started=dateKey(d);persist();refresh();};persist();
 }};
})(typeof window==='undefined'?globalThis:window);
