// The iPad keeps the original ZIPs in IndexedDB and expands only the selected track.
(function(root){
  async function catalog(blob){
    const tail=await blob.slice(-65557).arrayBuffer(), view=new DataView(tail);
    let end=view.byteLength-22;
    while(end>=0 && view.getUint32(end,true)!==0x06054b50)end--;
    if(end<0)throw Error('Choose an original Guitar Soloing Pro ZIP.');
    const start=view.getUint32(end+16,true),size=view.getUint32(end+12,true);
    const central=new DataView(await blob.slice(start,start+size).arrayBuffer());
    const tracks=[];
    for(let i=0;i<central.byteLength;){
      if(central.getUint32(i,true)!==0x02014b50)throw Error('Incomplete ZIP.');
      const length=central.getUint16(i+28,true);
      const path=new TextDecoder().decode(new Uint8Array(central.buffer,i+46,length));
      const name=path.split('/').pop();
      if(!path.startsWith('__MACOSX/')&&/^(Exercise-|jam-track-|Example |Jam Track )\d{2}\.mp3$/i.test(name))
        tracks.push({name,offset:central.getUint32(i+42,true),size:central.getUint32(i+20,true),method:central.getUint16(i+10,true)});
      i+=46+length+central.getUint16(i+30,true)+central.getUint16(i+32,true);
    }
    const book=tracks.some(t=>/^exercise-/i.test(t.name))?1:tracks.some(t=>/^example /i.test(t.name))?2:0;
    if(!book)throw Error('Choose the Book 1 or Book 2 MP3 ZIP.');
    return {book,tracks:tracks.sort((a,b)=>a.name.localeCompare(b.name)),blob};
  }
  async function audio(book,track){
    const header=new DataView(await book.blob.slice(track.offset,track.offset+30).arrayBuffer());
    const start=track.offset+30+header.getUint16(26,true)+header.getUint16(28,true);
    const data=book.blob.slice(start,start+track.size,'audio/mpeg');
    if(track.method===0)return data;
    if(track.method!==8)throw Error('Unsupported ZIP compression.');
    const stream=data.stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Blob([await new Response(stream).arrayBuffer()],{type:'audio/mpeg'});
  }
  root.JPBookAudio={catalog,audio};
  root.mountPrivateBooks=function(shelf){
    const panel=document.createElement('details');panel.className='workspace-details';
    panel.innerHTML='<summary>Guitar Soloing Pro</summary><label>Add book ZIPs <input type="file" accept=".zip" multiple></label><div hidden><label>Book <select></select></label> <label>Track <select></select></label> <audio controls preload="metadata"></audio></div><output role="status"></output>';
    shelf.querySelector('.library-import').before(panel);
    const [book,track]=panel.querySelectorAll('select'),player=panel.querySelector('audio'),status=panel.querySelector('output'),input=panel.querySelector('input');
    let books=[],url,version=0;
    const db=new Promise((resolve,reject)=>{const req=indexedDB.open('gtab-private-books',1);req.onupgradeneeded=()=>req.result.createObjectStore('books',{keyPath:'book'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    async function load(){const ticket=++version;player.pause();if(url)URL.revokeObjectURL(url);player.removeAttribute('src');player.load();
      try{const current=books.find(b=>b.book===+book.value);const blob=await audio(current,current.tracks[+track.value]);if(ticket!==version)return;url=URL.createObjectURL(blob);player.src=url;}catch(e){status.textContent=e.message;}}
    function select(){const current=books.find(b=>b.book===+book.value);track.replaceChildren(...current.tracks.map((t,i)=>new Option(t.name.replace(/\.mp3$/i,'').replaceAll('-',' '),i)));load();}
    async function refresh(selected){const store=(await db).transaction('books').objectStore('books');books=await new Promise((resolve,reject)=>{const r=store.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      panel.querySelector('div').hidden=!books.length;if(!books.length)return;book.replaceChildren(...books.map(b=>new Option('Book '+b.book,b.book)));if(selected)book.value=selected;select();}
    input.onchange=async()=>{input.disabled=true;let last;
      try{for(const file of input.files){const item=await catalog(file);const tx=(await db).transaction('books','readwrite');tx.objectStore('books').put(item);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});last=item.book;}await refresh(last);status.textContent='Saved on this device.';}catch(e){await refresh(last).catch(()=>{});status.textContent=e.message;}finally{input.value='';input.disabled=false;}};
    book.onchange=select;track.onchange=load;panel.ontoggle=()=>{if(!panel.open)player.pause();};
    document.addEventListener('click',e=>{if(e.target.closest('[data-screen]'))player.pause();});
    refresh().catch(()=>{status.textContent='Browser storage unavailable.';});
  };
})(typeof window==='undefined'?globalThis:window);
