/* A paired, timed curriculum. No library recordings are published. */
(function(root){
const families={
 rock:{name:'Blues / rock',choices:[['minor','Am–F–C–G · minor rock',9],['pop','C–G–Am–F · major rock',0],['blues','A7–D7–E7 · 12-bar blues',9]]},
 andalusian:{name:'Andalusian',choices:[['andalusian','Am–G–F–E · minor',9]]},
 neoclassical:{name:'Neoclassical',choices:[['neoclassical','Am–Dm–E–Am · minor',9]]},
 jazz:{name:'Jazz',choices:[['sevenths','Dm7–G7–Cmaj7 · major ii–V–I',0],['jazzminor','Bm7♭5–E7–Am7 · minor ii–V–i',9]]},
 other:{name:'Other progressions',choices:[['classic','C–F–G–C · major',0],['minor','Am–F–C–G · minor',9]]}
};
const phases={morning:[
 [5,'Sing the destination','Hear the next chord’s third. Sing it before you play.'],
 [8,'Approach → anticipate → land','Play a nearby note, then the target on the last upbeat. Land on it again on beat 1.'],
 [8,'One motif, new endings','Repeat one rhythm. Change the ending to meet the next chord.'],
 [6,'Leave a breath','Use silence before your approach. Keep the chord change in your head.'],
 [3,'Three connected loops','Sing → approach → land. Repeat three times without losing the pulse.']
],evening:[
 [5,'Hear tonight’s landing','Sing the morning’s destination before touching the strings.'],
 [8,'Ask → answer','Ask over this chord. Answer into the next one.'],
 [8,'Vary the approach','Same target, three routes: above, below, then a repeated note.'],
 [6,'Make it sing','Short phrase → breath → new destination. Keep your motif recognizable.'],
 [3,'Your bridge challenge','Three loops: hear ahead, land on beat 1, leave space. Self-check afterward.']
]};
function validSettings(p){return p&&families[p.family]?.choices.some(c=>c[0]===p.preset)&&['C','A','G','E','D'].includes(p.caged)&&Number.isFinite(p.tempo)&&p.tempo>=40&&p.tempo<=140;}
function stage(kind,seconds){let end=0;return phases[kind].map((p,i)=>{const start=end;end+=p[0]*60;return {index:i,start,end,title:p[1],prompt:p[2]};}).find(p=>seconds<p.end)||{index:4,start:1620,end:1800,title:'Complete',prompt:''};}
root.DailyCurriculum={families,phases,stage};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),storage='gtab-weekly-session-v2';let prefs={family:'rock',preset:'minor',caged:'E',tempo:75},session=null,last=0,phaseIndex=-1;
try{const p=JSON.parse(localStorage.getItem('gtab-daily-preferences'));if(p&&families[p.family]?.choices.some(c=>c[0]===p.preset)&&['C','A','G','E','D'].includes(p.caged))prefs={...prefs,...p,tempo:Math.max(40,Math.min(140,+p.tempo||75))};const s=JSON.parse(localStorage.getItem(storage));if(s&&['morning','evening'].includes(s.kind)&&Number.isFinite(s.seconds)&&s.seconds>=0&&s.seconds<1800&&s.settings&&families[s.settings.family]?.choices.some(c=>c[0]===s.settings.preset)&&['C','A','G','E','D'].includes(s.settings.caged)&&[1,2,3,4].includes(s.level))session={...s,running:false};}catch{}
function save(){try{localStorage.setItem('gtab-daily-preferences',JSON.stringify(prefs));if(session)localStorage.setItem(storage,JSON.stringify(session));else localStorage.removeItem(storage);}catch{if($('daily-save-status'))$('daily-save-status').textContent='This browser could not save your session. Keep this page open.';}}
function clock(){if(session?.running){const now=performance.now();session.seconds=Math.min(1800,session.seconds+(now-last)/1000);last=now;}return session?.seconds||0;}
function mode(){return session.kind==='evening'||[0,4].includes(stage(session.kind,session.seconds).index)?'improv':'response';}
function configure(){const p=session.settings,choice=families[p.family].choices.find(c=>c[0]===p.preset);PracticeLevels.set(session.level);RoutineControl.configure({'routine-key':choice[2],'routine-progression':p.preset,'routine-caged':p.caged,'routine-tempo':p.tempo,'routine-rounds':4,'routine-mode':mode(),'routine-challenge':'model','routine-help':session.kind==='evening'?'chords':'full','routine-phrasing':true});}
function draw(){const host=$('daily-session');if(!host)return;host.hidden=!session;if(!session)return;const p=stage(session.kind,session.seconds),remaining=Math.max(0,Math.ceil(1800-session.seconds));
 $('daily-session-title').textContent=(session.kind==='morning'?'Morning · focused learning':'Evening · improvisation')+' · '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+' left';
 $('daily-stage-title').textContent=(p.index+1)+'/5 · '+p.title;$('daily-stage-prompt').textContent=p.prompt;$('daily-clock-state').textContent=session.running?'Session timer running':'Paused · time is not counted';$('daily-session-toggle').textContent=session.running?'Pause session':'Resume session';
}
function finish(){if(!session)return;clock();session.running=false;root.stopRoutine();const done=session;session=null;last=0;save();$('daily-reflection').hidden=false;$('daily-reward').textContent=done.seconds>=1800?'★ Session complete · +100 XP':'Practice saved · keep building your bridge';$('daily-reflection-text').value='';$('daily-reflection-save').onclick=()=>{$('daily-reflection').hidden=true;};$('daily-session').hidden=true;
 if(done.seconds>=5){const row={id:done.id,at:Date.now(),seconds:Math.round(done.seconds),completed:done.seconds>=1800,score:null,coverage:null,level:done.level,curriculum:'bridges-v2',weekMission:done.weekMission,sessionKind:done.kind,exercise:(done.kind==='morning'?'Morning learning':'Evening improvisation')+' · '+families[done.settings.family].choices.find(c=>c[0]===done.settings.preset)[1]+' · '+done.settings.caged+' area',settings:{tempo:done.settings.tempo,help:done.kind==='evening'?'chords':'full'},comparable:false};PracticeHistory.add(row);$('daily-reflection-save').onclick=()=>{PracticeHistory.reflect(row.id,$('daily-reflection-text').value);$('daily-reflection').hidden=true;};}
 draw();}
function start(kind){if(session&&session.kind!==kind){$('daily-home-status').textContent='Finish your saved '+session.kind+' session before starting the other session.';return;}
 if(!session){const m=WeeklyPractice.current();session={id:crypto.randomUUID(),kind,level:m.level,weekMission:m.index,settings:{family:m.family,preset:m.preset,caged:m.caged,tempo:m.tempo},seconds:0,running:false};}

 phaseIndex=stage(session.kind,session.seconds).index;configure();$('nav-prog').click();draw();const previous=PracticeHistory.sessions.filter(s=>s.sessionKind==='morning'&&s.reflection).at(-1);$('daily-carry').textContent=kind==='evening'&&previous?'Morning intention: '+previous.reflection:'';save();$('routine-start').click();}
root.DailyPractice={get active(){return !!session;},get elapsed(){return session?.seconds||0;},mount(host){const node=document.createElement('section');node.className='daily-home';node.innerHTML=`<div class="daily-cards">${['morning','evening'].map(kind=>`<article><span class="session-symbol" aria-hidden="true">${kind==='morning'?'☀':'☾'}</span><h3>${kind==='morning'?'Morning':'Evening'} <small>30 min</small></h3><p>${kind==='morning'?'Sing → connect':'Connect → improvise'}</p><button class="bak-btn" id="daily-${kind}">${session?.kind===kind?'Resume':'Start'} ${kind}</button></article>`).join('')}</div><p id="daily-home-status" role="status"></p>`;host.append(node);
 for(const kind of ['morning','evening'])document.getElementById('daily-'+kind).onclick=()=>start(kind);
 },pauseClock(){if(!session)return;clock();session.running=false;save();draw();},resumeClock(){if(!session)return;last=performance.now();session.running=true;save();draw();},nextLoop(){if(!session)return false;if(session.seconds>=1800){finish();return true;}$('routine-start').click();return true;},finish};
document.addEventListener('DOMContentLoaded',()=>{const panel=document.querySelector('.routine-panel'),node=document.createElement('section');node.id='daily-session';node.hidden=true;node.innerHTML='<h2 id="daily-session-title"></h2><h3 id="daily-stage-title"></h3><p id="daily-stage-prompt"></p><p id="daily-carry" class="notation-help"></p><p id="daily-clock-state" role="status"></p><button id="daily-session-toggle" class="bak-btn">Resume session</button><button id="daily-session-finish" class="bak-btn red">Finish & reflect</button><p id="daily-save-status" role="status"></p>';panel.prepend(node);const reflection=document.createElement('section');reflection.id='daily-reflection';reflection.hidden=true;reflection.innerHTML='<h3 id="daily-reward"></h3><label for="daily-reflection-text">Which landing sounded best?</label><textarea id="daily-reflection-text" maxlength="400" rows="3"></textarea><button id="daily-reflection-save" class="bak-btn">Save reflection</button>';panel.append(reflection);$('daily-session-toggle').onclick=()=>{if(session?.running)RoutineControl.pause();else if(RoutineControl.paused)RoutineControl.resume();else $('routine-start').click();};$('daily-session-finish').onclick=finish;draw();
 setInterval(()=>{if(!session?.running)return;clock();if(session.seconds>=1800){finish();return;}const next=stage(session.kind,session.seconds).index;if(next!==phaseIndex){phaseIndex=next;configure();$('routine-start').click();}save();draw();},500);
});
})(typeof window==='undefined'?globalThis:window);
