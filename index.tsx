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
import './visual-3d';
import './components/settings-panel';
import './components/control-panel';
import './components/status-display';
import './components/latency-indicator';
import './components/vu-meter';
import {Analyser} from './analyser';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() showSettings = false;
  @state() selectedVoice = 'Orus';
  @state() selectedStyle = 'Naturel';
  @state() playbackRate = 1.0;
  @state() detune = 0;
  @state() memory = '';
  @state() isProcessingMemory = false;
  
  // Personality State
  @state() personalities: Personality[] = [];
  @state() selectedPersonalityId = 'assistant';

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
      --primary-color: #a8a8ff;
      --glass-bg: rgba(20, 20, 30, 0.6);
      --glass-border: rgba(255, 255, 255, 0.1);
      --glass-highlight: rgba(255, 255, 255, 0.05);
      --text-main: rgba(255, 255, 255, 0.9);
      --text-dim: rgba(255, 255, 255, 0.5);
    }

    * {
      box-sizing: border-box;
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

    // Initialize analysers
    this.inputAnalyser = new Analyser(this.inputNode);
    this.outputAnalyser = new Analyser(this.outputNode);
    
    // Start VU meter update loop
    this.startVUMeterUpdates();
    
    // Start latency update loop
    this.startLatencyUpdates();
    
    this.initClient();
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('playbackRate') || changedProperties.has('detune')) {
      for (const source of this.sources) {
        source.playbackRate.value = this.playbackRate;
        source.detune.value = this.detune;
      }
      // Save audio settings
      localStorage.setItem('gdm-rate', String(this.playbackRate));
      localStorage.setItem('gdm-detune', String(this.detune));
    }

    let needReset = false;

    if (changedProperties.has('selectedVoice')) {
      localStorage.setItem('gdm-voice', this.selectedVoice);
      needReset = true;
    }

    if (changedProperties.has('selectedStyle')) {
      localStorage.setItem('gdm-style', this.selectedStyle);
      needReset = true;
    }
    
    if (changedProperties.has('selectedPersonalityId')) {
      localStorage.setItem('gdm-personality', this.selectedPersonalityId);
      needReset = true;
    }

    // If memory changes, we don't necessarily need to reset the session immediately,
    // but it's saved to local storage.
    if (changedProperties.has('memory')) {
      localStorage.setItem('gdm-memory', this.memory);
    }

    if (needReset) {
      this.updateStatus('Mise à jour des paramètres...');
      this.reset();
    }
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
    // gemini-3-pro-preview does not support the Live API WebSocket protocol directly in this configuration.
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
      // Corrected: Use empty objects for transcription to fix "Invalid Argument" errors
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

    this.updateStatus('Demande d\'accès au microphone...');

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
      this.updateStatus(`Erreur : ${err.message}`);
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
    this.updateStatus('Consolidation de la mémoire...');

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
      <div>
        <control-panel
          .isRecording=${this.isRecording}
          .isProcessingMemory=${this.isProcessingMemory}
          @toggle-settings=${this.toggleSettings}
          @start-recording=${this.startRecording}
          @stop-recording=${this.stopRecording}
          @reset=${this.reset}
        ></control-panel>

        <status-display
          .status=${this.status}
          .error=${this.error}
          .isProcessing=${this.isProcessingMemory}
        ></status-display>

        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>

        <latency-indicator
          .latency=${this.latency}
          .isActive=${this.isRecording || this.sources.size > 0}
        ></latency-indicator>

        <vu-meter
          .inputLevel=${this.inputLevel}
          .outputLevel=${this.outputLevel}
          .isActive=${this.isRecording || this.sources.size > 0}
        ></vu-meter>

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
          @voice-changed=${(e: CustomEvent) => this.selectedVoice = e.detail}
          @style-changed=${(e: CustomEvent) => this.selectedStyle = e.detail}
          @rate-changed=${(e: CustomEvent) => this.playbackRate = e.detail}
          @detune-changed=${(e: CustomEvent) => this.detune = e.detail}
          @personality-changed=${(e: CustomEvent) => this.selectedPersonalityId = e.detail}
          @create-personality=${this._handleCreatePersonality}
          @delete-personality=${this._handleDeletePersonality}
        ></settings-panel>
      </div>
    `;
  }
}
