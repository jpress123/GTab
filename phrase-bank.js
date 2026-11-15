// Original studies: ten melodic cells in each idiom, each developed with five cadences.
(function (root) {
  const styles = {
    Triads: [
      ['Homeward', '135'], ['Falling third', '533'], ['Open sky', '151'],
      ['Third first', '315'], ['Echo the fifth', '553'], ['Return home', '313'],
      ['Wide arc', '513'], ['Quiet climb', '113'], ['Inversion', '351'], ['Answer below', '531']
    ],
    Blues: [
      ['Porch call', '1b3'], ['Sweet third', 'b35'], ['Long reply', '55s'],
      ['Blue question', 'b15'], ['Leave a breath', '515'], ['Gospel lift', '35s'],
      ['Turnaround', 'v53'], ['Minor sigh', '5fb'], ['High answer', '59s'], ['Bent colour', 'fb1']
    ],
    Harris: [
      ['Third and turn', '135'], ['Pivot home', '513'], ['Seventh pickup', 'v53'],
      ['Falling line', '953'], ['Third in the air', '353'], ['Neighbour echo', '919'],
      ['Rising answer', '359'], ['Delayed root', '311'], ['Guide-tone arc', '3v5'], ['Return from five', '531']
    ]
  };
  styles.Enclosures=[['Close surround','135'],['Echo','351'],['Fifth first','513']];
  styles.Licks=[['Rising hook','139'],['Falling answer','s53'],['Blue turn','5b1']];
  const endings = {
    Enclosures:['Above–below','Below–above'],Licks:['Pickup','Reply'],
    Triads: ['Nearest tone','Third to third','Fifth to root','Root to fifth','Common tone'],
    Blues: ['Low reply','Sweet third','Fifth answer','Ninth colour','Blue seventh'],
    Harris: ['Above–below','Below–above','Whole step above','Whole step below','Wide surround']
  };
  const phrases = Object.entries(styles).flatMap(([style, cells]) => cells.flatMap(([name, cell], i) =>
    endings[style].map((ending, variant) => ({
      id: style.toLowerCase()+'-'+(i*5+variant+1), style, cell, variant,
      name: name+' · '+ending
    }))));
  for (const song of root.JazzStandards || []) {
    phrases.push({id:'standard-'+song.id, name:song.name, style:'Jazz standards', song});
  }
  const rhythms = {mixed:[0,2,4],half:[0,4,6],lyrical:[0,2,4,7], quarters:[0,2,4,6], pickup:[0,3,6,7], spacious:[0,4,6,7]};
  // Bass attacks and guitar attacks are eighth-note positions within each bar.
  const tracks = [
    ['Evening drone','minor',[0],[0]], ['Slow arpeggio','minor',[0,4],[0,2,4,6]],
    ['Open road','classic',[0,4],[0,3,6]], ['Rock pulse','classic',[0,2,4,6],[2,6]],
    ['Desert pulse','andalusian',[0,6],[0,3,4]], ['Spanish dusk','andalusian',[0,4],[0,2,5,7]],
    ['Blue conversation','blues',[0,4],[2,6]], ['Back porch','blues',[0,3,4,7],[0,4,6]],
    ['Late ii–V','sevenths',[0,2,4,6],[1,4]], ['Quiet standard','sevenths',[0,4],[0,5]]
  ].map(([name,preset,bass,chords],id)=>({id,name,preset,bass,chords}));
  function phraseFor(id){return phrases.find(p=>p.id===id)||phrases[0];}
  function recommended(config){
    const pair=tracks.filter(t=>t.preset===config.preset);
    return (pair[phraseFor(config.phraseId).style==='Harris'?1:0]||tracks[0]).id;
  }
  function third(chord){return /m(?!aj)|dim/.test(chord.name)?3:4;}
  function degree(symbol,chord){
    return chord.pc+({'1':0,'3':third(chord),'5':7,'9':14,b:3,f:5,s:9,v:10}[symbol]);
  }
  function nearest(pc,around){return around+((pc-around+126)%12)-6;}
  function landing(chord,phrase,bar){
    const offsets=phrase.style==='Blues'?[0,third(chord),7,14,10]:[bar%2?0:third(chord),third(chord),0,7,bar%2?7:0];
    const tone=phrase.style==='Harris'?third(chord):offsets[phrase.variant];
    return nearest(chord.pc+tone,bar%2?64:62);
  }
  function compose(config,chords,rhythm,variation=0){
    const seed=phraseFor(config.phraseId);
    const family=phrases.filter(p=>p.style===seed.style);
    const phrase=family[(family.indexOf(seed)+variation)%family.length];
    const onsets=rhythms[rhythm]||rhythms.lyrical;
    const strings=['e','B','G','D','A','E'],open=[64,59,55,50,45,40];
    const first=config.position??4, width=config.width||5, positions=[];
    open.forEach((pitch,i)=>{for(let fret=first;fret<first+width;fret++)positions.push({midi:pitch+fret,string:strings[i],fret});});
    if (seed.song) {
      const transpose=(config.key-seed.song.key+18)%12-6;
      return seed.song.notes.map(([step,midi,length])=>{
        const pitch=midi+transpose;
        const candidates=positions.filter(p=>(p.midi-pitch)%12===0);
        const pool=candidates.length?candidates:open.map((m,i)=>({midi:pitch,string:strings[i],fret:pitch-m})).filter(p=>p.fret>=0&&p.fret<=24);
        const cost=p=>Math.abs(p.midi-pitch)*4+Math.abs(p.fret-first-2);
        return {...pool.sort((a,b)=>cost(a)-cost(b))[0],step,length};
      });
    }
    return chords.flatMap((chord,bar)=>{
      const target=landing(chord,phrase,bar), next=landing(chords[(bar+1)%chords.length],phrase,(bar+1)%chords.length);
      const cell=phrase.cell;
      let pitches=[target,nearest(degree(cell[0],chord),target),nearest(degree(cell[1],chord),target),nearest(degree(cell[2],chord),next)];
      if(['Harris','Enclosures'].includes(phrase.style)){
        const surrounds=[[1,-1],[-1,1],[2,-1],[-2,1],[2,-2]];
        const [above,below]=surrounds[phrase.variant];
        pitches[1]=nearest(degree(cell[bar%3],chord),target);
        pitches[2]=next+above;pitches[3]=next+below;
      }else if(bar%2){
        pitches[1]=nearest(degree(cell[2],chord),target);
        pitches[2]=nearest(degree(cell[1],chord),pitches[1]);
        const candidates=(phrase.style==='Triads'?[0,third(chord),7]:[0,3,5,7,10]).map(n=>nearest(chord.pc+n,next));
        pitches[3]=candidates.sort((a,b)=>Math.abs(a-next)-Math.abs(b-next))[0];
      }
      if(onsets.length===3)pitches=[pitches[0],pitches[2],pitches[3]];
      const steps=[...onsets];
      if(config.passing){
        for(let i=steps.length-1;i>0;i--){
          if(steps[i]-steps[i-1]<2||Math.abs(pitches[i]-pitches[i-1])<2)continue;
          steps.splice(i,0,steps[i]-1);
          pitches.splice(i,0,pitches[i]+Math.sign(pitches[i-1]-pitches[i]));
          break;
        }
      }
      let last;
      return pitches.map((pitch,i)=>{
        if(Number.isInteger(config.weeklyKey))pitch+=(config.key-config.weeklyKey+12)%12;
        const available=positions.filter(pos=>(pos.midi-pitch)%12===0);
        const cost=p=>Math.abs(p.midi-pitch)*3+(last?Math.abs(p.fret-last.fret):0);
        last=available.sort((a,b)=>cost(a)-cost(b))[0];
        const end=steps[i+1]??8;
        const breath=(rhythm==='lyrical'||rhythm==='spacious')&&(i===1||i===3&&bar%2);
        return {...last,step:bar*8+steps[i],length:Math.max(1,end-steps[i]-(breath?1:0))};
      });
    });
  }
  function accompany(track,e,d,guitar,bass){
    const beat=e.step%8,time=Tone.now();
    const note=m=>Tone.Frequency(m,'midi').toNote();
    if(track.bass.includes(beat))bass.triggerAttackRelease(note(e.voicing[0]+(beat===4&&track.bass.length>2?7:0)),d*1.8,time,.48);
    if(track.chords.includes(beat)){
      const chord=e.voicing.slice(1);
      if(track.id===1||track.id===5)guitar.triggerAttackRelease(note(chord[track.chords.indexOf(beat)%chord.length]),d*2.4,time,.4);
      else chord.forEach((m,i)=>guitar.triggerAttackRelease(note(m),d*(track.chords.length===1?7.6:1.6),time+i*.017,.26));
    }
  }
  function turns(events,respond){
    if(!respond)return events;
    const intro=events.filter(e=>e.countIn),bars=events.filter(e=>!e.countIn);
    for(let i=0;i<bars.length;i+=16){
      const pair=bars.slice(i,i+16);
      for(const turn of ['Listen','Answer'])intro.push(...pair.map(e=>({...e,turn})));
    }
    return intro;
  }
  root.PhraseBank={phrases,tracks,rhythms,compose,phraseFor,recommended,accompany,turns};
})(typeof window==='undefined'?globalThis:window);
