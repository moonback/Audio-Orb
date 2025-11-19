import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('control-panel')
export class ControlPanel extends LitElement {
  @property({type: Boolean}) isRecording = false;
  @property({type: Boolean}) isProcessingMemory = false;

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
      padding: 12px 32px;
      background: rgba(20, 20, 30, 0.4);
      backdrop-filter: blur(16px);
      border-radius: 40px;
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    button {
      outline: none;
      border: none;
      color: white;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      width: 56px;
      height: 56px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    button:active {
      transform: translateY(0) scale(0.95);
    }

    button svg {
      width: 24px;
      height: 24px;
      transition: transform 0.3s ease;
    }

    button#startButton, 
    button#stopButton {
      width: 72px;
      height: 72px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    button#startButton:hover {
      background: rgba(255, 68, 68, 0.2);
      border-color: rgba(255, 68, 68, 0.4);
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.2);
    }

    button.recording {
      background: rgba(255, 68, 68, 0.9) !important;
      animation: pulse-red 2s infinite;
    }

    @keyframes pulse-red {
      0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
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

  render() {
    return html`
      <button
        @click=${this._toggleSettings}
        title="Paramètres">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12l-16 128H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Z"/></svg>
      </button>

      ${!this.isRecording
        ? html`
            <button
              id="startButton"
              @click=${this._startRecording}
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
              @click=${this._stopRecording}>
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
        @click=${this._reset}
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
    `;
  }
}

