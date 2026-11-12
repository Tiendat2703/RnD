// Microphone audio thread: downsample the device rate to mono PCM16 / 16 kHz.
class TeacherPcm extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.sum = 0; this.count = 0; this.consumed = 0; this.boundary = this.ratio;
    this.frame = new Int16Array(8000); this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.sum += channel[i]; this.count++; this.consumed++;
      if (this.consumed >= this.boundary) {
        const sample = Math.max(-1, Math.min(1, this.sum / this.count));
        this.frame[this.filled++] = Math.round(sample * 32767);
        this.sum = 0; this.count = 0; this.boundary += this.ratio;
        if (this.filled === this.frame.length) {
          this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
          this.frame = new Int16Array(8000); this.filled = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('teacher-pcm', TeacherPcm);
