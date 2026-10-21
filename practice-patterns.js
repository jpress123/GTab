/* Shared tab-to-pitch model and cancellable finite practice transport. */
(function(root){
  const OPEN={e:64,B:59,G:55,D:50,A:45,E:40};
  const INTERVALS=['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];
  const COLORS=['#c7e88a','#e8a5c2','#8fd4e5','#e5b27c','#f0d17b','#a7c9f2','#ee9c9c','#c2b0f0','#dcb2e5','#a4d2b0','#e2bca6','#bcc9e5'];
  const PITCHES=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const interval=(midi,root)=>((midi-root)%12+12)%12;
  const noteName=midi=>PITCHES[midi%12]+(Math.floor(midi/12)-1);
  function parse(lines){
    if(typeof lines==='string')lines=lines.split('\n');
    const sections=[];let rows=[];
    for(const line of lines){if(!line.trim()){if(rows.length)sections.push(rows);rows=[];}else if(OPEN[line[0]]!==undefined&&line[1]==='|')rows.push(line);}
    if(rows.length)sections.push(rows);
    const events=[];
    sections.forEach((rows,section)=>{
      const columns=new Map();
      rows.forEach(line=>{
        const string=line[0],body=line.slice(2);
        for(const token of body.matchAll(/\d+/g)){
          const fret=Number(token[0]);if(fret>24)continue;
          const at=token.index,previous=body[at-1]||'';
          const note={string,fret,midi:OPEN[string]+fret,column:at,section,technique:/[bhrp]/.test(previous)?previous:''};
          if(!columns.has(at))columns.set(at,[]);columns.get(at).push(note);
        }
      });
      [...columns.entries()].sort((a,b)=>a[0]-b[0]).forEach(([column,notes])=>events.push({index:events.length,section,column,notes}));
    });
    return {events,sections};
  }
  function sequence(model,root){
    return model.events.map((event,i)=>{
      const before=model.events[i-1];let movement='';
      if(before&&before.notes.length===1&&event.notes.length===1){
        const delta=event.notes[0].midi-before.notes[0].midi;
        const names=['unison','m2','M2','m3','M3','P4','tritone','P5','m6','M6','m7','M7','octave'];
        movement=`<span class="interval-move">${delta===0?'→':delta>0?'↑':'↓'} ${names[Math.abs(delta)]||Math.abs(delta)+' st'}</span>`;
      }
      return movement+`<div class="pattern-step" data-event="${i}"><small>${i+1}</small>${event.notes.map(n=>`<span class="degree-chip" style="--degree:${COLORS[interval(n.midi,root)]}">${INTERVALS[interval(n.midi,root)]}<small>${noteName(n.midi)}</small></span>`).join('')}</div>`;
    }).join('');
  }
  function board(model,root){
    const notes=model.events.flatMap(e=>e.notes),frets=notes.map(n=>n.fret);
    const min=Math.min(...frets),max=Math.max(...frets),start=Math.max(0,min-1),end=Math.max(start+4,max+1);
    const width=70+(end-start+1)*62,strings=['e','B','G','D','A','E'];
    let svg=`<svg class="interval-neck" width="${width}" height="259" viewBox="0 0 ${width} 259" role="img" aria-label="Interval positions on the guitar neck, high E at top, relative to ${PITCHES[root]}"><rect x="42" y="38" width="${width-55}" height="185" rx="5" fill="#654126"/>`;
    for(let f=start;f<=end;f++){
      const x=75+(f-start)*62;
      svg+=`<text x="${x}" y="23" class="neck-fret">${f===0?'Open':f}</text><line x1="${x+31}" x2="${x+31}" y1="38" y2="223" stroke="#b2ab98" stroke-width="${f===0?5:2}"/>`;
    }
    strings.forEach((string,i)=>{
      const y=48+i*33;
      svg+=`<text x="18" y="${y+5}" class="neck-string">${string}</text><line x1="42" x2="${width-13}" y1="${y}" y2="${y}" stroke="#d2c8b5" stroke-width="${1+i*.35}"/>`;
    });
    const positions=new Map();
    model.events.forEach(event=>event.notes.forEach(n=>{const key=n.string+':'+n.fret;if(!positions.has(key))positions.set(key,{...n,events:[]});positions.get(key).events.push(event.index);}));
    for(const n of positions.values()){
      const x=75+(n.fret-start)*62,y=48+strings.indexOf(n.string)*33,degree=interval(n.midi,root);
      svg+=`<g data-pattern-events="${n.events.join(',')}"><title>${esc(n.string+' string, fret '+n.fret+', '+noteName(n.midi)+', interval '+INTERVALS[degree]+', steps '+n.events.map(x=>x+1).join(', '))}</title><circle cx="${x}" cy="${y}" r="14" fill="${COLORS[degree]}" stroke="#242b20" stroke-width="2"/><text x="${x}" y="${y+5}" class="neck-degree">${INTERVALS[degree]}</text></g>`;
    }
    return svg+'<text x="45" y="250" class="neck-caption">High e → low E · dots show intervals, not fingers</text></svg>';
  }
  function tabs(model,root,labelMode='both'){
    return model.sections.map((rows,section)=>{
      const width=Math.max(440,...rows.map(l=>l.length*23+65)),height=rows.length*50+25;
      let svg=`<svg class="interval-tab" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tab and root-relative intervals for passage ${section+1}">`;
      rows.forEach((line,row)=>{
        const y=27+row*50,body=line.slice(2);
        svg+=`<text x="13" y="${y+6}" class="tab-string">${esc(line[0])}</text><line x1="40" x2="${width-16}" y1="${y}" y2="${y}" stroke="#aaa99b"/>`;
        for(const token of body.matchAll(/\d+|[a-zA-Z~\/\\]+|\|/g)){
          const x=48+token.index*23;
          if(/^\d+$/.test(token[0])){
            const fret=Number(token[0]),midi=OPEN[line[0]]+fret,degree=interval(midi,root);
            const event=model.events.find(e=>e.section===section&&e.column===token.index);
            if(!event)continue;
            svg+=`<g data-event="${event.index}"><rect x="${x-6}" y="${y-16}" width="${Math.max(30,token[0].length*18+6)}" height="43" rx="5" fill="${COLORS[degree]}"/><text x="${x}" y="${y+5}" class="tab-fret">${labelMode==='intervals'?INTERVALS[degree]:fret}</text><text x="${x}" y="${y+21}" class="tab-degree">${labelMode==='intervals'?noteName(midi):INTERVALS[degree]}</text></g>`;
          }else if(token[0]==='|')svg+=`<line x1="${x}" x2="${x}" y1="${y-10}" y2="${y+10}" stroke="#8b8e7e"/>`;
          else svg+=`<text x="${x}" y="${y-2}" class="tab-technique">${esc(token[0])}</text>`;
        }
      });
      return `<div class="tab-passage" tabindex="0" aria-label="Scroll interval tab passage ${section+1}">${svg}</svg></div>`;
    }).join('');
  }
  class Runner{
    constructor({play,onStep=()=>{},onFinish=()=>{},setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){Object.assign(this,{play,onStep,onFinish,setTimer,clearTimer});this.generation=0;this.running=false;this.speed=100;}
    start(events,{bpm=100,speed=100,repetitions=1}={}){
      this.stop();if(!events.length)return;
      this.events=events;this.bpm=Math.max(20,Math.min(300,Number(bpm)||100));this.setSpeed(speed);
      this.repetitions=Math.max(1,Math.min(32,Math.floor(Number(repetitions)||1)));this.index=0;this.repeat=1;this.running=true;
      this.tick(this.generation);
    }
    setSpeed(value){this.speed=Math.max(25,Math.min(200,Number(value)||100));}
    tick(generation){
      if(!this.running||generation!==this.generation)return;
      const duration=30000/(this.bpm*this.speed/100);
      this.play(this.events[this.index],duration/1000);this.onStep(this.index,this.repeat,this.repetitions);
      this.timer=this.setTimer(()=>{
        if(!this.running||generation!==this.generation)return;
        this.index++;
        if(this.index===this.events.length){this.index=0;this.repeat++;}
        if(this.repeat>this.repetitions){this.running=false;this.onFinish();return;}
        this.tick(generation);
      },duration);
    }
    stop(){this.running=false;this.generation++;if(this.timer!==undefined)this.clearTimer(this.timer);}
  }
  root.PracticePatterns={parse,interval,noteName,sequence,board,tabs,Runner,INTERVALS,COLORS};
})(typeof window==='undefined'?globalThis:window);
