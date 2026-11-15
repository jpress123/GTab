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
function dayPreview(m,day,transition){
 const type=['triads','arpeggios','arpeggios','pentatonic','pentatonic','scales','scales'][day];
 if(!type)throw Error('Invalid practice day');
 const plan=RoutineModel.build(m.key,m.preset,[type],1,{caged:m.caged,mode:'together',phrasing:true,transition});
 // Repeat the first landing so the final anticipation audibly resolves.
 plan.events.push({...plan.events[0],finalLanding:true});
 return {...plan,type,day};
}
function previewPractice(m,day,transition){
 const plan=dayPreview(m,day,transition);
 const phrase=plan.events.slice(0,-1),landing=plan.events.at(-1);
 const passage=[...phrase,...Array.from({length:8},(_,step)=>({...landing,step,rest:step!==0,finalLanding:true}))];
 return {...plan,events:['listen','sing','play'].flatMap(phase=>passage.map(e=>({...e,phase})))};
}
root.WeeklyModel={mission,evidence,unlocked,xp,bridgeDemo,dayPreview,previewPractice};
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
 const type='triads',lessonTempo=m.index===0?45:m.tempo;
 const g=RoutineModel.build(m.key,m.preset,[type],1,{caged:m.caged,phrasing:true}).groups[0];
 const phrase=m.index===0?(root.AmbientLesson?.chords?.()||root.AmbientLessonModel.harmony()).map((c,i)=>c.name+': '+(root.AmbientLesson?.notes?.()||root.AmbientLessonModel.melody()).filter(n=>Math.floor(n.step/8)===i).map(n=>PracticePatterns.noteName(n.midi).replace(/\d/g,'')).join('–')).join(' · '):g.model.events.filter((e,i)=>![1,5].includes(i)).map(e=>PracticePatterns.noteName(e.notes[0].midi).replace(/\d/g,'')).join(' → ');
 const box=document.createElement('details');box.className='weekly-habits';
 box.innerHTML=`<summary>This week’s phrase & recording</summary><p><strong>${phrase}</strong>${m.index===0?'':' → '+g.destination.chord}</p><p class="notation-help">One melodic idea all week. Sing → play → breathe. Add each day’s vocabulary; keep the rhythm and destination.</p><div class="pattern-scroll">${m.index===0&&root.AmbientLesson?.score?'<div class="ambient-stage ambient-tab">'+root.AmbientLesson.score()+'</div>':PracticePatterns.tabs(g.model,g.chord.pc,'both')}</div><p class="notation-help">Saturday: 60 min integration practice + 60 min performance & review. Capture a 30-second highlight at ${lessonTempo} BPM. Sing once, then play your phrase into the changes. Use the same tempo next time.</p><button class="bak-btn" data-take-start>Record 30 seconds</button> <button class="bak-btn red" data-take-stop disabled>Stop & save</button><p data-take-status role="status">Microphone audio stays in this browser. Download to keep a separate copy; practice backups exclude audio.</p><div data-take-list></div>`;
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
   recorder.onstop=async()=>{release();const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});try{if(!blob.size)throw Error('No audio captured');await save({id:crypto.randomUUID(),at:Date.now(),week:m.index,tempo:lessonTempo,blob});status.textContent='Saved. Listen for the arrival, rhythm and breathing space.';await render();}catch(e){status.textContent='Could not save in this browser. Download this take now.';if(blob.size&&!disposed)show({blob,at:Date.now(),week:m.index,tempo:lessonTempo},'Unsaved take');}finally{start.disabled=false;}};
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
 panel.innerHTML='<h3 data-preview-title></h3><p data-preview-plan class="notation-help"></p><div data-preview-road class="chord-road"></div><p data-preview-cue role="status"></p><div data-preview-board class="pattern-scroll demo-neck"></div><p class="notation-help">Gold ring = next chord’s target. Same rhythm and breathing spaces; new melodic colours.</p><div class="preview-controls"><label>Speed <output data-preview-bpm>45 BPM</output><input data-preview-speed aria-label="Preview speed" type="range" min="30" max="100" step="5" value="45"></label><label>Loop<select data-preview-section aria-label="Preview chord change"></select></label><label>Repeats<select data-preview-repeats aria-label="Preview repeats"><option value="1">1</option><option value="2" selected>2</option><option value="4">4</option><option value="8">8</option></select></label></div><p class="notation-help">Each repeat: listen → sing → play. Singing and playing turns have backing only.</p><button class="bak-btn" data-preview-play>Start listen → sing → play</button> <button class="bak-btn red" data-preview-stop disabled>Stop</button> <button class="bak-btn small" data-preview-close>Close preview</button>';
 host.querySelector('.week-schedule').after(panel);
 const play=panel.querySelector('[data-preview-play]'),stop=panel.querySelector('[data-preview-stop]'),cue=panel.querySelector('[data-preview-cue]'),board=panel.querySelector('[data-preview-board]');
 const speed=panel.querySelector('[data-preview-speed]'),section=panel.querySelector('[data-preview-section]'),repeats=panel.querySelector('[data-preview-repeats]');
 let plan,voice,token=0,active,selectedDay=0;
 function draw(group){active=group;board.innerHTML=PracticePatterns.board(group.model,group.chord.pc);board.querySelectorAll('[data-pattern-events]').forEach(n=>{if(n.dataset.patternEvents.split(',').includes('7'))n.classList.add('demo-target');});}
 const runner=new PracticePatterns.Runner({play(e,d){if(!panel.isConnected){stopDayPreview();return;}if(active!==e.group)draw(e.group);if(e.step===0){const chord=GuitarNotation.midi(e.group.chord.name);(chord.length?chord:e.group.chord.tones.map(pc=>48+pc)).forEach((n,i)=>voice.triggerAttackRelease(Tone.Frequency(n,'midi').toNote(),e.finalLanding?d*2:d*7,Tone.now()+i*.012,.24));}if(!e.rest&&e.phase==='listen')voice.triggerAttackRelease(Tone.Frequency(e.notes[0].midi,'midi').toNote(),d*.85,Tone.now()+.025,.85);},onStep(i,repeat,total){const e=plan.events[i];cue.textContent=({listen:'LISTEN',sing:'SING · guitar resting',play:'PLAY · your turn'})[e.phase]+' · '+repeat+'/'+total+' · '+e.group.chord.name+' → '+e.group.destination.chord+' · aim for '+PracticePatterns.noteName(e.group.destination.note.midi)+(e.finalLanding?' · breathe':e.step===7?' · anticipate now':e.step===0?' · land on beat 1':' · sing the destination');board.querySelectorAll('[data-pattern-events]').forEach(n=>n.classList.toggle('current',!e.rest&&n.dataset.patternEvents.split(',').includes(String(e.step))));},onFinish(){stopDayPreview();cue.textContent='Complete · sing that ending, then try another day to hear the change.';}});
 stopDayPreview=()=>{token++;runner.stop();voice?.dispose();voice=null;play.disabled=false;stop.disabled=true;section.disabled=false;repeats.disabled=false;board.querySelectorAll('.current').forEach(n=>n.classList.remove('current'));};
 host.querySelectorAll('[data-preview-day]').forEach(button=>button.onclick=()=>{stopDayPreview();const day=+button.dataset.previewDay;selectedDay=day;plan=previewPractice(m,day);section.innerHTML='<option value="all">Whole progression</option>'+plan.chords.map((c,i)=>`<option value="${i}">${i+1}: ${c.name} → ${plan.chords[(i+1)%plan.chords.length].name}</option>`).join('');panel.hidden=false;host.querySelectorAll('[data-preview-day]').forEach(b=>b.setAttribute('aria-expanded',String(b===button)));panel.querySelector('[data-preview-title]').textContent=['Sunday · Triads','Monday · Seventh arpeggios','Tuesday · Seventh arpeggios','Wednesday · Pentatonics','Thursday · Pentatonics','Friday · Scales','Saturday · Performance & review'][day];panel.querySelector('[data-preview-plan]').textContent=(day===6?'60 min integration practice + 60 min performance, recording and review. Bring the week’s vocabulary into one melodic performance.':'30 min morning + 30 min evening.')+' Preview: '+m.caged+' area. '+['Keep the three chord tones clear.','Add seventh colour to the same rhythmic idea.','Connect thirds and sevenths into the next chord.','Use pentatonic colours around the landing.','Keep the pentatonic idea; sing a new ending.','Keep the phrase short and vary its ending.','Make it sing; finish with your weekly recording.'][day];panel.querySelector('[data-preview-road]').textContent=plan.chords.map(c=>c.name).join(' → ');cue.textContent='Preview only · no practice time or rewards recorded.';draw(plan.groups[0]);});
 play.onclick=async()=>{if(root.DailyPractice?.active){cue.textContent='Finish your saved practice session before listening to a preview.';return;}stopDayPreview();root.stopLicks?.();root.stopRoutine?.();root.stopProgression?.();root.stopMetronome?.();if(typeof audioTrack!=='undefined')audioTrack.pause();plan=previewPractice(m,selectedDay,section.value==='all'?undefined:+section.value);const id=++token;play.disabled=true;stop.disabled=false;section.disabled=true;repeats.disabled=true;cue.textContent='Loading guitar…';try{await ensureTone();if(id!==token)return;voice=StudioSound.voice('guitar');active=null;runner.start(plan.events,{bpm:60,speed:+speed.value/60*100,repetitions:+repeats.value});}catch(e){stopDayPreview();cue.textContent='Could not start audio. Tap to retry.';}};
 speed.oninput=()=>{panel.querySelector('[data-preview-bpm]').textContent=speed.value+' BPM';runner.setSpeed(+speed.value/60*100);};
 section.onchange=()=>{stopDayPreview();plan=previewPractice(m,selectedDay,section.value==='all'?undefined:+section.value);draw(plan.events[0].group);cue.textContent='Ready · listen → sing → play';};
 stop.onclick=()=>{stopDayPreview();cue.textContent='Stopped · ready to hear again.';};
 panel.querySelector('[data-preview-close]').onclick=()=>{stopDayPreview();panel.hidden=true;host.querySelectorAll('[data-preview-day]').forEach(b=>b.setAttribute('aria-expanded','false'));};
}
document.addEventListener('click',e=>{if(!e.target.closest('.day-preview')&&e.target.closest('button,a'))stopDayPreview();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDayPreview();});
let stopWeekSample=()=>{};
function mountWeekPhrase(node,m,start){
 stopWeekSample();
 const box=document.createElement('section');
 box.className='weekly-habits day-study';
 box.innerHTML=`<h2>Week ${m.index+1}</h2><p data-assignment></p><div data-map></div>
 <button class="bak-btn" data-hear>Listen</button> <button class="bak-btn" data-open>Practice</button>
 <button class="bak-btn" data-draw hidden>Next test</button><output data-status></output>`;
 node.prepend(box);
 const get=q=>box.querySelector(q), buttons=[...node.querySelectorAll('[data-preview-day]')];
 const offsets=[0,5,2,7,4,10],shapes=['E','A','D'];
 let day=Math.min(6,Math.max(0,Math.floor((Date.UTC(...parts(new Date()))-Date.UTC(...parts(start)))/86400000)));
 function parts(d){return [d.getFullYear(),d.getMonth(),d.getDate()];}
 let trial=-1,cfg,events,runner,voice,bass,generation=0,playing=false;
 function stop(){
   generation++;playing=false;runner?.stop();voice?.dispose();bass?.dispose();voice=bass=null;
   get('[data-hear]').textContent='Listen';
 }
 stopWeekSample=stop;
 function select(index){
   stop();day=index;
   trial=index===6?(trial<0?Math.floor(Math.random()*6):(trial+1+Math.floor(Math.random()*5))%6):index;
   const shape=shapes[trial%3],key=(m.key+offsets[trial])%12;
   cfg={preset:m.preset,key,weeklyKey:m.key,shape,width:5,octaves:1,tempo:45,rhythm:'lyrical',
     phraseId:m.preset==='blues'?'blues-1':m.preset==='sevenths'?'harris-1':'triads-'+(1+m.index%5)};
   events=AmbientLessonModel.events(cfg.rhythm,0,false,cfg);
   const date=new Date(start);date.setDate(date.getDate()+day);
   const lo=AmbientLessonModel.settings(cfg).position;
   get('[data-assignment]').textContent=date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})+' · '+(day===6?'Exam · ':'')+['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][key]+' · '+shape+' shape · frets '+lo+'–'+(lo+4);
   buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===day)));
   get('[data-draw]').hidden=day!==6;get('[data-status]').textContent='';
   const notes=events.filter(e=>e.note);
   const dots=new Map(notes.map(e=>[e.note.string+e.note.fret,e.note]));
   const strings=['e','B','G','D','A','E'];
   const x=f=>72+(f-lo)*70,y=i=>24+i*22;
   const rows=strings.map((s,i)=>`<text x="12" y="${y(i)+5}">${s}</text><path d="M36 ${y(i)}H388"/>`).join('');
   const frets=Array.from({length:5},(_,i)=>`<path d="M${x(lo+i)-35} 15v130"/><text x="${x(lo+i)}" y="165">${lo+i}</text>`).join('');
   const markers=[...dots].map(([id,n])=>`<g data-point="${id}"><circle cx="${x(n.fret)}" cy="${y(strings.indexOf(n.string))}" r="9"/><title>${PracticePatterns.noteName(n.midi)}</title></g>`).join('');
   get('[data-map]').innerHTML=`<strong data-chords></strong><svg viewBox="0 0 405 176" role="img" aria-label="Daily phrase fretboard"><rect x="36" y="14" width="352" height="132" rx="5"/>${rows+frets+markers}</svg>`;
   get('[data-chords]').textContent=AmbientLessonModel.harmony(cfg).map(c=>c.name).join(' · ');
 }
 buttons.forEach((b,i)=>b.onclick=()=>select(i));get('[data-draw]').onclick=()=>select(6);
 get('[data-open]').onclick=()=>{
   if(root.DailyPractice?.active){get('[data-status]').textContent='Finish your timed session first.';return;}
   stop();root.AmbientLesson.configure(cfg);
   document.getElementById('lesson-home').hidden=false;document.getElementById('custom-lesson').hidden=true;
   document.getElementById('nav-practice').click();
 };
 get('[data-hear]').onclick=async()=>{
   if(playing){stop();return;}stop();playing=true;const ticket=generation;
   get('[data-hear]').textContent='Stop';
   try{await ensureTone();if(ticket!==generation)return;
     voice=StudioSound.voice('guitar');bass=StudioSound.voice('bass');
     runner=new PracticePatterns.Runner({play(e,d){
       PhraseBank.accompany(PhraseBank.tracks[PhraseBank.recommended(cfg)],e,d,voice,bass);
       if(e.note)voice.triggerAttackRelease(Tone.Frequency(e.note.midi,'midi').toNote(),e.note.length*d*.95,Tone.now(),.8);
       get('[data-chords]').textContent=e.chord;
       box.querySelectorAll('[data-point]').forEach(g=>g.classList.toggle('active',!!e.held&&g.dataset.point===e.held.string+e.held.fret));
     },onFinish:()=>{stop();get('[data-chords]').textContent=AmbientLessonModel.harmony(cfg).map(c=>c.name).join(' · ');}});
     runner.start(events,{bpm:cfg.tempo});
   }catch{if(ticket===generation){stop();get('[data-status]').textContent='Audio unavailable. Tap Listen to retry.';}}
 };
 select(day);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWeekSample();});
