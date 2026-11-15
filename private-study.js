(function(root){
  const mime={pdf:'application/pdf',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4'};
  async function manifest(file){
    const size=new DataView(await file.slice(0,4).arrayBuffer()).getUint32(0,true);
    if(!size||size>8e6)throw Error('Choose a GTab study pack.');
    const index=JSON.parse(await file.slice(4,size+4).text());
    if(index.format!=='gtab-study-1'||!index.shelves?.length)throw Error('Invalid study pack.');
    return {index,start:size+4};
  }
  root.mountStudyShelf=function(host){
    const panel=document.createElement('details');panel.className='workspace-details';
    panel.innerHTML='<summary>Private study library</summary><label>Add study pack <input type="file" accept=".gtab"></label><div hidden><label>Collection <select></select></label> <label>Study <select></select></label><p></p><a target="_blank" rel="noopener">Open study</a><audio controls preload="none" hidden></audio></div><output role="status"></output>';
    host.querySelector('.library-import').before(panel);
    const [collection,study]=panel.querySelectorAll('select'),player=panel.querySelector('audio'),open=panel.querySelector('a'),input=panel.querySelector('input'),status=panel.querySelector('output');
    let source,items,start,url;
    function choose(){player.pause();player.removeAttribute('src');player.load();if(url)URL.revokeObjectURL(url);url=null;
      const row=items[+collection.value].items[+study.value];panel.querySelector('p').textContent=row.cue||'';
      const ext=row.name.split('.').pop().toLowerCase();const audio=['mp3','m4a','wav'].includes(ext)&&!row.url;
      player.hidden=!audio;open.hidden=audio;open.removeAttribute('download');open.removeAttribute('href');
      if(row.url){const link=new URL(row.url);if(link.protocol==='https:')open.href=link.href;open.textContent='Open lesson';}
      else{url=URL.createObjectURL(source.slice(start+row.at,start+row.at+row.bytes,mime[ext]||'application/octet-stream'));
        if(audio)player.src=url;else{open.href=url;open.textContent=ext==='pdf'?'Open PDF':'Save file';if(ext!=='pdf')open.download=row.name;}}
    }
    function list(){study.replaceChildren(...items[+collection.value].items.map((r,i)=>new Option(r.name,i)));choose();}
    async function show(file){const parsed=await manifest(file);source=file;items=parsed.index.shelves;start=parsed.start;
      collection.replaceChildren(...items.map((r,i)=>new Option(r.name,i)));panel.querySelector('div').hidden=false;list();}
    collection.onchange=list;study.onchange=choose;
    const db=new Promise((resolve,reject)=>{const r=indexedDB.open('gtab-study-pack',1);r.onupgradeneeded=()=>r.result.createObjectStore('shelf');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    db.then(d=>{const r=d.transaction('shelf').objectStore('shelf').get('pack');r.onsuccess=()=>{if(r.result&&!source)show(r.result).catch(()=>{});};}).catch(()=>{});
    input.onchange=async()=>{const file=input.files[0];if(!file)return;input.disabled=true;try{await show(file);status.textContent='Saving on this device…';const tx=(await db).transaction('shelf','readwrite');tx.objectStore('shelf').put(file,'pack');await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});status.textContent='Saved on this device.';}catch{status.textContent=source===file?'Available now. Reopen the file next time if storage is full.':'Could not open this study pack.';}finally{input.disabled=false;input.value='';}};
    panel.ontoggle=()=>{if(!panel.open)player.pause();};document.addEventListener('click',e=>{if(e.target.closest('[data-screen]'))player.pause();});
  };
})(window);
