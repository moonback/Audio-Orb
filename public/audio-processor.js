class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.byteIndex = 0;
    this.isSilent = false;
    this.silenceThreshold = 0.01;
    this.silenceFrames = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channel0 = input[0];

    if (!channel0) return true;

    let sum = 0;
    for (let i = 0; i < channel0.length; i++) {
      const sample = channel0[i];
      sum += sample * sample;
      this.buffer[this.byteIndex++] = sample;
      
      if (this.byteIndex >= this.bufferSize) {
        this.flush();
      }
    }

    const rms = Math.sqrt(sum / channel0.length);
    if (rms < this.silenceThreshold) {
        this.silenceFrames += channel0.length;
    } else {
        this.silenceFrames = 0;
    }

    // ~300ms of silence at 16kHz is 4800 samples. Let's say 5000.
    const SILENCE_THRESHOLD_FRAMES = 5000;

    if (this.silenceFrames > SILENCE_THRESHOLD_FRAMES && !this.isSilent) {
        this.isSilent = true;
        this.port.postMessage({ type: 'silence', value: true });
    } else if (this.silenceFrames === 0 && this.isSilent) {
        this.isSilent = false;
        this.port.postMessage({ type: 'silence', value: false });
    }

    return true;
  }

  flush() {
    this.port.postMessage({ 
      type: 'audio', 
      buffer: this.buffer.slice(0, this.bufferSize) 
    }, [this.buffer.buffer.slice(0, this.bufferSize * 4)]);
    
    this.byteIndex = 0;
    this.buffer = new Float32Array(this.bufferSize);
  }
}

registerProcessor('audio-processor', AudioProcessor);

