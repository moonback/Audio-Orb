/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import {Personality, PersonalityManager} from './personality';
import './visual-3d-realistic';
import './components/settings-panel';
import './components/control-panel';
import './components/status-display';
import './components/latency-indicator';
import './components/vu-meter';
import './components/model-selector';
import {Analyser} from './analyser';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = 'Prêt';
  @state() error = '';
  @state() showSettings = false;
  @state() showModelSelector = false;
  @state() selectedVoice = 'Orus';
  @state() selectedStyle = 'Naturel';
  @state() playbackRate = 1.0;
  @state() detune = 0;
  @state() memory = '';
  @state() isProcessingMemory = false;
  
  // Personality State
  @state() personalities: Personality[] = [];
  @state() selectedPersonalityId = 'assistant';

  // Avatar State - Ready Player Me par défaut
  @state() modelUrl = 'https://models.readyplayer.me/6913458cd14d41dcac39ac9a.glb';
  @state() modelSource: 'readyplayerme' | 'custom' = 'readyplayerme';

  // UI Indicators
  @state() latency = 0;
  @state() inputLevel = 0;
  @state() outputLevel = 0;

  private client: GoogleGenAI;
  private session: Session;
  private personalityManager = new PersonalityManager();

  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();
  
  // Store the current session's text to summarize later
  private currentSessionTranscript: string[] = [];

  // Audio analysers for VU meter
  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;
  
  // Latency tracking
  private lastAudioSendTime = 0;
  private latencyUpdateInterval: number | null = null;

  static styles = css`
    :host {
      font-family: 'Google Sans', Roboto, sans-serif;
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
      background: #000;
      color: white;
      
      /* Global Design Tokens */
      --glass-bg: rgba(10, 10, 15, 0.6);
      --glass-border: rgba(255, 255, 255, 0.1);
      --primary-color: #8ab4f8;
      --text-main: #e8eaed;
      --text-dim: #9aa0a6;
    }

    * {
      box-sizing: border-box;
    }
    
    /* Layout Containers */
    .ui-layer {
      position: absolute;
      inset: 0;
      pointer-events: none; /* Allow clicks to pass through to 3D scene where needed */
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Allow interaction with UI elements */
    control-panel, settings-panel, model-selector, .top-bar {
      pointer-events: auto;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      padding: 20px;
    }
  `;

  constructor() {
    super();
    // Load settings from local storage
    this.selectedVoice = localStorage.getItem('gdm-voice') || 'Orus';
    this.selectedStyle = localStorage.getItem('gdm-style') || 'Naturel';
    this.playbackRate = parseFloat(localStorage.getItem('gdm-rate') || '1.0');
    this.detune = parseFloat(localStorage.getItem('gdm-detune') || '0');
    this.memory = localStorage.getItem('gdm-memory') || '';
    
    // Init Personalities
    this.personalities = this.personalityManager.getAll();
    this.selectedPersonalityId = localStorage.getItem('gdm-personality') || 'assistant';
    
    // Verify selected personality exists (it might have been deleted)
    if (!this.personalityManager.getById(this.selectedPersonalityId)) {
      this.selectedPersonalityId = 'assistant';
    }

    // Load model settings (fallback to default Ready Player Me)
    const savedModelUrl = localStorage.getItem('gdm-model-url');
    if (savedModelUrl) {
      this.modelUrl = savedModelUrl;
      this.modelSource = (localStorage.getItem('gdm-model-source') as any) || 'readyplayerme';
    }

    // Initialize analysers
    this.inputAnalyser = new Analyser(this.inputNode);
    this.outputAnalyser = new Analyser(this.outputNode);
    
    // Start VU meter update loop
    this.startVUMeterUpdates();
    
    // Start latency update loop
    this.startLatencyUpdates();
    
    this.initClient();
  }

  private _handleRateChange(e: CustomEvent) {
    this.playbackRate = e.detail;
    for (const source of this.sources) {
      source.playbackRate.value = this.playbackRate;
    }
    localStorage.setItem('gdm-rate', String(this.playbackRate));
  }

  private _handleDetuneChange(e: CustomEvent) {
    this.detune = e.detail;
    for (const source of this.sources) {
      source.detune.value = this.detune;
    }
    localStorage.setItem('gdm-detune', String(this.detune));
  }

  private _handleVoiceChange(e: CustomEvent) {
    this.selectedVoice = e.detail;
    localStorage.setItem('gdm-voice', this.selectedVoice);
    this.updateStatus('Paramètres mis à jour');
    this.reset();
  }

  private _handleStyleChange(e: CustomEvent) {
    this.selectedStyle = e.detail;
    localStorage.setItem('gdm-style', this.selectedStyle);
    this.updateStatus('Paramètres mis à jour');
    this.reset();
  }

  private _handlePersonalityChange(e: CustomEvent) {
    this.selectedPersonalityId = e.detail;
    localStorage.setItem('gdm-personality', this.selectedPersonalityId);
    this.updateStatus('Nouvelle personnalité chargée');
    this.reset();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();

    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private async initSession() {
    // Always use the Live API compatible model. 
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

    // Reset transcript for new session
    this.currentSessionTranscript = [];

    const currentPersonality = this.personalityManager.getById(this.selectedPersonalityId) || this.personalityManager.getAll()[0];
    let systemInstruction = `${currentPersonality.prompt} Veuillez parler avec un ton, un accent ou un style ${this.selectedStyle}.`;

    // Inject Memory
    if (this.memory && this.memory.trim().length > 0) {
      systemInstruction += `\n\nINFORMATIONS SUR L'UTILISATEUR (MÉMOIRE) :\n${this.memory}\n\nUtilisez ces informations pour personnaliser la conversation, mais ne les répétez pas explicitement sauf si on vous le demande.`;
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
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Prêt');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              // Calculate latency
              if (this.lastAudioSendTime > 0) {
                const currentTime = performance.now();
                this.latency = currentTime - this.lastAudioSendTime;
                this.lastAudioSendTime = 0; // Reset
              }

              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              
              // Apply current settings
              source.playbackRate.value = this.playbackRate;
              source.detune.value = this.detune;

              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + (audioBuffer.duration / this.playbackRate);
              this.sources.add(source);
            }

            // Handle Transcription (for Memory)
            const inputTrans = message.serverContent?.inputTranscription?.text;
            if (inputTrans) {
              this.currentSessionTranscript.push(`User: ${inputTrans}`);
            }

            const outputTrans = message.serverContent?.outputTranscription?.text;
            if (outputTrans) {
              this.currentSessionTranscript.push(`AI: ${outputTrans}`);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Déconnecté');
          },
        },
        config: config,
      });
    } catch (e) {
      console.error(e);
      this.updateError(e.message);
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
    // Clear error when status updates successfully
    if (msg === 'Prêt' || msg === 'Écoute...') {
        this.error = '';
    }
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private startVUMeterUpdates() {
    const updateLevels = () => {
      if (this.isRecording || this.sources.size > 0) {
        // Update input level
        this.inputAnalyser.update();
        const inputData = this.inputAnalyser.data;
        const inputMax = Math.max(...Array.from(inputData));
        this.inputLevel = Math.min((inputMax / 255) * 100, 100);

        // Update output level
        this.outputAnalyser.update();
        const outputData = this.outputAnalyser.data;
        const outputMax = Math.max(...Array.from(outputData));
        this.outputLevel = Math.min((outputMax / 255) * 100, 100);
      } else {
        // Decay levels when not active
        this.inputLevel = Math.max(0, this.inputLevel * 0.9);
        this.outputLevel = Math.max(0, this.outputLevel * 0.9);
      }
      requestAnimationFrame(updateLevels);
    };
    updateLevels();
  }

  private startLatencyUpdates() {
    const updateLatency = () => {
      // If we sent audio but haven't received a response yet, estimate latency
      if (this.lastAudioSendTime > 0 && this.isRecording) {
        const elapsed = performance.now() - this.lastAudioSendTime;
        // Only update if it's been more than 100ms (to avoid flickering)
        if (elapsed > 100) {
          this.latency = elapsed;
        }
      } else if (!this.isRecording && this.sources.size === 0) {
        // Decay latency when inactive
        this.latency = Math.max(0, this.latency * 0.95);
      }
      requestAnimationFrame(updateLatency);
    };
    updateLatency();
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Accès micro...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Écoute...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        
        // Track latency: record send time
        this.lastAudioSendTime = performance.now();
        
        // Send data only if session is connected
        this.session?.sendRealtimeInput({media: createBlob(pcmData)});
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus('Erreur micro');
      this.updateError(err.message);
      this.stopRecording();
    }
  }

  private async stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Arrêté');

    this.isRecording = false;
    this.lastAudioSendTime = 0; // Reset latency tracking

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // When stopping, try to update memory
    this.updateMemoryFromSession();
  }

  private async updateMemoryFromSession() {
    if (this.currentSessionTranscript.length === 0) return;
    
    this.isProcessingMemory = true;
    this.updateStatus('Mémorisation...');

    try {
      const transcriptText = this.currentSessionTranscript.join('\n');
      const prompt = `
      J'ai une mémoire à long terme d'un utilisateur et une nouvelle transcription de conversation. 
      Veuillez mettre à jour la mémoire en ajoutant de nouveaux faits importants, préférences ou contexte trouvés dans la transcription. 
      Gardez la mémoire concise et sous forme de puces. Ne répétez pas les faits existants. 
      Si la mémoire est vide, créez-en une nouvelle.

      MÉMOIRE EXISTANTE :
      ${this.memory || "(Vide)"}

      NOUVELLE TRANSCRIPTION :
      ${transcriptText}

      MÉMOIRE MISE À JOUR :
      `;

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        this.memory = response.text.trim();
        localStorage.setItem('gdm-memory', this.memory);
      }
    } catch (e) {
      console.error("Failed to update memory", e);
    } finally {
      this.isProcessingMemory = false;
      this.updateStatus('Prêt');
      this.reset(); // Re-init session to inject new memory
    }
  }

  private clearMemory() {
    this.memory = '';
    localStorage.removeItem('gdm-memory');
    this.reset();
  }

  private reset() {
    // Close existing session properly
    if (this.session) {
      // Just in case, though session is often managed by the loop, 
      // calling close ensures we don't have dangling connections if the user resets manually
    }
    
    if (this.isRecording) {
       this.stopRecording();
    }
    
    this.initSession();
  }

  private toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  private toggleModelSelector() {
    this.showModelSelector = !this.showModelSelector;
  }

  private _handleModelSelected(e: CustomEvent) {
    const { modelUrl, source } = e.detail;
    this.modelUrl = modelUrl;
    this.modelSource = source;
    localStorage.setItem('gdm-model-url', modelUrl);
    localStorage.setItem('gdm-model-source', source);
    this.updateStatus('Modèle 3D chargé');
  }
  
  private _handleCreatePersonality(e: CustomEvent) {
    const {name, prompt} = e.detail;
    const newPersonality = this.personalityManager.add(name, prompt);
    this.personalities = this.personalityManager.getAll();
    this.selectedPersonalityId = newPersonality.id; // Auto-select new
  }

  private _handleDeletePersonality(e: CustomEvent) {
    const id = e.detail;
    this.personalityManager.delete(id);
    this.personalities = this.personalityManager.getAll();
    if (this.selectedPersonalityId === id) {
      this.selectedPersonalityId = 'assistant'; // Fallback
    }
  }

  render() {
    return html`
      <!-- 3D Visuals Background -->
      <gdm-live-audio-visuals-3d
        .inputNode=${this.inputNode}
        .outputNode=${this.outputNode}
        .modelUrl=${this.modelUrl}
      ></gdm-live-audio-visuals-3d>

      <!-- UI Overlay -->
      <div class="ui-layer">
        <div class="top-bar">
           <!-- Latency & VU Meter could go here or be floating -->
           <latency-indicator
            .latency=${this.latency}
            .isActive=${this.isRecording || this.sources.size > 0}
          ></latency-indicator>
        </div>

        <status-display
          .status=${this.status}
          .error=${this.error}
          .isProcessing=${this.isProcessingMemory}
        ></status-display>

        <control-panel
          .isRecording=${this.isRecording}
          .isProcessingMemory=${this.isProcessingMemory}
          @toggle-settings=${this.toggleSettings}
          @start-recording=${this.startRecording}
          @stop-recording=${this.stopRecording}
          @reset=${this.reset}
        ></control-panel>

        <div style="position: absolute; bottom: 40px; right: 40px; z-index: 20; pointer-events: auto;">
          <button
            @click=${this.toggleModelSelector}
            style="
              background: rgba(138, 180, 248, 0.2);
              border: 1px solid rgba(138, 180, 248, 0.4);
              color: white;
              padding: 14px 24px;
              border-radius: 24px;
              cursor: pointer;
              font-family: 'Google Sans', Roboto, sans-serif;
              font-size: 0.95rem;
              font-weight: 500;
              backdrop-filter: blur(16px);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
              display: flex;
              align-items: center;
              gap: 8px;
            "
          >
            <span style="font-size: 1.2rem;">🧑</span>
            <span>Changer Avatar</span>
          </button>
        </div>

        <settings-panel
          .show=${this.showSettings}
          .personalities=${this.personalities}
          .selectedPersonalityId=${this.selectedPersonalityId}
          .selectedVoice=${this.selectedVoice}
          .selectedStyle=${this.selectedStyle}
          .playbackRate=${this.playbackRate}
          .detune=${this.detune}
          .memory=${this.memory}
          @close-settings=${this.toggleSettings}
          @clear-memory=${this.clearMemory}
          @voice-changed=${this._handleVoiceChange}
          @style-changed=${this._handleStyleChange}
          @rate-changed=${this._handleRateChange}
          @detune-changed=${this._handleDetuneChange}
          @personality-changed=${this._handlePersonalityChange}
          @create-personality=${this._handleCreatePersonality}
          @delete-personality=${this._handleDeletePersonality}
        ></settings-panel>

        <model-selector
          .show=${this.showModelSelector}
          @close=${this.toggleModelSelector}
          @model-selected=${this._handleModelSelected}
        ></model-selector>
      </div>
    `;
  }
}