document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('.day-study'))stopWeekSample();},true);

let chosen=null,started=null;try{const p=JSON.parse(localStorage.getItem('gtab-weekly-path'));if(p&&Number.isInteger(p.index)&&p.index>=0&&p.index<24&&Number.isFinite(new Date(p.start).getTime())){chosen=p.index;started=p.start;if(p.calendar!=='sun-2026-11-15'){started='2026-11-15';}}}catch{}
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function history(){return root.PracticeHistory?.sessions||[];}
function current(){const rows=history();if(chosen===null)chosen=Math.min(unlocked(rows),Math.max(0,...rows.filter(s=>s.curriculum==='bridges-v2').map(s=>s.weekMission||0)));chosen=Math.min(chosen,unlocked(rows));if(!started)started='2026-11-15';return mission(chosen);}
function persist(){try{localStorage.setItem('gtab-weekly-path',JSON.stringify({index:chosen,start:started,calendar:'sun-2026-11-15'}));}catch{}}
function nextDate(){current();const d=new Date(started+'T12:00:00');d.setDate(d.getDate()+7);return d;}
function refresh(){root.PracticeHistory?.refresh();}
root.WeeklyPractice={current,get start(){current();return started;},mount(host){const m=current(),rows=history(),e=evidence(rows,m.index),end=new Date(started+'T12:00:00');end.setDate(end.getDate()+6);const start=new Date(started+'T12:00:00');const next=nextDate();const canAdvance=e.ready&&e.passed&&dateKey(new Date())>=dateKey(next)&&m.index<23;
 const road=m.level===2?RoutineModel.build(m.key,m.preset,['arpeggios'],1).chords.map(c=>c.name):m.chords;const cue=m.level===2?'Sing the next third or seventh. Small steps, clear arrivals.':m.cue;const node=document.createElement('section');node.className='weekly-map';node.innerHTML=`<div class="weekly-heading"><div><span class="eyebrow">${start.toLocaleDateString(undefined,{month:'short',day:'numeric'})}–${end.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span></div><span class="xp-medal" aria-label="${xp(rows)} experience points">★ ${xp(rows)} XP</span></div><ol class="week-schedule">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return `<li class="${dateKey(d)===dateKey(new Date())?'active':''}"><button type="button" data-preview-day="${i}" aria-pressed="false"><strong>${day} ${d.getDate()}</strong><span>${['E','A','D','E','A','D','Exam'][i]}</span><small>${i===6?'60 + 60 min':'30 + 30 min'}</small></button></li>`;}).join('')}</ol><details class="weekly-mission"><summary>Week progress</summary><span class="eyebrow">${m.caged} AREA · ${m.tempo} BPM</span><h2>${m.name}</h2><div class="chord-road">${road.map((c,i)=>`<span>${c}</span>${i<road.length-1?'<b aria-hidden="true">→</b>':''}`).join('')}</div><p>${cue}</p><div class="week-progress" aria-label="${e.sessions.length} of 3 sessions completed">${[0,1,2].map(i=>`<span class="${i<e.sessions.length?'earned':''}">${i<e.sessions.length?'✓':'○'}</span>`).join('')}<small>${Math.min(3,e.sessions.length)}/3 sessions · morning + evening</small></div><button class="bak-btn small" id="weekly-check" ${e.ready&&!e.passed?'':'disabled'}>${e.passed?'★ Bridge badge earned':'Review weekly performance'}</button>${e.passed?`<button class="bak-btn small" id="weekly-next" ${canAdvance?'':'disabled'}>${m.index===23?'Path complete':canAdvance?'Start next week →':'Next opens '+next.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</button>`:''}<div id="weekly-assessment" hidden><p>During my Saturday test I…</p><label><input type="checkbox" id="bridge-review"> played the phrase in the assigned key and position</label><label><input type="checkbox" id="bridge-sing"> sang the destination before the change</label><label><input type="checkbox" id="bridge-land"> anticipated it, then landed on beat 1</label><label><input type="checkbox" id="bridge-space"> repeated a motif and left breathing space</label><button class="bak-btn small" id="bridge-claim">Confirm my successful take</button><p id="bridge-result" role="status">Self-assessed skill badge · not a microphone grade.</p></div></details>`;host.append(node);mountWeekPhrase(node,m,start);
 document.getElementById('weekly-check').onclick=()=>document.getElementById('weekly-assessment').hidden=false;
 document.getElementById('bridge-claim').onclick=()=>{if(!['bridge-review','bridge-sing','bridge-land','bridge-space'].every(id=>document.getElementById(id).checked)){document.getElementById('bridge-result').textContent='Complete the test, then check the skills you demonstrated. Repeat this week’s focus if needed; your rewards stay earned.';return;}const fresh=evidence(history(),m.index);if(!fresh.ready||fresh.passed)return;root.PracticeHistory.passBridge(fresh.sessions.at(-1).id);};
 if(document.getElementById('weekly-next'))document.getElementById('weekly-next').onclick=()=>{if(!canAdvance||root.DailyPractice?.active)return;chosen++;const d=new Date();d.setDate(d.getDate()-d.getDay());started=dateKey(d);persist();refresh();};persist();
 }};
})(typeof window==='undefined'?globalThis:window);

