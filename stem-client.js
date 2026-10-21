/* One Web Audio clock for every stem: seeks, loops and rate changes restart together. */
class StemMixer {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = {};
    this.gains = {};
    this.sources = [];
    this.started = 0;
    this.offset = 0;
    this.rate = 1;
    this.running = false;
    this.disposed = false;
    this.generation = 0;
    this.output = this.context.createDynamicsCompressor();
    this.output.threshold.value = -3;
    this.output.ratio.value = 12;
    this.output.connect(this.context.destination);
  }
  async load(stems, signal) {
    // Sequential decoding bounds temporary memory for long tracks.
    for (const [name, url] of Object.entries(stems)) {
      const response = await fetch(url, {signal});
      if (!response.ok) throw new Error('Could not download separated audio. Try separating again.');
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      if (signal.aborted || this.disposed) throw new DOMException('Cancelled', 'AbortError');
      this.buffers[name] = buffer;
      const gain = this.context.createGain();
      gain.connect(this.output);
      this.gains[name] = gain;
    }
  }
  mix(levels, muted) {
    for (const [name, gain] of Object.entries(this.gains)) {
      const group = ['guitar','bass','drums'].includes(name) ? name : 'other';
      gain.gain.setTargetAtTime(muted[group] ? 0 : levels[group], this.context.currentTime, .015);
    }
  }
  async start(offset, rate) {
    const generation = ++this.generation;
    await this.context.resume();
    if (this.disposed || generation !== this.generation) return;
    this.stop();
    this.offset = offset;
    this.rate = rate;
    this.started = this.context.currentTime + .025;
    for (const [name, buffer] of Object.entries(this.buffers)) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.connect(this.gains[name]);
      source.start(this.started, Math.min(offset, Math.max(0, buffer.duration - .001)));
      this.sources.push(source);
    }
    this.running = true;
  }
  sync(position, rate) {
    const expected = this.offset + Math.max(0, this.context.currentTime - this.started) * this.rate;
    if (this.running && (Math.abs(position - expected) > .12 || rate !== this.rate)) {
      this.start(position, rate).catch(() => this.stop());
    }
  }
  stop() {
    this.generation++;
    for (const source of this.sources) {try {source.stop();} catch {} source.disconnect();}
    this.sources = [];
    this.running = false;
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers = {};
    this.context.close();
  }
}
window.StemMixer = StemMixer;
