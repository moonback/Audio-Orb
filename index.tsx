/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

const VOICES = ['Orus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
const STYLES = ['Natural', 'Professional', 'Cheerful', 'British Accent', 'French Accent', 'Whispering', 'Enthusiastic'];

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

  private client: GoogleGenAI;
  private session: Session;
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
    }

    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: white;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row;
      gap: 20px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        
        &:active {
          transform: scale(0.95);
        }

        &.recording {
          background: rgba(200, 0, 0, 0.2);
          border-color: rgba(200, 0, 0, 0.5);
        }
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }

    .settings-panel {
      background: rgba(20, 20, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 32px;
      width: 320px;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }

    /* Custom scrollbar for settings */
    .settings-panel::-webkit-scrollbar {
      width: 8px;
    }
    .settings-panel::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .settings-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 400;
      }

      button {
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        padding: 4px;
        
        &:hover {
          color: white;
        }
      }
    }

    .setting-group {
      margin-bottom: 20px;
    }

    .setting-label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.7);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .setting-value {
      color: rgba(255,255,255,0.4);
    }

    select {
      width: 100%;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 12px;
      border-radius: 12px;
      font-size: 1rem;
      outline: none;
      cursor: pointer;
      
      &:hover {
        border-color: rgba(255,255,255,0.4);
      }
      
      option {
        background: #1a1a1a;
      }
    }

    input[type=range] {
      width: 100%;
      accent-color: #a8a8ff;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.2);
      outline: none;
    }

    /* Switch styles */
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 24px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #a8a8ff;
    }

    input:checked + .slider:before {
      transform: translateX(16px);
    }

    .info-text {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      margin-top: 4px;
      line-height: 1.4;
    }

    textarea.memory-display {
      width: 100%;
      height: 100px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.7);
      padding: 8px;
      font-family: monospace;
      font-size: 0.8rem;
      resize: none;
      box-sizing: border-box;
    }

    .btn-small {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      margin-top: 8px;
      width: 100%;
    }
    
    .btn-small:hover {
      background: rgba(255, 255, 255, 0.2);
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

    let systemInstruction = `You are a helpful AI assistant. Please speak with a ${this.selectedStyle} tone, accent, or style.`;

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
      // Note: Live API doesn't have an explicit 'disconnect' on the session object in all SDK versions, 
      // but re-initializing handles it.
    }
    
    if (this.isRecording) {
       this.stopRecording();
    }
    
    this.initSession();
  }

  private toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  render() {
    return html`
      <div>
        <div class="controls">
          <button
            @click=${this.toggleSettings}
            title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12l-16 128H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Z"/></svg>
          </button>

          ${!this.isRecording
            ? html`
                <button
                  id="startButton"
                  @click=${this.startRecording}
                  ?disabled=${this.isProcessingMemory}>
                  <svg
                    viewBox="0 0 100 100"
                    width="32px"
                    height="32px"
                    fill="#ff4444"
                    xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" />
                  </svg>
                </button>`
            : html`
                <button
                  id="stopButton"
                  class="recording"
                  @click=${this.stopRecording}>
                  <svg
                    viewBox="0 0 100 100"
                    width="32px"
                    height="32px"
                    fill="#ffffff"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="60" height="60" rx="5" />
                  </svg>
                </button>`}

           <button
            id="resetButton"
            @click=${this.reset}
            ?disabled=${this.isRecording || this.isProcessingMemory}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ffffff">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
        </div>

        <div id="status"> 
          ${this.isProcessingMemory ? html`<span class="spinner"></span>` : ''}
          ${this.status} ${this.error ? `| ${this.error}` : ''} 
        </div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>

        ${this.showSettings ? html`
          <div class="settings-overlay" @click=${(e) => e.target === e.currentTarget && this.toggleSettings()}>
            <div class="settings-panel">
              <div class="settings-header">
                <h2>Voice Settings</h2>
                <button @click=${this.toggleSettings}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                </button>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <span>Thinking Mode</span>
                  <label class="switch">
                    <input 
                      type="checkbox" 
                      ?checked=${this.isThinkingMode}
                      @change=${(e: any) => this.isThinkingMode = e.target.checked}
                    >
                    <span class="slider"></span>
                  </label>
                </label>
                <div class="info-text">
                  Uses Gemini 2.5 Flash with thinking config (Higher latency).
                </div>
              </div>

              <div class="setting-group">
                <label class="setting-label">Long-term Memory</label>
                <textarea class="memory-display" readonly>${this.memory || "No memory yet. Talk to me!"}</textarea>
                <button class="btn-small" @click=${this.clearMemory}>Clear Memory</button>
              </div>

              <div class="setting-group">
                <label class="setting-label">Voice</label>
                <select @change=${(e) => this.selectedVoice = e.target.value}>
                  ${VOICES.map(voice => html`
                    <option value=${voice} ?selected=${this.selectedVoice === voice}>${voice}</option>
                  `)}
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">Style & Accent</label>
                <select @change=${(e) => this.selectedStyle = e.target.value}>
                  ${STYLES.map(style => html`
                    <option value=${style} ?selected=${this.selectedStyle === style}>${style}</option>
                  `)}
                </select>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <span>Speed</span>
                  <span class="setting-value">${this.playbackRate.toFixed(1)}x</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  .value=${this.playbackRate}
                  @input=${(e) => this.playbackRate = parseFloat(e.target.value)}
                >
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <span>Pitch (Detune)</span>
                  <span class="setting-value">${this.detune} cents</span>
                </label>
                <input 
                  type="range" 
                  min="-1200" 
                  max="1200" 
                  step="100" 
                  .value=${this.detune}
                  @input=${(e) => this.detune = parseFloat(e.target.value)}
                >
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
