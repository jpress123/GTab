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
root.PitchAssessment={detect,summarize};if(typeof document==='undefined')return;
let stream,context,analyser,timer,windows=[],current,started=0,generation=0,enabled=false,running=false;
function status(text){const n=document.getElementById('mic-status');if(n)n.textContent=text;}
function close(){generation++;enabled=false;clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;context?.close().catch(()=>{});context=null;status('Microphone off');const b=document.getElementById('mic-enable');if(b)b.textContent='Enable microphone';}
root.PlayingCoach={
 get enabled(){return enabled;},
 async enable(){
  if(enabled){close();return;}
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs Safari/Chrome on HTTPS (or localhost).');
  const request=++generation;context=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
  try{const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});if(request!==generation){media.getTracks().forEach(t=>t.stop());return;}stream=media;analyser=context.createAnalyser();analyser.fftSize=4096;context.createMediaStreamSource(stream).connect(analyser);enabled=true;document.getElementById('mic-enable').textContent='Turn microphone off';status('Listening · play one clear note to check the level');
  const raw=new Float32Array(4096),down=new Float32Array(2048);
  timer=setInterval(()=>{if(!context||context.state!=='running')return;analyser.getFloatTimeDomainData(raw);for(let i=0;i<2048;i++)down[i]=(raw[i*2]+raw[i*2+1])/2;const result=detect(down,context.sampleRate/2);document.getElementById('mic-level').value=Math.min(1,result.rms*8);if(current&&performance.now()>current.begin+65&&performance.now()<current.end-20&&result.midi!==null)current.samples.push(result.midi);if(!running)status(result.rms>.95?'Input clipping · move farther away':result.midi===null?'Listening · no clear single note yet':'Hearing '+PracticePatterns.noteName(Math.round(result.midi))+' · ready');},55);
  stream.getTracks().forEach(t=>t.onended=()=>{close();status('Microphone disconnected · reconnect before scoring');});
  }catch(error){close();throw error;}
 },
 begin(){windows=[];current=null;started=Date.now();running=true;},
 expect(event,duration){current=null;if(!enabled||event.countIn||event.rest||!['answer','alone'].includes(event.phase))return;const now=performance.now();current={midi:event.notes[0].midi,samples:[],begin:now,end:now+duration*1000,label:event.group.chord.name};windows.push(current);status('Listening to your turn · single notes only');},
 finish(completed){if(!running)return;running=false;current=null;const result=summarize(windows);const missed=windows.filter(w=>w.samples.length>=2&&w.samples.filter(m=>Math.abs(m-w.midi)<=.5).length/w.samples.length<.6);const target=missed[0];const scored=enabled&&windows.length;const feedback=scored?(result.score===null?'Not enough clear notes for a fair score. Slow down, use headphones, and pick one note at a time.':result.score>=85?'Pitch targets were mostly secure. Repeat without the diagrams before increasing tempo.':result.score>=60?'Several targets were right. Loop two chords slowly and aim for the first note of each phrase.':'Pitch targets need work. Check your tuning, reveal the frets, and practice one phrase slowly.'):'Enable the microphone and choose Listen → answer → play alone to receive measured pitch feedback.';
 const node=document.getElementById('mic-result');node.textContent=(scored?`Pitch match: ${result.score===null?'not scored':result.score+'%'} · clear notes ${result.detected}/${result.total} (${result.coverage}% coverage). `:'')+feedback+(target?' First target to revisit: '+PracticePatterns.noteName(target.midi)+' over '+target.label+'.':'')+' This checks single-note pitch during the expected slot, not rhythm, articulation, chords, or musical expression.';
 const session={level:root.PracticeLevels?.selected,at:Date.now(),seconds:Math.round((Date.now()-started)/1000),completed,score:scored?result.score:null,coverage:scored?result.coverage:null,exercise:document.getElementById('routine-exercise').textContent};if(session.seconds>=5)root.PracticeHistory?.add(session);status(enabled?'Listening · ready for another take':'Microphone off');
 },close};
document.addEventListener('visibilitychange',()=>{if(document.hidden){root.stopRoutine?.();close();}});
window.addEventListener('pagehide',close);
})(typeof window==='undefined'?globalThis:window);
