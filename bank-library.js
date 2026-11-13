(function (root) {
  root.mountPhraseLibrary = function ({shelf,board,draft,send,goMix}) {
    const bank=root.PhraseBank;
    const section=document.createElement('section');
    section.className='library-audio-card phrase-browser';
    section.innerHTML=`<h2>Phrase library</h2>
      <label>Style <select data-family><option>Triads</option><option>Blues</option><option>Harris</option></select></label>
      <label>Phrase <select data-phrase></select></label>
      <label>Note pattern <select data-pattern><option value="lyrical">Long pickup</option><option value="mixed">Quarter · quarter · half</option><option value="half">Half · quarter · quarter</option><option value="quarters">Quarter notes</option><option value="pickup">Beat-four pickup</option><option value="spacious">Long opening</option></select></label>
      <button data-listen>Hear phrase</button><button data-practice>Practice phrase</button><button data-mix>Use in Mixing Board</button>
      <h3>Backing tracks</h3><label>Arrangement <select data-track></select></label>
      <button data-backing>Hear backing</button><button data-use-track>Use backing</button><p data-message role="status"></p>
      <details><summary>Study sources</summary><p>Original studies develop ten motifs per style with five endings. Backings follow your progression, key and tempo.</p>
      <a href="https://online.berklee.edu/courses/private-guitar-lesson-level-5">Triad voice leading · Berklee</a> ·
      <a href="https://truefire.com/blues-guitar-lessons/kings-bb-king/c77">Blues phrasing · Andy Aledort</a> ·
      <a href="https://barryharrismethod.com/method/6.5">Surrounds · Harris workshops</a></details>`;
    shelf.querySelector('.workspace-title').after(section);
    const channel=document.createElement('div');
    channel.className='console-source';
    channel.innerHTML='<h3>Phrase & backing</h3><label>Phrase <select data-board-phrase></select></label><label>Note pattern <select data-board-pattern></select></label><label>Backing <select data-board-track></select></label>';
    board.querySelector('.console-master').before(channel);
    const get=q=>section.querySelector(q), family=get('[data-family]'), phrase=get('[data-phrase]'), track=get('[data-track]'),pattern=get('[data-pattern]'),msg=get('[data-message]');
    const boardPhrase=channel.querySelector('[data-board-phrase]'), boardTrack=channel.querySelector('[data-board-track]'),boardPattern=channel.querySelector('[data-board-pattern]');
    const option=(name,value)=>new Option(name,value);
    for(const style of ['Triads','Blues','Harris']){
      const group=document.createElement('optgroup');group.label=style;
      bank.phrases.filter(p=>p.style===style).forEach(p=>group.append(option(p.name,p.id)));
      boardPhrase.append(group);
    }
    boardPattern.innerHTML=pattern.innerHTML;
    function populate(){
      phrase.replaceChildren(...bank.phrases.filter(p=>p.style===family.value).map(p=>option(p.name,p.id)));
    }
    function fillTracks(select,cfg,selected){
      const rec=bank.recommended(cfg);
      select.replaceChildren(...bank.tracks.map(t=>option(t.name+(t.id===rec?' · recommended':''),t.id)));
      select.value=String(selected??rec);
    }
    function refresh(){
      draft.phraseId=bank.phraseFor(draft.phraseId).id;
      boardPhrase.value=draft.phraseId;boardPattern.value=draft.rhythm||'lyrical';
      fillTracks(boardTrack,draft,draft.trackId);
      fillTracks(track,{...draft,phraseId:phrase.value},draft.trackId);
    }
    family.value=bank.phraseFor(draft.phraseId).style;populate();phrase.value=bank.phraseFor(draft.phraseId).id;
    pattern.value=draft.rhythm||'lyrical';refresh();
    boardPhrase.onchange=()=>{draft.phraseId=boardPhrase.value;delete draft.trackId;refresh();};
    boardTrack.onchange=()=>{draft.trackId=+boardTrack.value;};
    boardPattern.onchange=()=>{draft.rhythm=boardPattern.value;};
    board.addEventListener('click',e=>{if(e.target.closest('[data-draft-preset]')){delete draft.trackId;refresh();}});
    function selected(){return {...draft,phraseId:phrase.value,rhythm:pattern.value,trackId:+track.value,position:draft.position||4};}
    let request=0,runner,guitar,bass,active;
    function stop(){
      request++;runner?.stop();guitar?.dispose();bass?.dispose();guitar=bass=null;active=null;
      get('[data-listen]').textContent='Hear phrase';get('[data-backing]').textContent='Hear backing';
    }
    async function hear(type){
      const same=active===type;stop();if(same)return;
      const ticket=request,cfg=selected();active=type;
      const button=get(type==='phrase'?'[data-listen]':'[data-backing]');
      button.textContent='Stop';msg.textContent='';
      try{
        await ensureTone();if(ticket!==request)return;
        guitar=StudioSound.voice('guitar');bass=StudioSound.voice('bass');
        runner=new PracticePatterns.Runner({play(e,d){
          bank.accompany(bank.tracks[cfg.trackId],e,d,guitar,bass);
          if(type==='phrase'&&e.note)guitar.triggerAttackRelease(Tone.Frequency(e.note.midi,'midi').toNote(),d*e.note.length*.92,Tone.now(),.82);
        },onFinish:stop});
        const events=AmbientLessonModel.events(cfg.rhythm,0,false,cfg);
        runner.start(type==='phrase'?events.slice(0,17):events,{bpm:cfg.tempo});
      }catch{if(ticket===request){stop();msg.textContent='Could not start audio. Tap to try again.';}}
    }
    get('[data-listen]').onclick=()=>hear('phrase');get('[data-backing]').onclick=()=>hear('backing');
    family.onchange=()=>{stop();populate();fillTracks(track,{...draft,phraseId:phrase.value});};
    phrase.onchange=()=>{stop();fillTracks(track,{...draft,phraseId:phrase.value});};
    track.onchange=pattern.onchange=stop;
    function use(){stop();Object.assign(draft,selected());refresh();}
    get('[data-practice]').onclick=()=>{use();send();};
    get('[data-mix]').onclick=()=>{use();goMix();};
    get('[data-use-track]').onclick=()=>{stop();draft.trackId=+track.value;refresh();msg.textContent='Backing selected for the Mixing Board.';};
    document.addEventListener('click',e=>{if(!section.contains(e.target)&&active)stop();},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    window.addEventListener('pagehide',stop);
  };
})(window);
