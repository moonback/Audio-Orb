import { createBlob } from '../utils';
import { Analyser } from '../analyser';

export class AudioEngine extends EventTarget {
  public context: AudioContext;
  public outContext: AudioContext;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private outputMaster: GainNode;
  private outputBus: GainNode;
  private bassFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  
  public inputAnalyser: Analyser;
  public outputAnalyser: Analyser;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private outputElement: HTMLAudioElement | null = null;
  private currentStream: MediaStream | null = null;
  private currentOutputMode: 'default' | 'custom' = 'default';
  private selectedInputDeviceId: string | undefined;
  private selectedOutputDeviceId: string = 'default';

  constructor() {
    super();
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    // Input context for recording (16kHz for STT)
    this.context = new AudioContextClass({ sampleRate: 16000, latencyHint: 'interactive' });
    // Output context for playback (24kHz high quality)
    this.outContext = new AudioContextClass({ sampleRate: 24000, latencyHint: 'interactive' });
    
    // Create analysers using your existing class wrapper or native nodes?
    // Your Analyser class wraps an AnalyserNode. Let's use raw nodes for internal routing 
    // and expose the wrapper if needed, but your Analyser class takes an AudioNode in constructor.
    
    // Setup Output Pipeline
    this.outputMaster = this.outContext.createGain();
    
    this.bassFilter = this.outContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 250;
    
    this.trebleFilter = this.outContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4000;

    this.outputBus = this.outContext.createGain();

    // Chain: outputMaster -> bass -> treble -> bus -> destination
    this.outputMaster.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.outputBus);
    this.outputBus.connect(this.outContext.destination);

    // Initialize Analysers
    // We need a dummy node for input analyser before recording starts to avoid errors?
    // Actually, we'll instantiate them when needed or use a GainNode as a persistent attachment point.
    
    const inputGain = this.context.createGain();
    const outputGain = this.outputMaster; // Use master gain for output analysis

    this.inputAnalyser = new Analyser(inputGain);
    this.outputAnalyser = new Analyser(outputGain);
    
