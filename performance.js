/* Local, monophonic pitch matching. Audio never leaves this browser. */
(function(root){
function detect(input,rate){
 const n=input.length;let mean=0;for(const v of input)mean+=v;mean/=n;
 const x=new Float32Array(n);let energy=0;for(let i=0;i<n;i++){x[i]=input[i]-mean;energy+=x[i]*x[i];}
 const rms=Math.sqrt(energy/n);if(rms<.008)return {rms,midi:null};
 const min=Math.floor(rate/1200),max=Math.min(Math.floor(rate/70),Math.floor(n/2));const corr=new Float32Array(max+1);let best=0;
 for(let lag=min;lag<=max;lag++){let cross=0,a=0,b=0;for(let i=0;i<n-max;i++){cross+=x[i]*x[i+lag];a+=x[i]*x[i];b+=x[i+lag]*x[i+lag];}corr[lag]=cross/Math.sqrt(a*b||1);best=Math.max(best,corr[lag]);}
 if(best<.88)return {rms,midi:null};
 for(let lag=min+1;lag<max;lag++)if(corr[lag]>.9*best&&corr[lag]>.88&&corr[lag]>=corr[lag-1]&&corr[lag]>corr[lag+1]){const offset=.5*(corr[lag-1]-corr[lag+1])/(corr[lag-1]-2*corr[lag]+corr[lag+1]);const hz=rate/(lag+offset);return {rms,midi:69+12*Math.log2(hz/440)};}
 return {rms,midi:null};
}
function summarize(windows){
 const eligible=windows.filter(w=>w.samples.length>=2),matched=eligible.filter(w=>w.samples.filter(m=>Math.abs(m-w.midi)<=.5).length/w.samples.length>=.6);
 return {total:windows.length,detected:eligible.length,matched:matched.length,coverage:windows.length?Math.round(eligible.length/windows.length*100):0,score:eligible.length>=4&&eligible.length/windows.length>=.6?Math.round(matched.length/eligible.length*100):null};
}

function calibrationResult(quiet,notes,target=40){
 const noise=[...quiet].sort((a,b)=>a-b)[Math.floor(quiet.length*.95)]||0;
 const voiced=notes.filter(n=>n.midi!==null&&n.rms>Math.max(.003,noise*3));
 const correct=voiced.filter(n=>Math.abs(n.midi-target)<.5);
 const ok=quiet.length>=15&&voiced.length>=8&&correct.length/voiced.length>=.7&&noise<.05&&!notes.some(n=>n.peak>.98);
 return {ok,threshold:Math.max(.003,Math.min(.06,noise*3)),noise,reason:noise>=.05?'The room is too noisy. Reduce background sound and try again.':notes.some(n=>n.peak>.98)?'The input is clipping. Move the guitar farther from the microphone.':!ok?'The selected open string was not detected consistently. Check tuning, pluck it alone and try again.':'Input check passed. Keep the same microphone distance and headphone setup.'};
}
root.PitchAssessment={detect,summarize,calibrationResult};if(typeof document==='undefined')return;
let stream,context,analyser,timer,windows=[],current,started=0,generation=0,enabled=false,running=false,pausedAt=0,pausedMs=0,metadata={},comparable=true,calibration=null,calibrating=null;
function status(text){const n=document.getElementById('mic-status');if(n)n.textContent=text;}
function close(){generation++;enabled=false;calibration=null;calibrating=null;clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;context?.close().catch(()=>{});context=null;status('Microphone off');const b=document.getElementById('mic-enable');if(b)b.textContent='Enable microphone';}
function settingSnapshot(){const value=id=>document.getElementById(id)?.value||'';return {curriculum:'bridges-v2',caged:value('routine-caged'),level:root.PracticeLevels?.selected||1,key:value('routine-key'),progression:value('routine-progression'),shape:value('routine-shape'),mode:value('routine-mode'),section:value('routine-loop'),rounds:value('routine-rounds'),types:['triads','arpeggios','pentatonic','scales'].filter(t=>document.getElementById('routine-'+t)?.checked).join(','),tempo:value('routine-tempo'),help:value('routine-help'),basis:value('routine-basis'),phrasing:document.getElementById('routine-phrasing')?.checked||false,challenge:value('routine-challenge'),calibration:calibration?.ok?'input-checked':'unchecked',latency:value('mic-latency')};}
root.PlayingCoach={
 get enabled(){return enabled;},get calibrated(){return !!calibration?.ok;},
 async enable(){
  if(enabled){if(running)root.RoutineControl?.pause();close();return;}
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs Safari/Chrome on HTTPS (or localhost).');
  const request=++generation;context=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
  try{const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});if(request!==generation){media.getTracks().forEach(t=>t.stop());return;}stream=media;analyser=context.createAnalyser();analyser.fftSize=4096;context.createMediaStreamSource(stream).connect(analyser);enabled=true;document.getElementById('mic-enable').textContent='Turn microphone off';status('Microphone ready · run the input check before scoring');
  const raw=new Float32Array(4096),down=new Float32Array(2048);
  timer=setInterval(()=>{
   if(!context||context.state!=='running')return;
   analyser.getFloatTimeDomainData(raw);for(let i=0;i<2048;i++)down[i]=(raw[i*2]+raw[i*2+1])/2;
   const result=detect(down,context.sampleRate/2);result.peak=raw.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
   document.getElementById('mic-level').value=Math.min(1,result.rms*8);
   if(calibrating){const elapsed=performance.now()-calibrating.start;
    if(elapsed<2500){calibrating.quiet.push(result.rms);status('Input check · mute your strings and stay quiet ('+Math.ceil((2500-elapsed)/1000)+'s)');}
    else if(elapsed<6500){calibrating.notes.push(result);status('Now pluck '+PracticePatterns.noteName(calibrating.target)+' repeatedly, by itself ('+Math.ceil((6500-elapsed)/1000)+'s)');}
    else{calibration=calibrationResult(calibrating.quiet,calibrating.notes,calibrating.target);calibrating=null;document.getElementById('mic-calibration-result').textContent=calibration.reason;status(calibration.ok?'Input checked · ready to score':'Input check needs another try');}
    return;
   }
   if(running&&!pausedAt&&calibration?.ok){const latency=Number(document.getElementById('mic-latency')?.value)||0;const time=performance.now()-latency;const slot=windows.slice(-4).reverse().find(w=>time>w.begin+65&&time<w.end-20);if(slot&&result.midi!==null&&result.rms>=calibration.threshold&&result.peak<.98)slot.samples.push(result.midi);}
   if(!running)status(result.peak>.98?'Input clipping · move farther away':result.midi===null?'Listening · no clear single note yet':'Hearing '+PracticePatterns.noteName(Math.round(result.midi))+(calibration?.ok?' · input checked':' · run input check to score'));
  },55);
  stream.getTracks().forEach(t=>t.onended=()=>{root.RoutineControl?.pause();close();status('Microphone disconnected · reconnect and check input before scoring');});
  }catch(error){close();throw error;}
 },
 calibrate(){if(!enabled){status('Enable the microphone first.');return;}root.stopRoutine?.();calibration=null;calibrating={start:performance.now(),target:Number(document.getElementById('mic-reference').value),quiet:[],notes:[]};document.getElementById('mic-calibration-result').textContent='Keep headphones on. First mute your strings, then follow the prompt.';},
 begin(){calibrating=null;windows=[];current=null;started=Date.now();pausedAt=0;pausedMs=0;metadata=settingSnapshot();comparable=true;running=true;},
 changed(){if(running)comparable=false;},
 pause(){if(!running||pausedAt)return;pausedAt=Date.now();if(current&&windows.at(-1)===current)windows.pop();current=null;},
 resume(){if(pausedAt){pausedMs+=Date.now()-pausedAt;pausedAt=0;}},
 expect(event,duration){current=null;if(!enabled||!calibration?.ok||event.countIn||event.rest||event.challenge||!['answer','alone'].includes(event.phase))return;const now=performance.now();current={midi:event.notes[0].midi,samples:[],begin:now,end:now+duration*1000,label:event.group.chord.name,ci:event.group.ci,type:event.group.type,step:event.step};windows.push(current);status('Listening to your turn · single notes only');},
 finish(completed){
  if(!running)return;running=false;const elapsed=Date.now()-started-pausedMs-(pausedAt?Date.now()-pausedAt:0);pausedAt=0;current=null;
  const result=summarize(windows),missed=windows.filter(w=>w.samples.length>=2&&w.samples.filter(m=>Math.abs(m-w.midi)<=.5).length/w.samples.length<.6),target=missed[0];const scored=enabled&&calibration?.ok&&windows.length;
  const feedback=scored?(result.score===null?'Not enough clear notes for a fair score. Slow down, use headphones, and pick one note at a time.':result.score>=85?'Pitch targets were mostly secure. Repeat without the diagrams before increasing tempo.':result.score>=60?'Several targets were right. Loop the suggested transition slowly and aim for the target note.':'Check your tuning, reveal the frets, and practice the suggested phrase slowly.'):'To get a score, enable the microphone, pass the input check, and play the modeled notes during answer turns. Creative challenges are not scored.';
  const node=document.getElementById('mic-result');node.textContent=(scored?`Pitch match: ${result.score===null?'not scored':result.score+'%'} · clear notes ${result.detected}/${result.total} (${result.coverage}% coverage). `:'')+feedback+' This checks single-note pitch in the expected slot, not rhythm, articulation, chords, or musical expression.';
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Expected vs detected notes';details.append(summary);const list=document.createElement('ol');
  windows.filter(w=>w.samples.length>=2).slice(0,24).forEach(w=>{const observed=[...w.samples].sort((a,b)=>a-b)[Math.floor(w.samples.length/2)],li=document.createElement('li');li.textContent=`${w.label}, step ${w.step+1}: expected ${PracticePatterns.noteName(w.midi)} · heard ${PracticePatterns.noteName(Math.round(observed))} (${Math.round((observed-w.midi)*100)} cents from target)`;list.append(li);});details.append(list);if(list.children.length)node.append(details);
  if(target){const p=document.createElement('p');p.textContent='Revisit '+PracticePatterns.noteName(target.midi)+' over '+target.label+' at step '+(target.step+1)+'.';node.append(p);const b=document.createElement('button');b.className='bak-btn small';b.textContent='Practice this transition';b.onclick=()=>root.RoutineControl?.repeat(target.ci,target.type);node.append(b);}
  const session={curriculum:'bridges-v2',id:root.crypto?.randomUUID?.()||String(Date.now()),settings:metadata,comparable:comparable&&SessionData.signature(metadata)===SessionData.signature(settingSnapshot()),assessmentVersion:2,level:root.PracticeLevels?.selected,at:Date.now(),seconds:Math.max(0,Math.round(elapsed/1000)),completed,score:scored?result.score:null,coverage:scored?result.coverage:null,exercise:document.getElementById('routine-exercise').textContent};if(session.seconds>=5&&!root.DailyPractice?.active)root.PracticeHistory?.add(session);status(enabled?'Listening · ready for another take':'Microphone off');
 },close};
document.addEventListener('visibilitychange',()=>{if(document.hidden){root.RoutineControl?.pause();close();}});
window.addEventListener('pagehide',()=>{root.stopRoutine?.();close();});
})(typeof window==='undefined'?globalThis:window);
