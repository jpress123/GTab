/* Original SVG guitar notation. String order is low E to high E. */
window.GuitarNotation = (() => {
  const tuning=[40,45,50,55,59,64];
  const names=['E','A','D','G','B','E'];
  const shapes={
    C:[[-1,3,2,0,1,0],[0,3,2,0,1,0]], D:[[-1,-1,0,2,3,2],[0,0,0,1,3,2]],
    E:[[0,2,2,1,0,0],[0,2,3,1,0,0]], G:[[3,2,0,0,0,3],[2,1,0,0,0,3]],
    A:[[-1,0,2,2,2,0],[0,0,1,2,3,0]], F:[[1,3,3,2,1,1],[1,3,4,2,1,1]],
    Am:[[-1,0,2,2,1,0],[0,0,2,3,1,0]], Em:[[0,2,2,0,0,0],[0,2,3,0,0,0]],
    Dm:[[-1,-1,0,2,3,1],[0,0,0,2,3,1]], Bm:[[-1,2,4,4,3,2],[0,1,3,4,2,1]],
    A7:[[-1,0,2,0,2,0],[0,0,1,0,2,0]], D7:[[-1,-1,0,2,1,2],[0,0,0,2,1,3]],
    E7:[[0,2,0,1,0,0],[0,2,0,1,0,0]], B7:[[-1,2,1,2,0,2],[0,2,1,3,0,4]],
    F7:[[1,3,1,2,1,1],[1,3,1,2,1,1]], Cm7:[[-1,3,5,3,4,3],[0,1,3,1,2,1]],
    Bbmaj7:[[-1,1,3,2,3,-1],[0,1,3,2,4,0]],
    E5:[[0,2,2,-1,-1,-1],[0,1,2,0,0,0]], 'Db5':[[-1,4,6,6,-1,-1],[0,1,3,4,0,0]],
    B5:[[-1,2,4,4,-1,-1],[0,1,3,4,0,0]], A5:[[-1,0,2,2,-1,-1],[0,0,1,2,0,0]]
  };
  const pcs={C:0,Db:1,D:2,Eb:3,E:4,F:5,Gb:6,G:7,Ab:8,A:9,Bb:10,B:11};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function shape(name){
    if(shapes[name])return {frets:[...shapes[name][0]],fingers:[...shapes[name][1]],generated:false};
    const match=/^([A-G]b?)(m|dim|aug)?$/.exec(name);
    if(!match)return null;
    const root=pcs[match[1]],quality=match[2]||'';
    const intervals=quality==='m'?[0,3,7]:quality==='dim'?[0,3,6]:quality==='aug'?[0,4,8]:[0,4,7];
    const tones=intervals.map(x=>(root+x)%12);
    let best=null;
    // Closed triads on the top three strings, with at most three frets of stretch.
    for(let g=1;g<=12;g++)for(let b=1;b<=12;b++)for(let e=1;e<=12;e++){
      const frets=[g,b,e],notes=frets.map((f,i)=>(tuning[i+3]+f)%12);
      if(new Set(notes).size!==3||!notes.every(n=>tones.includes(n)))continue;
      const span=Math.max(...frets)-Math.min(...frets);
      if(span>3)continue;
      const score=Math.max(...frets)+span*2;
      if(!best||score<best.score)best={frets,score};
    }
    if(!best)return null;
    return {frets:[-1,-1,-1,...best.frets],fingers:[0,0,0,...best.frets],generated:true};
  }
  function midi(name){const s=shape(name);return s?s.frets.flatMap((f,i)=>f<0?[]:[tuning[i]+f]):[];}
  let serial=0;
  function diagram(name){
    const s=shape(name);if(!s)return `<p>Shape unavailable for ${escape(name)}</p>`;
    const id='neck-'+serial++,positive=s.frets.filter(f=>f>0);
    const start=Math.max(...positive)>4?Math.min(...positive):1;
    const description=s.frets.map((f,i)=>`${names[i]} string ${f<0?'muted':f===0?'open':'fret '+f}`).join(', ');
    let svg=`<svg class="neck-svg" viewBox="0 0 330 250" role="img" aria-label="${escape(name+': '+description)}"><defs><linearGradient id="${id}" x2="1" y2="0"><stop stop-color="#50301c"/><stop offset=".35" stop-color="#ac7139"/><stop offset=".7" stop-color="#85512b"/><stop offset="1" stop-color="#4e301f"/></linearGradient></defs><rect x="39" y="44" width="160" height="224" rx="3" fill="url(#${id})"/>`;
    for(let i=0;i<14;i++)svg+=`<path d="M ${42+i*12} 45 v 222" stroke="#e5ad62" opacity=".07"/>`;
    if(start===1)svg+='<rect x="39" y="42" width="160" height="7" rx="2" fill="#ece4cd"/>';
    for(let f=0;f<=4;f++){
      const y=46+f*55;
      svg+=`<line x1="39" y1="${y}" x2="199" y2="${y}" stroke="#251c16" stroke-width="5"/><line x1="39" y1="${y-1}" x2="199" y2="${y-1}" stroke="#b0aaa0" stroke-width="2"/>`;
      if(f<4)svg+=`<text x="21" y="${y+31}" class="fret-number">${start+f}</text>`;
    }
    for(let i=0;i<6;i++){
      const x=44+i*30, fret=s.frets[i];
      svg+=`<line x1="${x+1}" y1="47" x2="${x+1}" y2="267" stroke="#211a13" stroke-width="${3.8-i*.42}"/><line x1="${x}" y1="46" x2="${x}" y2="267" stroke="#d7d5c9" stroke-width="${2.9-i*.4}"/>`;
      if(fret<=0)svg+=`<text x="${x}" y="292" class="string-state">${fret<0?'×':'○'}</text>`;
      else {
        const y=46+(fret-start+.5)*55;
        svg+=`<circle cx="${x}" cy="${y+2}" r="13" fill="#211a12" opacity=".6"/><circle cx="${x}" cy="${y}" r="13" fill="#faf9ef" stroke="#aaa99d" stroke-width="1.5"/><text x="${x}" y="${y+5}" class="finger-number">${s.fingers[i]}</text>`;
      }
      svg+=`<text x="${x}" y="29" class="string-label">${names[i]}</text>`;
    }
    // Rotate the neck counterclockwise, but keep labels upright for reading.
    svg=svg.replace('</defs>','</defs><g transform="translate(0 230) rotate(-90)">');
    svg=svg.replace(/<text x="([^"]+)" y="([^"]+)" class="([^"]+)"/g,(_,x,y,cls)=>`<text transform="rotate(90 ${x} ${cls==='finger-number'?Number(y)-5:y})" x="${x}" y="${y}" class="${cls}"`);
    return svg+`</g><text x="165" y="242" class="diagram-caption">${s.generated?'Dots show fret numbers':'Dots show fingers · 1–4'}</text></svg>`;
  }
  function card(name,sub=''){
    return `<button class="fretboard-card" data-chord="${escape(name)}" aria-label="Play ${escape(name)} chord"><span class="shape-name">${escape(name)}</span>${diagram(name)}<span class="shape-foot">${escape(sub||'Click to hear chord')} <span aria-hidden="true">▷</span></span></button>`;
  }
  function tabs(lines){
    const groups=[];let group=[];
    for(const line of lines){if(!line.trim()){if(group.length)groups.push(group);group=[];}else group.push(line);}if(group.length)groups.push(group);
    return groups.map((group,section)=>{
      const width=Math.max(420,...group.map(l=>60+l.length*13)),height=group.length*34+30;
      let svg=`<svg class="tab-staff" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tablature passage ${section+1}: ${escape(group.join(' '))}">`;
      group.forEach((line,row)=>{
        const y=25+row*34,body=line.slice(2);
        svg+=`<text x="12" y="${y+6}" class="tab-string">${escape(line[0])}</text><line x1="40" y1="${y}" x2="${width-16}" y2="${y}" stroke="#9d9f91"/>`;
        for(const token of body.matchAll(/\d+|[a-zA-Z~\/\\]+|\|/g)){
          const x=45+token.index*13;
          if(token[0]==='|')svg+=`<line x1="${x}" y1="${y-10}" x2="${x}" y2="${y+10}" stroke="#7c806d"/>`;
          else svg+=`<rect x="${x-3}" y="${y-12}" width="${token[0].length*13+5}" height="25" rx="3" fill="#f5f4e9"/><text x="${x}" y="${y+6}" class="tab-fret">${escape(token[0])}</text>`;
        }
      });
      return `<div class="tab-passage" tabindex="0" aria-label="Scroll tablature passage ${section+1}">${svg}</svg></div>`;
    }).join('');
  }
  return {shape,midi,diagram,card,tabs};
})();
