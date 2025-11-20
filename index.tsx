/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import {Personality, PersonalityManager} from './personality';
import {MemoryManager, StructuredMemory, MemoryCategory} from './memory';
import {SYSTEM_BASE_INSTRUCTIONS} from './system-instructions';
import {debouncedStorage} from './utils/storage';
import {ThrottledRAF} from './utils/performance';
import {deviceDetector} from './utils/device-detection';
import {AdaptiveBufferManager} from './utils/adaptive-buffer';
import './components/settings-panel';
import './components/control-panel';
import './components/status-display';
import './components/latency-indicator';
import './components/vu-meter';
import './components/onboarding-modal';
import './components/mini-waveform';
import './components/metrics-panel';
import {Analyser} from './analyser';
import './visual-3d';

// Services
import { audioService } from './services/audio-engine';
import { GeminiClient } from './services/gemini-client';
import { Modality } from '@google/genai';
type DeviceOption = { deviceId: string; label: string };
import { telemetry, MetricsSnapshot } from './services/telemetry';
import { logger } from './services/logger';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = 'Prêt';
  @state() error = '';
  @state() showSettings = false;
  @state() selectedVoice = 'Orus';
  @state() selectedStyle = 'Naturel';
  @state() playbackRate = 1.0;
  @state() detune = 0;
  @state() memory = '';
  @state() structuredMemory: StructuredMemory = {preferences: [], facts: [], context: []};
  @state() isProcessingMemory = false;
  @state() textScale = 1;
  @state() showOnboarding = false;
  @state() onboardingStep = 0;
  
  // Audio Equalizer State
  @state() bassGain = 0; // -20 to +20 dB
  @state() trebleGain = 0; // -20 to +20 dB
  @state() audioPreset = 'Personnalisé';
  
  // Personality State
  @state() personalities: Personality[] = [];
  @state() selectedPersonalityId = 'assistant';

  // UI Indicators
  @state() latency = 0;
  @state() inputLevel = 0;
  @state() outputLevel = 0;
  @state() fallbackMessage = '';
  @state() nextRetrySeconds = 0;
  @state() fallbackActive = false;
  @state() quotaUsed = 0;
  @state() quotaLimit = Number(process.env.GEMINI_DAILY_QUOTA || '120');
  @state() quotaResetAt = 0;
  @state() avgLatencyMetric = 0;
  @state() errorRateMetric = 0;
  @state() uptimeSeconds = 0;
  @state() inputDevices: DeviceOption[] = [{ deviceId: 'default', label: 'Micro par défaut' }];
  @state() outputDevices: DeviceOption[] = [{ deviceId: 'default', label: 'Sortie par défaut' }];
  @state() selectedInputDeviceId = 'default';
  @state() selectedOutputDeviceId = 'default';
  @state() canSelectOutput = false;
  @state() isCalibratingInput = false;

  private geminiClient: GeminiClient;
  private personalityManager = new PersonalityManager();
  private memoryManager = new MemoryManager();
  private readonly onboardingSteps = [
    { title: 'Bienvenue dans NeuroChat', description: 'Activez le micro avec le bouton central et regardez l\'orbite réagir à votre voix.' },
    { title: 'Panneaux intelligents', description: 'Ouvrez les réglages pour ajuster la voix, la mémoire ou les périphériques.' },
    { title: 'Export', description: 'Utilisez le bouton de téléchargement pour exporter vos conversations.' }
  ];
  private readonly retryDelays = [2000, 5000, 10000, 30000];
  private readonly fallbackRetryDelay = 60000;

  // Audio Engine Visualisation Bindings
  @state() inputNode: AudioNode | null = null;
  @state() outputNode: AudioNode | null = null;
  
  // Store the current session's text to summarize later
  @state()
  private currentSessionTranscript: string[] = [];
  
  // Latency tracking
  private lastAudioSendTime = 0;
  
  // Performance optimizations
  private vuMeterRAF: ThrottledRAF;
  private latencyRAF: ThrottledRAF;
  private adaptiveBuffer: AdaptiveBufferManager;
  private deviceInfo: ReturnType<typeof deviceDetector.detect>;
  private handleTelemetryUpdate = (event: Event) => {
    const detail = (event as CustomEvent<MetricsSnapshot>).detail;
    this.avgLatencyMetric = detail.avgLatency;
    this.errorRateMetric = detail.errorRate;
    this.uptimeSeconds = detail.uptimeSeconds;
    this.fallbackActive = detail.fallbackActive;
  };
  private retryCountdownInterval: any = null;
  private quotaState = { used: 0, resetAt: 0 };
  private deviceChangeHandler: (() => void) | null = null;

  static styles = css`
    :host {
      font-family: 'Exo 2', 'Google Sans', Roboto, sans-serif;
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
      background: 
        radial-gradient(ellipse at 20% 80%, rgba(0, 240, 255, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(188, 19, 254, 0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0a0a15 0%, #000000 100%);
      color: var(--text-main, #e8eaed);
      font-size: calc(16px * var(--text-scale, 1));
      
      /* Global Design Tokens - Ultra Futuristic Theme */
      --glass-bg: rgba(8, 12, 20, 0.4);
      --glass-border: rgba(0, 240, 255, 0.15);
      --primary-color: #00ffff; /* Neon Cyan */
      --secondary-color: #ff00ff; /* Neon Magenta */
      --accent-color: #00ff88; /* Neon Green */
      --text-main: #ffffff;
      --text-dim: #a0d7ff;
      --panel-glass-bg: rgba(5, 10, 20, 0.6);
      --panel-border: rgba(0, 240, 255, 0.25);
      --chat-user-bg: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 200, 255, 0.1));
      --chat-user-text: #ffffff;
      --chat-ai-bg: linear-gradient(135deg, rgba(255, 0, 255, 0.08), rgba(188, 19, 254, 0.05));
      --chat-ai-text: #e8f4ff;
      --glow-color: rgba(0, 255, 255, 0.8);
      --shadow-neon: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.1);
    }

    * {
      box-sizing: border-box;
    }
    
    /* 3D Background Layer */
    .visual-layer {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    
    /* Layout Containers */
    .ui-layer {
      position: absolute;
      inset: 0;
      pointer-events: none; 
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: opacity 0.5s ease;
    }

    /* Allow interaction with UI elements normally */
    control-panel, settings-panel, .top-bar {
      pointer-events: auto;
    }

    .app-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      z-index: 20;
      pointer-events: none;
    }
    
    .app-header > * {
      pointer-events: auto;
    }
    
    .header-left, .header-right {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .header-center {
      position: absolute;
      left: 50%;
      top: 16px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    /* Mobile Adaptations - Ultra Compact */
    @media (max-width: 768px) {
      .app-header {
        padding: 10px;
      }
      
      .header-left {
        align-items: flex-start;
        gap: 4px;
      }
      
      .header-right {
        align-items: flex-end;
        gap: 4px;
      }
      
      /* Hide less critical metrics on mobile */
      metrics-panel {
        display: none;
      }
      
      /* Adjust Status Display position on mobile */
      .header-center {
        top: 50px;
        width: 90%;
      }
      
      /* Scale down indicators - more compact */
      latency-indicator, vu-meter {
        transform: scale(0.75);
        transform-origin: top center;
      }
      
      vu-meter {
        display: none !important;
      }
    }

    /* Chat Bubbles - Futuristic Compact Design */
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px 15px 130px 15px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      height: 100%;
      mask-image: linear-gradient(to bottom, transparent, black 3%, black 96%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 3%, black 96%, transparent);
      transition: opacity 0.3s ease;
    }

    .chat-bubble {
      padding: 14px 20px;
      border-radius: 16px;
      max-width: 80%;
      line-height: 1.55;
      font-size: 0.95rem;
      animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      position: relative;
      border: 1px solid transparent;
      transition: all 0.3s ease;
    }

    .chat-bubble::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, var(--glass-border), transparent);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .chat-bubble:hover::before {
      opacity: 1;
    }

    .chat-bubble.user {
      align-self: flex-end;
      background: var(--chat-user-bg);
      color: var(--chat-user-text);
      border-bottom-right-radius: 4px;
      border-color: rgba(0, 255, 255, 0.2);
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(0, 255, 255, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .chat-bubble.user:hover {
      border-color: rgba(0, 255, 255, 0.4);
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(0, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .chat-bubble.ai {
      align-self: flex-start;
      background: var(--chat-ai-bg);
      border: 1px solid rgba(255, 0, 255, 0.15);
      color: var(--chat-ai-text);
      border-bottom-left-radius: 4px;
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(255, 0, 255, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .chat-bubble.ai:hover {
      border-color: rgba(255, 0, 255, 0.3);
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(255, 0, 255, 0.12);
      transform: translateY(-1px);
    }

    @keyframes popIn {
      0% { 
        opacity: 0;
        transform: translateY(15px) scale(0.96);
        filter: blur(4px);
      }
      100% { 
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    /* Hint for Zen Mode - Removed */
    
    /* Custom Scrollbar - Futuristic */
    .chat-container::-webkit-scrollbar { 
      width: 4px; 
    }
    .chat-container::-webkit-scrollbar-track { 
      background: transparent; 
    }
    .chat-container::-webkit-scrollbar-thumb { 
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.3)); 
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
    }
    .chat-container::-webkit-scrollbar-thumb:hover { 
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.5), rgba(255, 0, 255, 0.5));
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
    }

    /* Mobile Adaptations - Ultra Compact */
    @media (max-width: 768px) {
      .chat-container {
        padding: 8px 12px 140px 12px;
        gap: 10px;
        mask-image: linear-gradient(to bottom, transparent, black 2%, black 92%, transparent);
      }
      
      .chat-bubble {
        padding: 12px 16px;
        font-size: 0.9rem;
        max-width: 92%;
        border-radius: 14px;
      }
      
      .top-bar {
        padding: 8px;
      }
      
      /* Désactiver le mode zen sur mobile */
      .visual-layer {
        pointer-events: none !important;
      }
      
      /* Cacher le mini-waveform sur mobile */
      mini-waveform {
        display: none !important;
      }
    }
  `;

  constructor() {
    super();
    // Initialize performance optimizations
    this.vuMeterRAF = new ThrottledRAF(16); // ~60fps
    this.latencyRAF = new ThrottledRAF(16);
    
    // Detect device capabilities
    this.deviceInfo = deviceDetector.detect();
    const recommendedBufferSize = deviceDetector.getRecommendedBufferSize();
    this.adaptiveBuffer = new AdaptiveBufferManager(recommendedBufferSize, 200);
    
    console.log('[Device]', {
      isMobile: this.deviceInfo.isMobile,
      quality: this.deviceInfo.recommendedQuality,
      bufferSize: recommendedBufferSize,
    });
    
    // Load settings from local storage
    this.selectedVoice = debouncedStorage.getItem('gdm-voice') || 'Orus';
    this.selectedStyle = debouncedStorage.getItem('gdm-style') || 'Naturel';
    this.playbackRate = parseFloat(debouncedStorage.getItem('gdm-rate') || '1.0');
    this.detune = parseFloat(debouncedStorage.getItem('gdm-detune') || '0');
    const storedScale = parseFloat(debouncedStorage.getItem('gdm-text-scale') || '1');
    if (!Number.isNaN(storedScale)) {
      this.textScale = storedScale;
    }
    this.selectedInputDeviceId = debouncedStorage.getItem('gdm-input-device') || 'default';
    this.selectedOutputDeviceId = debouncedStorage.getItem('gdm-output-device') || 'default';
    // Load structured memory
    this.structuredMemory = this.memoryManager.load();
    this.memory = this.memoryManager.toText();
    this.bassGain = parseFloat(debouncedStorage.getItem('gdm-bass') || '0');
    this.trebleGain = parseFloat(debouncedStorage.getItem('gdm-treble') || '0');
    this.audioPreset = debouncedStorage.getItem('gdm-audio-preset') || 'Personnalisé';
    const onboardingDone = debouncedStorage.getItem('gdm-onboarding-done');
    this.showOnboarding = !onboardingDone;
    this.applyThemeVariables();
    
    // Init Personalities
    this.personalities = this.personalityManager.getAll();
    this.selectedPersonalityId = debouncedStorage.getItem('gdm-personality') || 'assistant';
    
    if (!this.personalityManager.getById(this.selectedPersonalityId)) {
      this.selectedPersonalityId = 'assistant';
    }

    // Initialize Gemini Service
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.geminiClient = new GeminiClient(apiKey);
    this.canSelectOutput = audioService.canSelectOutputDevice;
    this.loadQuotaState();
    telemetry.addEventListener('metrics', this.handleTelemetryUpdate);
    if (navigator.mediaDevices) {
      this.refreshDevices();
      this.deviceChangeHandler = () => this.refreshDevices();
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }

    this.startVUMeterUpdates();
    this.startLatencyUpdates();

    // Bind Service Events
    this.setupServiceBindings();
  }

  private async setupServiceBindings() {
    // Audio Engine -> Gemini
    audioService.addEventListener('audio-data', (e: any) => {
        // Convert float32 buffer to base64 pcm16
        const float32Array = e.detail as Float32Array;
        const pcm16 = this.floatTo16BitPCM(float32Array);
        const base64 = this.arrayBufferToBase64(pcm16);
        this.geminiClient.sendAudio(base64);
        this.lastAudioSendTime = performance.now();
    });

    // Gemini -> UI / Audio Engine
    this.geminiClient.addEventListener('status', (e: any) => {
        this.updateStatus(e.detail);
        if (e.detail === 'Connecté') {
          this.exitFallback();
          this.retryCount = 0;
          this.clearRetryCountdown();
        }
    });

    this.geminiClient.addEventListener('error', (e: any) => {
        this.updateError(e.detail);
        telemetry.logError(e.detail);
        this.updateStatus('Erreur');
    });
    this.geminiClient.addEventListener('quota', (e: any) => {
        this.updateQuotaFromUsage(e.detail);
    });
    this.geminiClient.addEventListener('disconnected', () => this.handleDisconnect());

    this.geminiClient.addEventListener('audio-response', async (e: any) => {
        // Handle audio playback through audio service
        const audioData = e.detail.data; // Base64 string
        
        // Calculate latency
        if (this.lastAudioSendTime > 0) {
            const currentTime = performance.now();
            this.latency = currentTime - this.lastAudioSendTime;
            this.lastAudioSendTime = 0;
            telemetry.logLatency(this.latency);
        }

        // Decode and play
        try {
            const audioBuffer = await decodeAudioData(decode(audioData), audioService.outputContext, 24000, 1);
            audioService.playBuffer(audioBuffer, this.playbackRate, this.detune);
        } catch(err) {
            console.error("Error playing audio:", err);
        }
    });

    this.geminiClient.addEventListener('interrupted', () => {
        audioService.resetPlayback();
        // Stop current sounds if needed? (Implementation detail: requires tracking sources)
    });

    this.geminiClient.addEventListener('transcript', (e: any) => {
        const { text, source } = e.detail;
        this._updateTranscript(source, text);
    });
    
    // Init Audio Service
    try {
        await audioService.initialize();
        // Bind visuals
        // Note: Visual 3D component expects AudioNode. 
        // Analyser is a wrapper, but we can pass the raw nodes attached to audioService
        
        // Use a slight delay to ensure nodes are ready or just set them
        // Actually, audioService.initialize() is async, so we are good here.
        
        // We need to expose the nodes from AudioService.
        // I updated AudioService to use Analyser internally, but let's see.
        // In AudioService I created `inputAnalyser` and `outputAnalyser` (Wrappers).
        // But Visual3D expects `AudioNode` to create its own Analysers.
        // I should pass the GainNodes that are being analyzed.
        
        // Hack: accessing private properties or getters. 
        // I added getters `outputContext` and `masterGain`.
        
        // For input, I need the input gain.
        // I added `_persistentInputGain` in AudioService. I should expose it properly.
        // Let's assume I can get it or modify AudioService slightly.
        // I will use `audioService.context.createGain()` here if needed? No.
        
        // Let's modify AudioService to expose the nodes needed for visualisation.
        // I'll assume `audioService.inputAnalyser` (wrapper) has a node property?
        // No, `Analyser` class in `analyser.ts` does not expose the node easily, 
        // but `visual-3d.ts` takes an `inputNode` (AudioNode) and creates `new Analyser(node)`.
        
        // So I need to pass a node that has the signal.
        // AudioService: `_persistentInputGain` has the mic signal.
        // AudioService: `masterGain` has the output signal.
        
        // I will cast to any to access private if needed or just fix AudioService.
        // I wrote AudioService. I should have exposed `get inputGainNode()` or similar.
        // I'll fix AudioService if I can, but I can't edit it again in this turn easily without re-writing.
        // I'll assume I can access `audioService['inputAnalyser'].analyser` (the raw node) or similar?
        // Actually, `Analyser` class puts the node into `this.analyser`.
        
        // Let's just pass `audioService.masterGain` for output.
        this.outputNode = audioService.masterGain;
        
        // For input, we access the exposed input gain
        this.inputNode = audioService.inputGain;

        this.initSession();
    } catch (e) {
        console.error("Failed to init audio service", e);
        this.updateError("Erreur initialisation audio");
    }
  }

  private applyThemeVariables() {
    this.style.setProperty('--text-scale', this.textScale.toString());
  }

  private computeNextResetTimestamp() {
    const date = new Date();
    date.setHours(24, 0, 0, 0);
    return date.getTime();
  }

  private loadQuotaState() {
    const raw = debouncedStorage.getItem('gdm-quota-state');
    let parsed = { used: 0, resetAt: this.computeNextResetTimestamp() };
    if (raw) {
      try {
        const data = JSON.parse(raw);
        parsed = { used: data.used || 0, resetAt: data.resetAt || this.computeNextResetTimestamp() };
      } catch (err) {
        console.warn('Impossible de lire le quota local', err);
      }
    }
    if (Date.now() > parsed.resetAt) {
      parsed = { used: 0, resetAt: this.computeNextResetTimestamp() };
    }
    this.quotaState = parsed;
    this.quotaUsed = parsed.used;
    this.quotaResetAt = parsed.resetAt;
  }

  private persistQuotaState() {
    this.quotaState = { used: this.quotaUsed, resetAt: this.quotaResetAt };
    debouncedStorage.setItem('gdm-quota-state', JSON.stringify(this.quotaState));
  }

  private registerQuotaUsage(deltaTokens?: number) {
    const increment = deltaTokens ? Math.max(1, Math.round(deltaTokens / 1000)) : 1;
    this.quotaUsed = Math.min(this.quotaLimit, this.quotaUsed + increment);
    if (Date.now() > this.quotaResetAt) {
      this.quotaResetAt = this.computeNextResetTimestamp();
      this.quotaUsed = increment;
    }
    this.persistQuotaState();
  }

  private updateQuotaFromUsage(usage: any) {
    if (!usage) return;
    const delta = usage.totalTokenCount ?? usage.candidatesTokenCount ?? usage.promptTokenCount ?? 0;
    this.registerQuotaUsage(delta);
  }

  private startRetryCountdown(durationMs: number) {
    this.nextRetrySeconds = Math.ceil(durationMs / 1000);
    if (this.retryCountdownInterval) {
      clearInterval(this.retryCountdownInterval);
    }
    this.retryCountdownInterval = setInterval(() => {
      this.nextRetrySeconds = Math.max(0, this.nextRetrySeconds - 1);
      if (this.nextRetrySeconds === 0 && this.retryCountdownInterval) {
        clearInterval(this.retryCountdownInterval);
        this.retryCountdownInterval = null;
      }
    }, 1000);
  }

  private clearRetryCountdown() {
    if (this.retryCountdownInterval) {
      clearInterval(this.retryCountdownInterval);
      this.retryCountdownInterval = null;
    }
    this.nextRetrySeconds = 0;
  }

  private scheduleReconnect(delayMs: number) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.startRetryCountdown(delayMs);
    this.retryTimeout = setTimeout(() => this.initSession(), delayMs);
  }

  private activateFallback(message: string) {
    this.fallbackActive = true;
    this.fallbackMessage = message;
    telemetry.setFallback(true, message);
  }

  private exitFallback() {
    if (this.fallbackActive) {
      telemetry.setFallback(false);
    }
    this.fallbackActive = false;
    this.fallbackMessage = '';
    this.clearRetryCountdown();
  }

  private handleDisconnect() {
    if (!this.isRecording) {
      this.updateStatus('Reconnexion en cours...');
    }
    this.retryCount = 0;
    this.scheduleReconnect(this.retryDelays[0]);
  }

  private async refreshDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter(device => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId || 'default',
          label: device.label || `Micro ${index + 1}`
        }));
      const outputsList = devices
        .filter(device => device.kind === 'audiooutput')
        .map((device, index) => ({
          deviceId: device.deviceId || 'default',
          label: device.label || `Sortie ${index + 1}`
        }));
      const inputMap = new Map<string, DeviceOption>();
      inputMap.set('default', { deviceId: 'default', label: 'Micro par défaut' });
      inputs.forEach(device => {
        if (!inputMap.has(device.deviceId)) {
          inputMap.set(device.deviceId, device);
        }
      });
      this.inputDevices = Array.from(inputMap.values());

      const outputMap = new Map<string, DeviceOption>();
      outputMap.set('default', { deviceId: 'default', label: 'Sortie par défaut' });
      outputsList.forEach(device => {
        if (!outputMap.has(device.deviceId)) {
          outputMap.set(device.deviceId, device);
        }
      });
      this.outputDevices = this.canSelectOutput ? Array.from(outputMap.values()) : [{ deviceId: 'default', label: 'Sortie par défaut' }];
    } catch (err: any) {
      logger.warn('device_enumeration_failed', { message: err?.message });
    }
  }
  
  // Helper for PCM conversion
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
      const buffer = new ArrayBuffer(float32Array.length * 2);
      const view = new DataView(buffer);
      let offset = 0;
      for (let i = 0; i < float32Array.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, float32Array[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
  }

  private _handleRateChange(e: CustomEvent) {
    this.playbackRate = e.detail;
    debouncedStorage.setItem('gdm-rate', String(this.playbackRate));
  }

  private _handleDetuneChange(e: CustomEvent) {
    this.detune = e.detail;
    debouncedStorage.setItem('gdm-detune', String(this.detune));
  }

  private _handleVoiceChange(e: CustomEvent) {
    this.selectedVoice = e.detail;
    debouncedStorage.setItem('gdm-voice', this.selectedVoice);
    this.updateStatus('Paramètres mis à jour');
    this.reset();
  }

  private _handleStyleChange(e: CustomEvent) {
    this.selectedStyle = e.detail;
    debouncedStorage.setItem('gdm-style', this.selectedStyle);
    this.updateStatus('Paramètres mis à jour');
    this.reset();
  }

  private _handlePersonalityChange(e: CustomEvent) {
    this.selectedPersonalityId = e.detail;
    debouncedStorage.setItem('gdm-personality', this.selectedPersonalityId);
    this.updateStatus('Nouvelle personnalité chargée');
    this.reset();
  }

  private _handleBassChange(e: CustomEvent) {
    this.bassGain = e.detail;
    audioService.setBassGain(this.bassGain);
    debouncedStorage.setItem('gdm-bass', String(this.bassGain));
  }

  private _handleTrebleChange(e: CustomEvent) {
    this.trebleGain = e.detail;
    audioService.setTrebleGain(this.trebleGain);
    debouncedStorage.setItem('gdm-treble', String(this.trebleGain));
  }

  private _handleAudioPresetChange(e: CustomEvent) {
    this.audioPreset = e.detail;
    debouncedStorage.setItem('gdm-audio-preset', this.audioPreset);
    
    const presets: Record<string, {bass: number, treble: number}> = {
      'Personnalisé': {bass: this.bassGain, treble: this.trebleGain},
      'Voix': {bass: 2, treble: 4},
      'Musique': {bass: 6, treble: 3},
      'Neutre': {bass: 0, treble: 0},
      'Bass Boost': {bass: 10, treble: -2},
      'Clarté': {bass: -2, treble: 8}
    };
    
    const preset = presets[this.audioPreset] || presets['Neutre'];
    this.bassGain = preset.bass;
    this.trebleGain = preset.treble;
    
    audioService.setBassGain(this.bassGain);
    audioService.setTrebleGain(this.trebleGain);
    
    debouncedStorage.setItem('gdm-bass', String(this.bassGain));
    debouncedStorage.setItem('gdm-treble', String(this.trebleGain));
  }

  private _handleTextScaleChange(e: CustomEvent) {
    this.textScale = e.detail;
    debouncedStorage.setItem('gdm-text-scale', String(this.textScale));
    this.applyThemeVariables();
  }

  private async _handleInputDeviceChange(e: CustomEvent) {
    const deviceId = e.detail;
    this.selectedInputDeviceId = deviceId;
    debouncedStorage.setItem('gdm-input-device', deviceId);
    if (this.isRecording) {
      await this.stopRecording();
      await this.startRecording();
    }
  }

  private async _handleOutputDeviceChange(e: CustomEvent) {
    if (!this.canSelectOutput) return;
    const deviceId = e.detail;
    this.selectedOutputDeviceId = deviceId;
    debouncedStorage.setItem('gdm-output-device', deviceId);
    try {
      await audioService.setOutputDevice(deviceId);
      this.updateStatus('Sortie audio mise à jour');
    } catch (err: any) {
      this.updateError('Impossible de changer de sortie audio');
      console.error(err);
    }
  }

  private async _handleCalibrateInput() {
    if (this.isCalibratingInput) return;
    this.isCalibratingInput = true;
    this.updateStatus('Calibration micro...');
    try {
      const gain = await audioService.autoCalibrateInputGain();
      this.updateStatus(`Gain ajusté (${gain.toFixed(2)}x)`);
    } catch (err: any) {
      console.error('Calibration échouée', err);
      this.updateError('Calibration échouée');
    } finally {
      this.isCalibratingInput = false;
    }
  }


  private _completeOnboarding() {
    this.showOnboarding = false;
    debouncedStorage.setItem('gdm-onboarding-done', 'true');
  }

  // Retry logic state
  private retryCount = 0;
  private retryTimeout: any = null;

  private async initSession() {
    if (!process.env.GEMINI_API_KEY) {
        this.updateError('Clé API Gemini manquante.');
        return;
    }

    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

    if (this.retryCount === 0) {
        this.currentSessionTranscript = [];
        this.updateStatus('Prêt');
    } else {
        this.updateStatus(`Reconnexion (${this.retryCount})...`);
    }

    // Instructions de base non modifiables (toujours appliquées en premier)
    let systemInstruction = SYSTEM_BASE_INSTRUCTIONS;
    
    // Personnalité choisie par l'utilisateur
    const currentPersonality = this.personalityManager.getById(this.selectedPersonalityId) || this.personalityManager.getAll()[0];
    systemInstruction += `\n\n---\n\nPERSONNALITÉ ACTIVE:\n${currentPersonality.prompt}\n\nVeuillez parler avec un ton, un accent ou un style ${this.selectedStyle}.`;

    // Memory injection
    let memoryText = this.memoryManager.toText();
    if (memoryText && memoryText.trim().length > 0) {
       // (Semantic search logic omitted for simplicity, kept basic injection)
       systemInstruction += `\n\n---\n\nINFORMATIONS SUR L'UTILISATEUR:\n${memoryText}`;
    }

    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {prebuiltVoiceConfig: {voiceName: this.selectedVoice}},
      },
      systemInstruction: systemInstruction,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    try {
        await this.geminiClient.connect(model, config);
        this.retryCount = 0;
        this.exitFallback();
    } catch (e: any) {
        logger.error('gemini_session_init_failed', { message: e?.message });
        if (this.retryCount < this.retryDelays.length) {
            const delay = this.retryDelays[this.retryCount];
            this.retryCount++;
            this.scheduleReconnect(delay);
            this.updateStatus(`Nouvelle tentative dans ${Math.round(delay / 1000)}s`);
        } else {
            this.activateFallback('Gemini est temporairement indisponible');
            this.scheduleReconnect(this.fallbackRetryDelay);
            this.updateStatus('Mode fallback');
        }
    }
  }

  private _updateTranscript(speaker: string, text: string) {
     const lastIndex = this.currentSessionTranscript.length - 1;
     const prefix = speaker + ': ';
     
     if (lastIndex >= 0 && this.currentSessionTranscript[lastIndex].startsWith(prefix)) {
        const updatedTranscript = [...this.currentSessionTranscript];
        updatedTranscript[lastIndex] += text; 
        this.currentSessionTranscript = updatedTranscript;
     } else {
        this.currentSessionTranscript = [...this.currentSessionTranscript, prefix + text];
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
    if (msg === 'Prêt' || msg === 'Écoute...') {
        this.error = '';
    }
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private startLatencyUpdates() {
    const updateLatency = () => {
      // Simple latency decay for visualization if needed
      if (!this.isRecording) {
        this.latency = Math.max(0, this.latency * 0.95);
      }
      this.latencyRAF.request(updateLatency);
    };
    updateLatency();
  }

  private startVUMeterUpdates() {
    const updateLevels = () => {
        if (audioService.inputAnalyser && audioService.outputAnalyser) {
            audioService.inputAnalyser.update();
            const inputData = audioService.inputAnalyser.data;
            const inputMax = Math.max(...Array.from(inputData));
            this.inputLevel = Math.min((inputMax / 255) * 100, 100);

            audioService.outputAnalyser.update();
            const outputData = audioService.outputAnalyser.data;
            const outputMax = Math.max(...Array.from(outputData));
            this.outputLevel = Math.min((outputMax / 255) * 100, 100);
        }
        this.vuMeterRAF.request(updateLevels);
    };
    updateLevels();
  }

  private async startRecording() {
    if (this.isRecording) return;
    this.updateStatus('Accès micro...');
    try {
      const deviceId = this.selectedInputDeviceId === 'default' ? undefined : this.selectedInputDeviceId;
      await audioService.startRecording(deviceId);
      this.isRecording = true;
      this.updateStatus('Écoute...');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      this.updateStatus('Erreur micro');
      this.updateError(err.message);
      this.stopRecording();
    }
  }

  private async stopRecording() {
    if (!this.isRecording) return;
    this.updateStatus('Arrêté');
    this.isRecording = false;
    audioService.stopRecording();
    this.updateMemoryFromSession();
  }

  private async updateMemoryFromSession() {
    if (this.currentSessionTranscript.length === 0) return;
    this.isProcessingMemory = true;
    this.updateStatus('Mémorisation...');
    try {
      const transcriptText = this.currentSessionTranscript.join('\n');
      // ... Memory update logic (retained from original but using new client if compatible or just raw text)
      // The MemoryManager expects `GoogleGenAI` client. We have `this.geminiClient.client`?
      // GeminiClient wraps the client. I need to expose it or adapt MemoryManager.
      // For now, assume MemoryManager can handle it or I skip it to avoid type errors if MemoryManager is strict.
      // Let's expose client in GeminiClient wrapper. (I made `client` private).
      // I will access it via casting for now to keep it simple.
      
      await this.memoryManager.updateFromTranscript(transcriptText, this.geminiClient.rawClient);
      
      this.structuredMemory = this.memoryManager.load();
      this.memory = this.memoryManager.toText();
    } catch (e) {
      console.error("Failed to update memory", e);
    } 
    finally {
      this.isProcessingMemory = false;
      this.updateStatus('Prêt');
      this.reset();
    }
  }

  private clearMemory() {
    this.memoryManager.clear();
    this.structuredMemory = this.memoryManager.load();
    this.memory = '';
    this.reset();
  }

  private exportMemory() {
    const json = this.memoryManager.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-orb-memory-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.updateStatus("Mémoire exportée");
  }

  private async importMemory(file: File) {
    try {
      const text = await file.text();
      const success = this.memoryManager.import(text);
      if (success) {
        this.structuredMemory = this.memoryManager.load();
        this.memory = this.memoryManager.toText();
        this.updateStatus("Mémoire importée");
        this.reset();
      } else {
        this.updateError("Erreur lors de l'import de la mémoire");
      }
    } catch (e) {
      console.error("Erreur import mémoire:", e);
      this.updateError("Erreur lors de l'import de la mémoire");
    }
  }

  private deleteMemoryItem(category: MemoryCategory, id: string) {
    this.memoryManager.removeItem(category, id);
    this.structuredMemory = this.memoryManager.load();
    this.memory = this.memoryManager.toText();
    this.updateStatus("Élément supprimé");
  }

  private async reset() {
    this.geminiClient.disconnect();
    if (this.isRecording) await this.stopRecording();
    this.retryCount = 0;
    this.initSession();
  }

  private toggleSettings() {
    this.showSettings = !this.showSettings;
  }
  
  private _handleCreatePersonality(e: CustomEvent) {
    const {name, prompt} = e.detail;
    const newPersonality = this.personalityManager.add(name, prompt);
    this.personalities = this.personalityManager.getAll();
    this.selectedPersonalityId = newPersonality.id;
  }

  private _handleDeletePersonality(e: CustomEvent) {
    const id = e.detail;
    this.personalityManager.delete(id);
    this.personalities = this.personalityManager.getAll();
    if (this.selectedPersonalityId === id) {
      this.selectedPersonalityId = 'assistant';
    }
  }
  
  private _downloadTranscript() {
    if (this.currentSessionTranscript.length === 0) {
      this.updateError("Rien à télécharger");
      return;
    }
    const text = this.currentSessionTranscript.join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-orb-session-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.updateStatus("Conversation téléchargée");
  }

  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    
    this.vuMeterRAF?.cancel();
    this.latencyRAF?.cancel();
    
    debouncedStorage.flush();
    
    audioService.stopRecording();
    this.geminiClient.disconnect();
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.retryCountdownInterval) {
      clearInterval(this.retryCountdownInterval);
      this.retryCountdownInterval = null;
    }
    telemetry.removeEventListener('metrics', this.handleTelemetryUpdate);
    if (navigator.mediaDevices && this.deviceChangeHandler) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }
  }
  
  private _clearError() { 
    this.error = ''; 
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('currentSessionTranscript')) {
      const chatContainer = this.shadowRoot?.getElementById('chatContainer');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  render() {
    return html`
      <!-- 3D Background -->
      <div class="visual-layer">
         <gdm-live-audio-visuals-3d
            .inputNode=${this.inputNode}
            .outputNode=${this.outputNode}
            .lowPowerMode=${false}
         ></gdm-live-audio-visuals-3d>
      </div>
      
      <!-- UI Overlay -->
      <div class="ui-layer">
        
        <div class="app-header">
          <div class="header-left">
             <vu-meter
              .inputLevel=${this.inputLevel}
              .outputLevel=${this.outputLevel}
              .isActive=${this.isRecording || this.status === 'Parle...'}
             ></vu-meter>
          </div>
          
          <div class="header-center">
             <status-display
              .status=${this.status}
              .error=${this.error}
              .isProcessing=${this.isProcessingMemory}
              .fallbackMessage=${this.fallbackMessage}
              .nextRetrySeconds=${this.nextRetrySeconds}
              @clear-error=${this._clearError}
             ></status-display>
             
             <metrics-panel
              .avgLatency=${this.avgLatencyMetric}
              .errorRate=${this.errorRateMetric}
              .uptimeSeconds=${this.uptimeSeconds}
              .fallback=${this.fallbackActive}
             ></metrics-panel>
          </div>

          <div class="header-right">
             <latency-indicator
              .latency=${this.latency}
              .isActive=${this.isRecording}
             ></latency-indicator>
          </div>
        </div>

        <div class="chat-container" id="chatContainer">
          ${this.currentSessionTranscript.map(msg => {
            const isUser = msg.startsWith('User: ');
            const text = msg.replace(/^(User: |AI: )/, '');
            return html`
              <div class="chat-bubble ${isUser ? 'user' : 'ai'}">
                ${text}
              </div>
            `;
          })}
        </div>

        <control-panel
          .isRecording=${this.isRecording}
          .isProcessingMemory=${this.isProcessingMemory}
          .fallbackMode=${this.fallbackActive}
          @toggle-settings=${this.toggleSettings}
          @start-recording=${this.startRecording}
          @stop-recording=${this.stopRecording}
          @reset=${this.reset}
          @download-transcript=${this._downloadTranscript}
        ></control-panel>

        <mini-waveform
          .inputNode=${this.inputNode}
        ></mini-waveform>

        <settings-panel
          .show=${this.showSettings}
          .personalities=${this.personalities}
          .selectedPersonalityId=${this.selectedPersonalityId}
          .selectedVoice=${this.selectedVoice}
          .selectedStyle=${this.selectedStyle}
          .playbackRate=${this.playbackRate}
          .detune=${this.detune}
          .memory=${this.memory}
          .structuredMemory=${this.structuredMemory}
          .textScale=${this.textScale}
          .inputDevices=${this.inputDevices}
          .outputDevices=${this.outputDevices}
          .selectedInputDeviceId=${this.selectedInputDeviceId}
          .selectedOutputDeviceId=${this.selectedOutputDeviceId}
          .canSelectOutput=${this.canSelectOutput}
          .isCalibratingInput=${this.isCalibratingInput}
          @close-settings=${this.toggleSettings}
          @clear-memory=${this.clearMemory}
          @export-memory=${this.exportMemory}
          @import-memory=${(e: CustomEvent) => this.importMemory(e.detail)}
          @delete-memory-item=${(e: CustomEvent) => this.deleteMemoryItem(e.detail.category, e.detail.id)}
          @voice-changed=${this._handleVoiceChange}
          @style-changed=${this._handleStyleChange}
          @rate-changed=${this._handleRateChange}
          @detune-changed=${this._handleDetuneChange}
          @personality-changed=${this._handlePersonalityChange}
          @create-personality=${this._handleCreatePersonality}
          @delete-personality=${this._handleDeletePersonality}
          @bass-changed=${this._handleBassChange}
          @treble-changed=${this._handleTrebleChange}
          @audio-preset-changed=${this._handleAudioPresetChange}
          @text-scale-changed=${this._handleTextScaleChange}
          @input-device-changed=${this._handleInputDeviceChange}
          @output-device-changed=${this._handleOutputDeviceChange}
          @calibrate-input=${this._handleCalibrateInput}
          .bassGain=${this.bassGain}
          .trebleGain=${this.trebleGain}
          .audioPreset=${this.audioPreset}
        ></settings-panel>
      </div>

      <onboarding-modal
        .open=${this.showOnboarding}
        .steps=${this.onboardingSteps}
        @complete=${this._completeOnboarding}
        @skip=${this._completeOnboarding}
      ></onboarding-modal>
    `;
  }
}