/* One deliberately composed phrase; the expanded studio remains optional. */
(function(root){
 const strings=['e','B','G','D','A','E'],open=[64,59,55,50,45,40],names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
 const recipes={neoclassical:[[0,'m'],[5,'m'],[7,''],[0,'m']],minor:[[0,'m'],[8,''],[3,''],[10,'']],classic:[[0,''],[5,''],[7,''],[0,'']],andalusian:[[0,'m'],[10,''],[8,''],[7,'']],sevenths:[[2,'m7'],[7,'7'],[0,'maj7']],blues:[[0,'7'],[0,'7'],[0,'7'],[0,'7'],[5,'7'],[5,'7'],[0,'7'],[0,'7'],[7,'7'],[5,'7'],[0,'7'],[7,'7']]};
 const shapes=['E','A','D'];
 function settings(value={}){
   const key=Number.isInteger(+value.key)&&+value.key>=0&&+value.key<12?+value.key:9;
   const shape=shapes.includes(value.shape)?value.shape:null;
   const position=shape?(key-({E:4,A:9,D:2}[shape])+12)%12:Math.max(1,Math.min(7,+value.position||4));
   return {key,shape,position,width:[3,4,5].includes(+value.width)?+value.width:5,
     weeklyKey:value.weeklyKey,mode:value.mode,passing:!!value.passing,trackId:value.trackId,
     preset:recipes[value.preset]?value.preset:'minor',octaves:[2,3].includes(+value.octaves)?+value.octaves:1,
     ...(value.phraseId?{phraseId:root.PhraseBank.phraseFor(value.phraseId).id}:{})};
 }
 function registerConfig(value,register){
   if(!value.shape)return value;
   return settings({...value,shape:shapes[(shapes.indexOf(value.shape)+register)%3]});
 }
 const alternate={minor:[[0,''],[9,'m'],[5,''],[7,'']],classic:[[0,'m'],[5,'m'],[7,''],[0,'m']],andalusian:[[0,''],[11,'dim'],[9,'m'],[7,'']],sevenths:[[2,'m7b5'],[7,'7'],[0,'m7']],blues:recipes.blues.map(([n])=>[n,'m7'])};
 function progression(c){
   const song=c.phraseId&&root.PhraseBank.phraseFor(c.phraseId).song;
   if(song)return song.bars.map(([pc,quality])=>[(pc-song.key+12)%12,quality]);
   const native=['minor','andalusian','neoclassical'].includes(c.preset)?'minor':'major';return c.mode&&c.mode!==native?(alternate[c.preset]||recipes[c.preset]):recipes[c.preset];}
 function harmony(value={}){const c=settings(value);return progression(c).map(([offset,quality],i)=>{const pc=(c.key+offset)%12,third=(quality.startsWith('m')&&!quality.startsWith('maj')||quality==='dim')?3:4;let target=pc+(i===0&&c.preset==='minor'?0:third);while(target<55)target+=12;while(target>66)target-=12;return {name:names[pc]+quality,pc,target,voicing:[36+pc,48+(pc+third)%12,48+(pc+(quality.includes('b5')||quality==='dim'?6:7))%12,...(quality.includes('7')?[48+(pc+(quality==='maj7'?11:10))%12]:[])]};});}
 function place(notes,maxStart=19){let best;for(let lo=0;lo<=maxStart;lo++){let previous=null,cost=Math.abs(lo-5)*.5;const mapped=[];for(const n of notes){const candidates=open.map((m,i)=>({string:strings[i],si:i,fret:n.midi-m})).filter(p=>p.fret>=lo&&p.fret<=lo+4&&p.fret<=24);if(!candidates.length){cost=Infinity;break;}candidates.sort((a,b)=>move(a)-move(b));const pos=candidates[0];cost+=move(pos);mapped.push({...n,string:pos.string,fret:pos.fret});previous=pos;function move(p){return previous?Math.abs(p.fret-previous.fret)+Math.abs(p.si-previous.si)*1.5:Math.abs(p.fret-(lo+2))*.2;}}if(!best||cost<best.cost)best={cost,notes:mapped,lo};}if(!Number.isFinite(best?.cost))throw new Error('No compact fingering available');return best;}
 function melody(rhythm='mixed',variation=0,value={}){const c=settings(value),chords=harmony(c);if(c.phraseId){
   if(Number.isInteger(c.weeklyKey)){
     const base=harmony({...c,key:c.weeklyKey});
     return root.PhraseBank.compose(c,base,rhythm,variation);
   }
   return root.PhraseBank.compose(c,chords,rhythm,variation);
 }const raw=chords.flatMap((ch,bar)=>{const target=chords[(bar+1)%chords.length].target;const base=bar<=variation?[ch.target,target+1,target-1]:[ch.target,ch.target+3,target+1];if(rhythm==='call'){const fifth=ch.target+3,answer=bar%2===1;return [{step:bar*8,midi:ch.target,length:answer?4:2},{step:bar*8+(answer?4:2),midi:fifth,length:answer?1:2},{step:bar*8+6,midi:base[1],length:1},{step:bar*8+7,midi:base[2],length:1}];}const pitches=rhythm==='quarter'?[base[0],ch.target+2,base[1],base[2]]:base;const lengths=rhythm==='surround'?[6,1,1]:rhythm==='half'?[4,2,2]:rhythm==='quarter'?[2,2,2,2]:[2,2,4];let offset=0;return pitches.map((midi,i)=>{const n={step:bar*8+offset,midi,length:lengths[i]};offset+=lengths[i];return n;});});return place(raw,c.octaves===2?7:19).notes;}
 function lessonEvents(rhythm='mixed',variation=0,countIn=true,value={},octave=0){const c=settings(value),chords=harmony(c),notes=melody(rhythm,variation,registerConfig(c,octave)).map(n=>({...n,midi:n.midi+(c.shape?0:octave*12),fret:n.fret+(c.shape?0:octave*12)}));return [...(countIn?Array.from({length:8},(_,step)=>({countIn:true,step})):[]),...Array.from({length:chords.length*8},(_,step)=>{const bar=Math.floor(step/8),ch=chords[bar],target=notes.find(n=>n.step>=((bar+1)%chords.length)*8)||notes[0];return {step,bar,chord:ch.name,pc:ch.pc,voicing:ch.voicing,target,note:notes.find(n=>n.step===step),held:notes.find(n=>step>=n.step&&step<n.step+n.length)};})];}
 const phrase=melody(),variationNames=harmony().map((c,i,a)=>c.name+' → '+a[(i+1)%a.length].name+' enclosure');
 root.AmbientLessonModel={phrase,melody,events:lessonEvents,variationNames,harmony,settings};
 if(typeof document==='undefined')return;
 let cleanup=()=>{};
 const bank=root.PhraseBank;
 let config=settings({phraseId:bank.phrases[0].id,shape:'E',octaves:1}),octave=0,lowFret=5;
 const x=f=>108+(f-lowFret)*500/((config.width||5)-1),y=s=>40+strings.indexOf(s)*27;
 function neck(){let svg='<svg viewBox="0 0 700 225" role="img" aria-label="Fretboard, high E at top. Compact playing position. Gold ring marks the next chord landing."><rect x="50" y="20" width="620" height="165" rx="8" fill="#c9ba8c"/>';
 for(let f=lowFret;f<lowFret+(config.width||5);f++){svg+=`<line x1="${x(f)+58}" x2="${x(f)+58}" y1="20" y2="185" stroke="#726755" stroke-width="4"/><text x="${x(f)}" y="218" class="ambient-fret">${f}</text>`;}
 strings.forEach((s,i)=>{svg+=`<text x="25" y="${y(s)+6}" class="ambient-fret">${s}</text><line x1="50" x2="670" y1="${y(s)}" y2="${y(s)}" stroke="#ece9df" stroke-width="${2+i*.35}"/>`;for(let f=lowFret;f<lowFret+(config.width||5);f++){svg+=`<text x="${x(f)}" y="${y(s)+5}" class="ambient-note">${names[(open[i]+f)%12]}</text>`;}});
 svg+=`<circle cx="${x(7)}" cy="${y('D')}" r="24" class="ambient-target" data-ambient-target/><circle data-landing-hit visibility="hidden" r="24" fill="#368c4d" stroke="#ecffd9" stroke-width="3"/><g data-ambient-dot visibility="hidden"><circle r="21" fill="#13121b" stroke="#fff" stroke-width="2"/><text y="7" fill="white" font-size="23" text-anchor="middle" data-ambient-interval></text></g></svg>`;return svg;}
 function tab(rhythm='surround',bar=0,variation=0,value=config,register=octave){const chords=harmony(value),notes=melody(rhythm,variation,registerConfig(value,register)).map(n=>({...n,fret:n.fret+(value.shape?0:register*12)})),width=chords.length*400+60;let svg='<svg viewBox="0 0 '+width+' 220" style="width:'+width+'px!important" role="img" aria-label="Continuous transposed phrase tablature">';
 strings.forEach((s,i)=>{svg+=`<text x="8" y="${58+i*24}" fill="#d5cfe5" font-size="15">${s}</text><line x1="30" x2="${width-10}" y1="${53+i*24}" y2="${53+i*24}" stroke="#9b8dad"/>`;});
 chords.forEach((c,i)=>{svg+=`<text x="${45+i*400}" y="22" fill="white" font-size="20">${c.name}</text>`;for(let beat=0;beat<4;beat++)svg+=`<text x="${45+i*400+beat*100}" y="215" fill="#d5cfe5">${beat+1}</text>`;});
 notes.forEach(n=>{const px=45+n.step*50,py=53+strings.indexOf(n.string)*24;svg+=`<g data-ambient-tab="${n.step}"><rect x="${px-12}" y="${py-14}" width="24" height="28" rx="5" fill="#302044"/><text x="${px}" y="${py+7}" text-anchor="middle" fill="white" font-size="22">${n.fret}</text><line x1="${px+13}" x2="${px+n.length*50-15}" y1="${py}" y2="${py}" stroke="#d3c6e6" stroke-width="3"/></g>`;});return svg+'</svg>';}
 root.AmbientLesson={score:()=>tab('lyrical',0,0,config,0),mount(host){cleanup();const panel=document.createElement('section');panel.className='ambient-lesson';panel.innerHTML=`<span hidden data-variation></span><div class="ambient-controls"><button class="bak-btn" data-mode="sing" aria-pressed="false" title="Listen and sing along. Tap again to stop.">Sing</button><button class="bak-btn" data-mode="play" aria-pressed="false" title="Listen for target notes with your microphone. Use headphones. Tap again to stop.">Play</button><button class="bak-btn" data-spin title="Next phrase in this style">Spin</button><div class="ambient-tempo"><button data-less aria-label="Fewer repetitions">−</button><output data-reps></output><button data-more aria-label="More repetitions">+</button></div><div class="ambient-tempo"><button data-slower aria-label="Decrease BPM">−</button><output data-bpm>45 BPM</output><button data-faster aria-label="Increase BPM">+</button><input type="hidden" data-speed value="45"></div></div><div class="ambient-settings"><label>Key <select data-key aria-label="Practice key">${names.map((n,i)=>`<option value="${i}" ${i===config.key?'selected':''}>${n}</option>`).join('')}</select></label><label>Phrasing <select data-style>${['Triads','Blues','Harris','Enclosures','Licks','Jazz standards'].map(s=>`<option>${s}</option>`).join('')}</select></label><label>Rhythm <select data-rhythm aria-label="Note pattern"><option value="lyrical">Long pickup</option><option value="mixed">Quarter · quarter · half</option><option value="half">Half · quarter · quarter</option><option value="quarters">Quarter notes</option><option value="pickup">Beat-four pickup</option><option value="spacious">Long opening</option></select></label><label>Play-along <select data-turn><option value="with">Play with me</option><option value="respond">Listen &amp; respond</option></select></label></div><details class="ambient-method"><summary>Practice setup</summary><label>Position <select data-position>${shapes.map(n=>`<option>${n}</option>`).join('')}</select></label> <label>Reach <select data-width><option value="3">3 frets</option><option value="4">4 frets</option><option value="5">5 frets</option></select></label> <label>Registers <select data-registers><option value="1">1 octave</option><option value="2">2 octaves</option><option value="3">3 octaves · E/A/D</option></select></label> <label><input type="checkbox" data-mic checked> Check target notes</label><p>Sing the first two bars from memory, then answer on guitar. Each repetition uses the same phrase.</p></details><div class="ambient-stage"><div class="ambient-chart"><button data-pause aria-label="Pause playback" title="Pause or resume">Ⅱ</button><div class="ambient-road" aria-label="Chord progression">${harmony(config).map((c,i)=>`<span data-chord="${i}" class="${i===0?'active':''}">${c.name}</span>`).join('')}</div><button data-repeat aria-label="Repeat phrase" title="Restart this phrase">↻</button></div><p data-phrase-turn></p><p data-cue role="status"></p><div class="ambient-neck">${neck()}</div><div class="ambient-beats" aria-label="Four beat count">${[1,2,3,4].map(b=>`<span data-ambient-beat="${b}">${b}</span>`).join('')}</div><div data-landing-summary class="landing-summary" role="status" hidden></div><div class="ambient-tab ambient-scroll">${tab()}</div></div>`;host.append(panel);
 const $=q=>panel.querySelector(q),speed=$('[data-speed]'),rhythm=$('[data-rhythm]'),cue=$('[data-cue]');let mode=null,variation=0,voice,click,token=0,paused=false,bass,repeats=4,round=1,results=[],firstPass=true;const listener=new root.LandingFeedback.Listener((text,kind,meta)=>{cue.textContent=text;cue.dataset.feedback=kind;if(!meta)return;results[meta.bar]=kind;if(kind==='hit'){const hit=$('[data-landing-hit]');hit.setAttribute('cx',x(meta.fret));hit.setAttribute('cy',y(meta.string));hit.setAttribute('visibility','visible');$('[data-ambient-dot] circle').setAttribute('fill','#368c4d');}});function redraw(){const current=registerConfig(config,octave),ns=melody(rhythm.value,variation,current);lowFret=current.position;$('.ambient-neck').innerHTML=neck();$('.ambient-scroll').innerHTML=tab(rhythm.value,0,variation);$('.ambient-road').innerHTML=harmony(config).map((c,i)=>`<span data-chord="${i}" class="${i===0?'active':''}">${c.name}</span>`).join('');$('.ambient-road').style.gridTemplateColumns='repeat('+Math.min(4,harmony(config).length)+',minmax(0,1fr))';const target=ns.find(n=>n.step===8)||ns[0];$('[data-ambient-target]').setAttribute('cx',x(target.fret));$('[data-ambient-target]').setAttribute('cy',y(target.string));$('[data-key]').value=config.key;paint();}
 function paint(){panel.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));const selected=bank.phraseFor(config.phraseId);
 const family=bank.phrases.filter(p=>p.style===selected.style);
 const active=family[(family.indexOf(selected)+variation)%family.length];
 $('[data-variation]').textContent=active.name+(mode?' · '+round+'/'+repeats:'');
 $('[data-reps]').textContent=repeats+(repeats===1?' rep':' reps');
 $('[data-style]').value=selected.style;rhythm.disabled=!!selected.song;if(selected.song&&!mode)$('[data-phrase-turn]').textContent=selected.name;
 $('[data-position]').value=config.shape;
 $('[data-registers]').value=config.octaves;
 $('[data-width]').value=config.width;
 $('[data-pause]').textContent=paused?'▶':'Ⅱ';$('[data-pause]').setAttribute('aria-label',paused?'Resume playback':'Pause playback');}
 function stop(){panel.classList.remove('recalling');token++;listener.stop();runner.stop();voice?.dispose();bass?.dispose();click?.dispose();voice=bass=click=null;mode=null;paused=false;$('[data-landing-hit]').setAttribute('visibility','hidden');paint();cue.textContent='';$('[data-phrase-turn]').textContent='';}
 function visual(e){panel.classList.toggle('recalling',e.turn==='Answer');$('[data-phrase-turn]').textContent=e.countIn?'Count in':e.turn|| (mode==='play'?'Play along':'Sing along');panel.querySelectorAll('[data-ambient-beat]').forEach(n=>n.classList.toggle('active',+n.dataset.ambientBeat===Math.floor(e.step%8/2)+1));if(e.countIn){cue.textContent=String(Math.floor(e.step/2)+1);return;}if(mode!=='play')cue.textContent='';panel.querySelectorAll('[data-chord]').forEach(n=>{n.classList.toggle('active',+n.dataset.chord===e.bar);n.setAttribute('aria-current',+n.dataset.chord===e.bar?'true':'false');});
 const target=$('[data-ambient-target]');target.setAttribute('cx',x(e.target.fret));target.setAttribute('cy',y(e.target.string));const dot=$('[data-ambient-dot]');dot.setAttribute('visibility',e.held?'visible':'hidden');if(e.held){const hit=$('[data-landing-hit]');dot.querySelector('circle').setAttribute('fill',hit.getAttribute('visibility')==='visible'&&+hit.getAttribute('cx')===x(e.held.fret)&&+hit.getAttribute('cy')===y(e.held.string)?'#368c4d':'#13121b');dot.setAttribute('transform',`translate(${x(e.held.fret)},${y(e.held.string)})`);$('[data-ambient-interval]').textContent=PracticePatterns.INTERVALS[(e.held.midi-e.pc+12)%12];}panel.querySelectorAll('[data-ambient-tab]').forEach(n=>n.classList.toggle('active',e.held?.step===+n.dataset.ambientTab));$('.ambient-scroll').scrollLeft=Math.max(0,e.step*50-100);}
 const runner=new PracticePatterns.Runner({play(e,d){if(!panel.isConnected){stop();return;}if(!e.countIn&&e.step%8===0)$('[data-landing-hit]').setAttribute('visibility','hidden');visual(e);if(e.step%2===0)click.triggerAttackRelease('C5',.025,Tone.now(),e.countIn?.3:.06);if(e.countIn)return;if(mode==='play'&&e.turn!=='Listen'&&e.step%8===0&&e.note)listener.expect(e.note.midi,e.chord+' → '+PracticePatterns.noteName(e.note.midi),d*e.note.length,{bar:e.bar,fret:e.note.fret,string:e.note.string});const track=bank.tracks[config.trackId]||bank.tracks[bank.recommended(config)];
 bank.accompany(track,e,d,voice,bass);
 if(e.note&&e.turn!=='Answer')voice.triggerAttackRelease(Tone.Frequency(e.note.midi,'midi').toNote(),d*e.note.length*.95,Tone.now()+.03,.85);},onFinish(){if(mode==='play'&&$('[data-mic]').checked){const summary=$('[data-landing-summary]');summary.hidden=false;summary.replaceChildren(...root.LandingFeedback.summary(harmony(config).map(c=>c.name),results,firstPass).map(result=>{const chip=document.createElement('span');chip.dataset.result=result.kind;chip.textContent=({hit:'✓ ',adjust:'↻ ',unclear:'? '})[result.kind]+result.label;chip.title=({hit:'Target hit',adjust:'Practice this change',unclear:'Not enough clear sound to judge'})[result.kind];chip.setAttribute('aria-label',result.label+': '+chip.title);return chip;}));const legend=document.createElement('small');legend.textContent='✓ Hit · ↻ Practice · ? Unclear';summary.append(legend);results=[];firstPass=false;}if(mode==='play')root.PracticeHistory?.add({id:crypto.randomUUID(),at:Date.now(),seconds:Math.round(sessionEvents(false).length*30/(+speed.value)),completed:true,curriculum:'ambient-v1',exercise:harmony(config).map(c=>c.name).join('–')+' · '+$('[data-variation]').textContent,score:null,coverage:null,comparable:false});if(mode&&round>=repeats){stop();cue.textContent='Set complete · '+repeats+(repeats===1?' repetition':' repetitions');return;}if(mode){round++;octave=(octave+1)%config.octaves;redraw();runner.start(sessionEvents(false),{bpm:+speed.value});}}});
 function sessionEvents(countIn){
   const events=lessonEvents(rhythm.value,variation,countIn,config,octave);
   return bank.turns(events,mode==='play'&&$('[data-turn]').value==='respond');
 }
 async function begin(next){stop();round=1;octave=0;results=[];firstPass=true;$('[data-landing-summary]').hidden=true;if(root.DailyPractice?.active){cue.textContent='Finish your timed session on Dashboard first.';return;}root.stopLicks?.();root.stopProgression?.();root.stopRoutine?.();root.stopMetronome?.();if(typeof audioTrack!=='undefined')audioTrack.pause();mode=next;paint();const id=++token;cue.textContent='Loading…';redraw();$('.ambient-scroll').scrollLeft=0;try{if(next==='play'&&$('[data-mic]').checked){cue.textContent='Use headphones · requesting microphone…';const [,ready]=await Promise.all([ensureTone(),listener.start()]);if(!ready||id!==token)return;}else await ensureTone();await StudioSound.load();if(id!==token)return;voice=StudioSound.voice('guitar');bass=StudioSound.voice('bass');click=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:.001,decay:.02,sustain:0,release:.01}}).toDestination();runner.start(sessionEvents(true),{bpm:+speed.value});if(paused)runner.pause();}catch(e){if(id!==token)return;stop();cue.textContent=next==='play'?(e.name==='NotAllowedError'?'Microphone access denied. Allow it in your browser, then tap Play.':e.message||'Microphone unavailable. Try Play again.'):'Audio unavailable. Tap to retry.';cue.dataset.feedback='unclear';}}
 panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>mode===b.dataset.mode?stop():begin(b.dataset.mode));$('[data-spin]').onclick=()=>{const next=mode||'sing';const current=bank.phraseFor(config.phraseId);
 if(current.song){const tunes=bank.phrases.filter(p=>p.song);config.phraseId=tunes[(tunes.indexOf(current)+1)%tunes.length].id;variation=0;begin(next);return;}
 variation=(variation+1)%bank.phrases.filter(p=>p.style===bank.phraseFor(config.phraseId).style).length;octave=0;begin(next);};rhythm.onchange=()=>{if(mode)begin(mode);else redraw();};function tempo(delta){speed.value=Math.max(30,Math.min(120,+speed.value+delta));$('[data-bpm]').textContent=speed.value+' BPM';runner.bpm=+speed.value;runner.setSpeed(100);}$('[data-slower]').onclick=()=>tempo(-5);$('[data-faster]').onclick=()=>tempo(5);
 $('[data-key]').onchange=()=>{const next=mode;config=settings({...config,key:+$('[data-key]').value});octave=0;if(next)begin(next);else redraw();};
 $('[data-pause]').onclick=()=>{if(!mode)return;if(paused){paused=false;runner.resume();}else{paused=true;listener.suspend();runner.pause();voice?.releaseAll?.();}paint();};$('[data-repeat]').onclick=()=>begin(mode||'sing');
 root.AmbientLesson.notes=()=>melody(rhythm.value,variation,config);
 root.AmbientLesson.chords=()=>harmony(config);
 root.AmbientLesson.score=()=>tab(rhythm.value,0,variation,config,0);
 function changeSetup(){stop();variation=0;octave=0;redraw();}
 $('[data-style]').onchange=()=>{config.phraseId=bank.phrases.find(p=>p.style===$('[data-style]').value).id;changeSetup();};
 $('[data-position]').onchange=()=>{config=settings({...config,shape:$('[data-position]').value});changeSetup();};
 $('[data-width]').onchange=()=>{config.width=+$('[data-width]').value;changeSetup();};
 $('[data-registers]').onchange=()=>{config.octaves=+$('[data-registers]').value;changeSetup();};
 $('[data-turn]').onchange=changeSetup;
 $('[data-mic]').onchange=changeSetup;
 $('[data-less]').onclick=()=>{repeats=Math.max(1,repeats-1);paint();};
 $('[data-more]').onclick=()=>{repeats=Math.min(32,repeats+1);paint();};
 root.AmbientLesson.configure=value=>{
   stop();config=settings({...value,shape:value.shape||'E',phraseId:value.phraseId||(value.preset==='blues'?'blues-1':'triads-1')});
   octave=0;variation=0;rhythm.value=value.rhythm in bank.rhythms?value.rhythm:'lyrical';
   speed.value=Math.max(30,Math.min(120,+value.tempo||45));tempo(0);redraw();
 };redraw();paint();cleanup=stop;root.AmbientLesson.stop=stop;
 }};
 window.addEventListener('pagehide',()=>root.AmbientLesson.stop?.());document.addEventListener('visibilitychange',()=>{if(document.hidden)root.AmbientLesson.stop?.();});document.addEventListener('click',e=>{if(!e.target.closest('.ambient-lesson')&&e.target.closest('button,a,summary'))root.AmbientLesson.stop?.();},true);
})(typeof window==='undefined'?globalThis:window);
