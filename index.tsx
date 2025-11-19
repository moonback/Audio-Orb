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

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() showSettings = false;
  @state() selectedVoice = 'Orus';
  @state() selectedStyle = 'Natural';
  @state() playbackRate = 1.0;
  @state() detune = 0;
  @state() isThinkingMode = false;
  @state() memory = '';
  @state() isProcessingMemory = false;
  
  // Personality State
  @state() personalities: Personality[] = [];
  @state() selectedPersonalityId = 'assistant';

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
    this.selectedStyle = localStorage.getItem('gdm-style') || 'Natural';
    this.playbackRate = parseFloat(localStorage.getItem('gdm-rate') || '1.0');
    this.detune = parseFloat(localStorage.getItem('gdm-detune') || '0');
    this.isThinkingMode = localStorage.getItem('gdm-thinking') === 'true';
    this.memory = localStorage.getItem('gdm-memory') || '';
    
    // Init Personalities
    this.personalities = this.personalityManager.getAll();
    this.selectedPersonalityId = localStorage.getItem('gdm-personality') || 'assistant';
    
    // Verify selected personality exists (it might have been deleted)
    if (!this.personalityManager.getById(this.selectedPersonalityId)) {
      this.selectedPersonalityId = 'assistant';
    }

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

    if (changedProperties.has('isThinkingMode')) {
      localStorage.setItem('gdm-thinking', String(this.isThinkingMode));
      needReset = true;
    }

    // If memory changes, we don't necessarily need to reset the session immediately,
    // but it's saved to local storage.
    if (changedProperties.has('memory')) {
      localStorage.setItem('gdm-memory', this.memory);
    }

    if (needReset) {
      this.updateStatus('Updating settings...');
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
    let systemInstruction = `${currentPersonality.prompt} Please speak with a ${this.selectedStyle} tone, accent, or style.`;

    // Inject Memory
    if (this.memory && this.memory.trim().length > 0) {
      systemInstruction += `\n\nINFORMATION ABOUT THE USER (MEMORY):\n${this.memory}\n\nUse this information to personalize the conversation, but do not explicitly repeat it unless asked.`;
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

    if (this.isThinkingMode) {
      // Thinking config is available for Gemini 2.5 series. 
      // We limit budget to 24576 which is safer for Flash models.
      config.thinkingConfig = { thinkingBudget: 24576 };
    }

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Ready');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
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
            this.updateStatus('Disconnected');
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

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Requesting microphone...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Listening...');

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
        
        // Send data only if session is connected
        this.session?.sendRealtimeInput({media: createBlob(pcmData)});
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private async stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopped');

    this.isRecording = false;

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
    this.updateStatus('Consolidating Memory...');

    try {
      const transcriptText = this.currentSessionTranscript.join('\n');
      const prompt = `
      I have a long-term memory of a user and a new conversation transcript. 
      Please update the memory by adding new important facts, preferences, or context found in the transcript. 
      Keep the memory concise and bulleted. Do not repeat existing facts. 
      If the memory is empty, create a new one.

      EXISTING MEMORY:
      ${this.memory || "(Empty)"}

      NEW TRANSCRIPT:
      ${transcriptText}

      UPDATED MEMORY:
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
      this.updateStatus('Ready');
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

        <settings-panel
          .show=${this.showSettings}
          .personalities=${this.personalities}
          .selectedPersonalityId=${this.selectedPersonalityId}
          .selectedVoice=${this.selectedVoice}
          .selectedStyle=${this.selectedStyle}
          .playbackRate=${this.playbackRate}
          .detune=${this.detune}
          .isThinkingMode=${this.isThinkingMode}
          .memory=${this.memory}
          @close-settings=${this.toggleSettings}
          @thinking-mode-changed=${(e: CustomEvent) => this.isThinkingMode = e.detail}
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