    // Store input gain to connect source later
    this.inputGain = inputGain;
  }
  
  public readonly inputGain: GainNode;
  private nextStartTime = 0;

  async initialize() {
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.outContext.state === 'suspended') await this.outContext.resume();
    
    try {
      await this.context.audioWorklet.addModule('/audio-processor.js');
      console.log("[AudioEngine] Worklet loaded.");
    } catch (e) {
      console.error("[AudioEngine] Failed to load Worklet:", e);
      throw e;
    }
  }

  async startRecording(deviceId?: string) {
    if (this.context.state === 'suspended') await this.context.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000
      }
    });

    this.selectedInputDeviceId = deviceId;
    this.currentStream = stream;
    this.inputNode = this.context.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(this.context, 'audio-processor');

    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        this.dispatchEvent(new CustomEvent('audio-data', { detail: event.data.buffer }));
      } else if (event.data.type === 'silence') {
        this.dispatchEvent(new CustomEvent('silence-change', { detail: event.data.value }));
      }
    };

    // Connect: Mic -> InputGain (for analyser) -> Worklet -> Destination (mute)
    this.inputNode.connect(this.inputGain);
    this.inputGain.connect(this.workletNode);
    this.workletNode.connect(this.context.destination); 
  }

  stopRecording() {
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    // Keep context alive for next time
  }

  playBuffer(audioBuffer: AudioBuffer, playbackRate = 1.0, detune = 0) {
    const currentTime = this.outContext.currentTime;
    
    // Reset time if we fell behind (gap in stream)
    if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // 50ms buffer safety
    }

    const source = this.outContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputMaster);
    source.playbackRate.value = playbackRate;
    source.detune.value = detune;
    
    source.start(this.nextStartTime);
    
    // Advance time pointer
    this.nextStartTime += audioBuffer.duration;
  }

  resetPlayback() {
    this.nextStartTime = 0;
  }

  setBassGain(db: number) {
    this.bassFilter.gain.value = db;
  }

  setTrebleGain(db: number) {
    this.trebleFilter.gain.value = db;
  }

  get outputContext() {
    return this.outContext;
  }

  get masterGain() {
    return this.outputMaster;
  }

  get canSelectOutputDevice() {
    return typeof (HTMLMediaElement.prototype as any).setSinkId === 'function';
  }

  async setOutputDevice(deviceId: string) {
    if (!this.canSelectOutputDevice) {
      throw new Error('Changement de sortie audio non supporté par ce navigateur');
    }

    if (deviceId === 'default') {
      this.switchToDefaultOutput();
      this.selectedOutputDeviceId = 'default';
      return;
    }

    await this.switchToCustomOutput(deviceId);
    this.selectedOutputDeviceId = deviceId;
  }

  private switchToDefaultOutput() {
    if (this.currentOutputMode === 'default') return;
    try {
      this.outputBus.disconnect();
    } catch (e) {
      console.warn('Erreur déconnexion sortie custom', e);
    }
    this.outputBus.connect(this.outContext.destination);
    this.currentOutputMode = 'default';
    if (this.outputElement) {
      this.outputElement.pause();
      this.outputElement.srcObject = null;
      this.outputElement = null;
    }
    this.mediaStreamDestination = null;
  }

  private async switchToCustomOutput(deviceId: string) {
    if (!this.mediaStreamDestination) {
      this.mediaStreamDestination = this.outContext.createMediaStreamDestination();
    }
    if (this.currentOutputMode !== 'custom') {
      try {
        this.outputBus.disconnect();
      } catch (e) {
        console.warn('Erreur déconnexion sortie par défaut', e);
      }
      this.outputBus.connect(this.mediaStreamDestination);
      this.currentOutputMode = 'custom';
    }

    if (!this.outputElement) {
      this.outputElement = new Audio();
      this.outputElement.autoplay = true;
      this.outputElement.setAttribute('playsinline', 'true');
      this.outputElement.muted = false;
      this.outputElement.srcObject = this.mediaStreamDestination.stream;
    }

    const sinkId = deviceId === 'default' ? '' : deviceId;
    await (this.outputElement as any).setSinkId(sinkId);
    await this.outputElement.play().catch(() => {});
  }

  get currentInputDeviceId() {
    return this.selectedInputDeviceId;
  }

  get currentOutputDeviceId() {
    return this.selectedOutputDeviceId;
  }

  async autoCalibrateInputGain(durationMs = 1500): Promise<number> {
    const sourceNode = this.inputNode ?? await this.getTemporarySource(this.selectedInputDeviceId);
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let peak = 0;

    await new Promise<void>((resolve) => {
      const start = performance.now();
      const sample = () => {
        analyser.getFloatTimeDomainData(buffer);
        for (let i = 0; i < buffer.length; i++) {
          const value = Math.abs(buffer[i]);
          if (value > peak) peak = value;
        }
        if (performance.now() - start >= durationMs) {
          resolve();
          return;
        }
        requestAnimationFrame(sample);
      };
      sample();
    });

    try {
      sourceNode.disconnect(analyser);
    } catch {
      // ignore
    }
    analyser.disconnect();

    const calibrationStream = (sourceNode as any).__calibrationStream as (MediaStream | undefined);
    if (calibrationStream) {
      calibrationStream.getTracks().forEach(track => track.stop());
    }

    const targetPeak = 0.8;
    const newGain = peak > 0 ? targetPeak / peak : 1;
    const clamped = Math.min(Math.max(newGain, 0.5), 3);
    this.inputGain.gain.value = clamped;
    return clamped;
  }

  private async getTemporarySource(deviceId?: string) {
    const tempStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    });
    const src = this.context.createMediaStreamSource(tempStream);
    (src as any).__calibrationStream = tempStream;
    return src;
  }
}

export const audioService = new AudioEngine();

