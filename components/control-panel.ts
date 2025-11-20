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
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px 26px;
      background: linear-gradient(135deg, rgba(5, 10, 20, 0.7), rgba(10, 15, 25, 0.5));
      backdrop-filter: blur(30px) saturate(180%);
      -webkit-backdrop-filter: blur(30px) saturate(180%);
      border-radius: 50px;
      border: 1px solid rgba(0, 255, 255, 0.2);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 0 40px rgba(0, 255, 255, 0.1),
        inset 0 1px 1px rgba(255, 255, 255, 0.15),
        inset 0 -1px 1px rgba(0, 0, 0, 0.2);
      font-family: 'Exo 2', 'Google Sans', sans-serif;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    :host(:hover) {
      border-color: rgba(0, 255, 255, 0.5);
      transform: translateX(-50%) translateY(-2px);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.7),
        0 0 60px rgba(0, 255, 255, 0.2),
        0 0 100px rgba(255, 0, 255, 0.1),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
    }

    button {
      outline: none;
      border: none;
      color: var(--text-main, #ffffff);
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.1));
      width: 52px;
      height: 52px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.1);
    }

    button::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(0, 255, 255, 0.4) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
      border-radius: inherit;
    }

    button::after {
      content: '';
      position: absolute;
      inset: -2px;
      background: conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.3), transparent);
      border-radius: inherit;
      opacity: 0;
      animation: rotate-border 3s linear infinite;
      z-index: -1;
    }

    @keyframes rotate-border {
      to { transform: rotate(360deg); }
    }

    button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.5), 
        0 0 20px rgba(0, 255, 255, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      border-color: rgba(0, 255, 255, 0.4);
    }
    
    button:hover::before {
      opacity: 1;
    }

    button:hover::after {
      opacity: 1;
    }

    button:active {
      transform: translateY(0) scale(0.95);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    button svg {
      width: 22px;
      height: 22px;
      transition: all 0.3s ease;
      filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.4));
      fill: currentColor;
    }

    /* Main Action Button (Start/Stop) - More Compact */
    button#startButton, 
    button#stopButton {
      width: 66px;
      height: 66px;
      margin: 0 6px;
    }

    /* Start Button Specifics - Enhanced Glow */
    button#startButton {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 200, 255, 0.05));
      border: 1.5px solid rgba(0, 255, 255, 0.4);
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    button#startButton svg {
      fill: #00ffff;
      filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.8));
      width: 30px;
      height: 30px;
    }
    
    button#startButton:hover {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 200, 255, 0.1));
      border-color: #00ffff;
      box-shadow: 
        0 0 40px rgba(0, 255, 255, 0.4),
        0 8px 25px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    /* Stop Button Specifics - Neon Red */
    button#stopButton {
      background: linear-gradient(135deg, rgba(255, 0, 100, 0.8), rgba(200, 0, 80, 0.9));
      box-shadow: 
        0 0 30px rgba(255, 0, 100, 0.5),
        0 8px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      border: 1.5px solid rgba(255, 100, 150, 0.6);
    }
    
    button#stopButton svg {
      fill: white;
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1));
      width: 26px;
      height: 26px;
    }

    button#stopButton:hover {
      background: linear-gradient(135deg, rgba(255, 0, 100, 0.9), rgba(200, 0, 80, 1));
      box-shadow: 
        0 0 50px rgba(255, 0, 100, 0.7),
        0 10px 30px rgba(0, 0, 0, 0.6);
    }

    button.recording {
      animation: pulse-record 1.5s ease-in-out infinite;
    }
    
    button.recording svg {
      animation: pulse-icon 1.5s ease-in-out infinite;
    }

    @keyframes pulse-record {
      0%, 100% { 
        box-shadow: 
          0 0 20px rgba(255, 0, 100, 0.6),
          0 0 0 0 rgba(255, 0, 100, 0.4);
      }
      50% { 
        box-shadow: 
          0 0 40px rgba(255, 0, 100, 0.8),
          0 0 0 20px rgba(255, 0, 100, 0);
      }
    }
    
    @keyframes pulse-icon {
      0%, 100% { 
        transform: scale(1);
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1));
      }
      50% { 
        transform: scale(0.9);
        filter: drop-shadow(0 0 12px rgba(255, 255, 255, 1));
      }
    }

    button:disabled {
      opacity: 0.25;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      filter: grayscale(1) brightness(0.5);
      border-color: rgba(255, 255, 255, 0.05) !important;
    }

    button:disabled::before,
    button:disabled::after {
      display: none;
    }
    
    /* Settings & Reset icons */
    button:not(#startButton):not(#stopButton) svg {
      opacity: 0.7;
    }
    button:not(#startButton):not(#stopButton):hover svg {
      opacity: 1;
      transform: rotate(0deg) scale(1.1);
      filter: drop-shadow(0 0 5px rgba(0, 240, 255, 0.8));
    }
    
    /* Specific rotation for settings on hover */
    button[title*="Paramètres"]:hover svg {
       transform: rotate(90deg) scale(1.1);
    }
    
    /* Tooltip */
    .tooltip {
      /* ... unchanged ... */
    }

    /* Mobile Adaptations - Ultra Compact */
    @media (max-width: 600px) {
      :host {
        bottom: 16px;
        width: 92%;
        max-width: 360px;
        padding: 10px 18px;
        gap: 10px;
        border-radius: 35px;
      }
      
      button {
        width: 44px;
        height: 44px;
      }
      
      button#startButton, 
      button#stopButton {
        width: 58px;
        height: 58px;
        margin: 0 4px;
      }
      
      button svg {
        width: 18px;
        height: 18px;
      }
      
      button#startButton svg {
        width: 26px;
        height: 26px;
      }

      button#stopButton svg {
        width: 22px;
        height: 22px;
      }
    }

    @media (max-width: 400px) {
      :host {
        gap: 8px;
        padding: 8px 14px;
      }

      button {
        width: 40px;
        height: 40px;
      }

      button#startButton, 
      button#stopButton {
        width: 54px;
        height: 54px;
      }
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

  render() {
    return html`
      <button
        @click=${this._downloadTranscript}
        title="Télécharger la conversation"
        aria-label="Télécharger la conversation"
        ?disabled=${this.isRecording}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
      </button>

      <button
        @click=${this._toggleSettings}
        title="Paramètres"
        aria-label="Ouvrir les paramètres">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12l-16 128H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Z"/></svg>
      </button>

      ${!this.isRecording
        ? html`
            <button
              id="startButton"
              @click=${this._startRecording}
              ?disabled=${this.isProcessingMemory || this.fallbackMode}
              title="Démarrer la conversation"
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
              title="Arrêter"
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
        title="Réinitialiser la session"
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
