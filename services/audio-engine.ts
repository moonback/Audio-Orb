import { createBlob } from '../utils';
import { Analyser } from '../analyser';

export class AudioEngine extends EventTarget {
  public context: AudioContext;
  public outContext: AudioContext;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private outputMaster: GainNode;
  private bassFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  
  public inputAnalyser: Analyser;
  public outputAnalyser: Analyser;

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

    // Chain: outputMaster -> bass -> treble -> destination
    this.outputMaster.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.outContext.destination);

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
}

export const audioService = new AudioEngine();

