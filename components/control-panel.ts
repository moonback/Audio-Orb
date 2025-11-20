import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('control-panel')
export class ControlPanel extends LitElement {
  @property({type: Boolean}) isRecording = false;
  @property({type: Boolean}) isProcessingMemory = false;
  @property({type: Boolean}) fallbackMode = false;

  static styles = css`
    :host {
      z-index: 20;
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      padding: 16px 40px;
      background: var(--panel-glass-bg, rgba(10, 10, 15, 0.6));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 50px;
      border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.08));
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      font-family: 'Google Sans', Roboto, sans-serif;
      transition: all 0.3s ease;
      color: var(--text-main, #ffffff);
    }

    :host(:hover) {
      border-color: rgba(255, 255, 255, 0.2);
    }

    button {
      outline: none;
      border: none;
      color: var(--text-main, #ffffff);
      border-radius: 50%;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
      width: 60px;
      height: 60px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08));
    }
    
    button:hover::before {
      opacity: 1;
    }

    button:active {
      transform: translateY(0) scale(0.95);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    button svg {
      width: 26px;
      height: 26px;
      transition: transform 0.3s ease;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }

    /* Main Action Button (Start/Stop) */
    button#startButton, 
    button#stopButton {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }

    /* Start Button Specifics */
    button#startButton svg {
      fill: #ff5555;
      filter: drop-shadow(0 0 8px rgba(255, 85, 85, 0.4));
    }
    
    button#startButton:hover {
      background: rgba(255, 85, 85, 0.1);
      border-color: rgba(255, 85, 85, 0.3);
      box-shadow: 0 0 30px rgba(255, 85, 85, 0.2);
    }

    /* Stop Button Specifics */
    button#stopButton {
      background: linear-gradient(135deg, #ff4444, #cc0000);
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
    }
    
    button#stopButton svg {
      fill: white;
    }

    button.recording {
      animation: pulse-record 2s infinite;
    }
    
    button.recording svg {
      animation: pulse-icon 2s infinite;
    }

    @keyframes pulse-record {
      0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.6); }
      70% { box-shadow: 0 0 0 20px rgba(255, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
    }
    
    @keyframes pulse-icon {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(0.9); }
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
      background: rgba(255,255,255,0.05) !important;
    }
    
    /* Settings & Reset icons */
    button:not(#startButton):not(#stopButton) svg {
      opacity: 0.8;
    }
    button:not(#startButton):not(#stopButton):hover svg {
      opacity: 1;
      transform: rotate(90deg);
    }
    
    /* Tooltip */
    .tooltip {
      position: absolute;
      top: -40px;
      background: rgba(0,0,0,0.8);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      white-space: nowrap;
    }
    
    button:hover .tooltip {
      opacity: 1;
    }
  `;

  private _toggleSettings() {
    this.dispatchEvent(new CustomEvent('toggle-settings'));
  }

  private _startRecording() {
    this.dispatchEvent(new CustomEvent('start-recording'));
  }

  private _stopRecording() {
    this.dispatchEvent(new CustomEvent('stop-recording'));
  }

  private _reset() {
    this.dispatchEvent(new CustomEvent('reset'));
  }

  private _downloadTranscript() {
    this.dispatchEvent(new CustomEvent('download-transcript'));
  }

  private _openHelp() {
    this.dispatchEvent(new CustomEvent('open-help'));
  }

  render() {
    return html`
      <button
        @click=${this._openHelp}
        title="Centre d'aide (H)"
        aria-label="Ouvrir l'aide rapide">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q150 0 255 105t105 255q0 150-105 255T480-120Zm0-80q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-117 0-198.5 81.5T200-480q0 117 81.5 198.5T480-200Zm0-140q17 0 28.5-11.5T520-380q0-17-11.5-28.5T480-420q-17 0-28.5 11.5T440-380q0 17 11.5 28.5T480-340Zm0-120q17 0 28.5-11.5T520-500v-80q0-17-11.5-28.5T480-620q-17 0-28.5 11.5T440-580v80q0 17 11.5 28.5T480-460Z"/></svg>
      </button>

      <button
        @click=${this._downloadTranscript}
        title="Télécharger la conversation (D)"
        aria-label="Télécharger la conversation"
        ?disabled=${this.isRecording}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
      </button>

      <button
        @click=${this._toggleSettings}
        title="Paramètres (S)"
        aria-label="Ouvrir les paramètres">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12l-16 128H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Z"/></svg>
      </button>

      ${!this.isRecording
        ? html`
            <button
              id="startButton"
              @click=${this._startRecording}
              ?disabled=${this.isProcessingMemory || this.fallbackMode}
              title="Démarrer la conversation (Espace)"
              aria-label="Démarrer l'enregistrement vocal">
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                fill="currentColor">
                <path d="M50 15c-16.5 0-30 13.5-30 30v10c0 16.5 13.5 30 30 30s30-13.5 30-30V45c0-16.5-13.5-30-30-30zm0 65c-8.3 0-15-6.7-15-15V45c0-8.3 6.7-15 15-15s15 6.7 15 15v20c0 8.3-6.7 15-15 15z"/>
                <path d="M20 55h-5c0 17.5 13 32 30 34.5V95h10v-5.5c17-2.5 30-17 30-34.5h-5c0 16.5-13.5 30-30 30S20 71.5 20 55z"/>
              </svg>
            </button>`
        : html`
            <button
              id="stopButton"
              class="recording"
              @click=${this._stopRecording}
              title="Arrêter (Espace)"
              aria-label="Arrêter l'enregistrement vocal"
              aria-pressed="true">
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                fill="currentColor">
                <rect x="30" y="30" width="40" height="40" rx="4" />
              </svg>
            </button>`}

       <button
        id="resetButton"
        @click=${this._reset}
        ?disabled=${this.isRecording || this.isProcessingMemory}
        title="Réinitialiser la session (R)"
        aria-label="Réinitialiser la session">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="currentColor"
          aria-hidden="true">
          <path
            d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
        </svg>
      </button>
    `;
  }
}
