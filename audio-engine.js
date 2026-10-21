/* Recorded instruments with a shared, restrained studio effects chain. */
window.StudioSound = (() => {
  let ready, bus;
  const buffers = {guitar: {}, bass: {}};
  const names = {
    guitar: ['E2','A2','C3','E3','G3','A3','C4','E4','G4','A4','C5','D5'],
    bass: ['E1','G1','Cs2','E2','G2','As2','Cs3','E3']
  };
  async function load() {
    if (ready) return ready;
    ready = (async () => {
      const loaded = [];
      try {
        await Promise.all(Object.entries(names).flatMap(([kind, notes]) => notes.map(name => new Promise((resolve, reject) => {
          const folder = kind === 'guitar' ? 'guitar-acoustic' : 'bass-electric';
          const buffer = new Tone.ToneAudioBuffer(`assets/samples/${folder}/${name}.mp3`, () => {
            buffers[kind][name.replace('s', '#')] = buffer.get();
            loaded.push(buffer);
            resolve();
          }, reject);
        }))));
        const limiter = new Tone.Limiter(-1).toDestination();
        const compressor = new Tone.Compressor({threshold:-20, ratio:2.5, attack:.02, release:.18}).connect(limiter);
        const room = new Tone.Reverb({decay:1.1, preDelay:.015, wet:.12}).connect(compressor);
        await room.generate();
        bus = new Tone.Filter({frequency:7600, type:'lowpass', rolloff:-12}).connect(room);
      } catch (error) {
        loaded.forEach(buffer => buffer.dispose());
        ready = null;
        throw new Error('Instrument samples could not load. Reload the page and try again.');
      }
    })();
    return ready;
  }
  function voice(kind = 'guitar') {
    const voice = new Tone.Sampler({urls:buffers[kind], attack:.003, release:kind === 'bass' ? .18 : .35, curve:'exponential'}).connect(bus);
    voice.volume.value = kind === 'bass' ? -8 : -10;
    return voice;
  }
  return {load, voice};
})();
