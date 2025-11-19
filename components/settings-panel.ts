import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Personality} from '../personality';

const VOICES = ['Orus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
const STYLES = ['Naturel', 'Professionnel', 'Joyeux', 'Accent britannique', 'Accent français', 'Chuchotement', 'Enthousiaste'];

@customElement('settings-panel')
export class SettingsPanel extends LitElement {
  @property({type: Boolean}) show = false;
  @property({type: String}) selectedVoice = 'Orus';
  @property({type: String}) selectedStyle = 'Naturel';
  @property({type: Number}) playbackRate = 1.0;
  @property({type: Number}) detune = 0;
  @property({type: String}) memory = '';
  
  // Personality Props
  @property({type: Array}) personalities: Personality[] = [];
  @property({type: String}) selectedPersonalityId = 'assistant';

  @state() isCreatingPersonality = false;
  @state() newPersonalityName = '';
  @state() newPersonalityPrompt = '';

  static styles = css`
    :host {
      font-family: 'Google Sans', Roboto, sans-serif;
      --glass-bg: rgba(20, 20, 30, 0.6);
      --glass-border: rgba(255, 255, 255, 0.1);
      --primary-color: #a8a8ff;
      --text-main: rgba(255, 255, 255, 0.9);
      --text-dim: rgba(255, 255, 255, 0.5);
    }

    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      opacity: 0;
      animation: fadeIn 0.2s forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .settings-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 24px;
      padding: 32px;
      width: 360px;
      max-height: 85vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 0 24px 48px rgba(0,0,0,0.5);
      backdrop-filter: blur(24px);
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    @keyframes slideUp {
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .settings-panel::-webkit-scrollbar {
      width: 6px;
    }
    .settings-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .settings-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    
    .settings-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .settings-header button {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
      display: flex;
    }
    
    .settings-header button:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .setting-group {
      margin-bottom: 24px;
      background: rgba(0,0,0,0.2);
      padding: 16px;
      border-radius: 16px;
    }

    .setting-label {
      margin-bottom: 12px;
      font-size: 0.85rem;
      color: var(--text-dim);
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .setting-value {
      color: var(--primary-color);
      font-family: monospace;
      font-size: 0.9rem;
    }

    select, input[type="text"] {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 16px top 50%;
      background-size: 10px auto;
    }
    
    select:hover, select:focus, input[type="text"]:focus {
      border-color: var(--primary-color);
      background-color: rgba(255,255,255,0.1);
    }
    
    select option {
      background: #1a1a1a;
      color: white;
    }

    input[type=range] {
      width: 100%;
      -webkit-appearance: none; 
      background: transparent; 
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
      margin-top: -6px; 
      box-shadow: 0 0 10px var(--primary-color);
      transition: transform 0.1s;
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255,255,255,0.1);
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    input:checked + .slider { background-color: var(--primary-color); }
    input:checked + .slider:before { transform: translateX(20px); }

    .info-text {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 8px;
      line-height: 1.4;
    }

    textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      color: var(--text-main);
      padding: 12px;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.8rem;
      resize: none;
      transition: border-color 0.2s;
    }
    
    textarea.memory-display {
      height: 100px;
    }

    textarea.prompt-input {
      height: 80px;
      margin-top: 8px;
      font-family: 'Google Sans', Roboto, sans-serif;
    }
    
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .btn-small {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      margin-top: 12px;
      width: 100%;
      transition: all 0.2s;
    }
    
    .btn-small:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-small.primary {
      background: var(--primary-color);
      color: #000;
      font-weight: 600;
      border: none;
    }

    .btn-small.primary:hover {
      opacity: 0.9;
    }

    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .btn-icon:hover { opacity: 1; }
    
    .creation-form {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--glass-border);
      animation: fadeIn 0.3s ease;
    }
    
    .creation-form input {
      margin-bottom: 8px;
    }
  `;

  private _close() {
    this.dispatchEvent(new CustomEvent('close-settings'));
  }

  private _dispatch(name: string, detail: any) {
      this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  private _savePersonality() {
    if (this.newPersonalityName.trim() && this.newPersonalityPrompt.trim()) {
      this._dispatch('create-personality', {
        name: this.newPersonalityName,
        prompt: this.newPersonalityPrompt
      });
      this.isCreatingPersonality = false;
      this.newPersonalityName = '';
      this.newPersonalityPrompt = '';
    }
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div class="settings-overlay" @click=${(e: Event) => e.target === e.currentTarget && this._close()}>
        <div class="settings-panel">
          <div class="settings-header">
            <h2>Paramètres</h2>
            <button @click=${this._close}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
            </button>
          </div>

          <!-- Personalities Section -->
           <div class="setting-group">
            <label class="setting-label">
              <span>Personnalité IA</span>
              ${this.selectedPersonalityId.startsWith('custom_') ? html`
                <button class="btn-icon" title="Supprimer la personnalité" @click=${() => this._dispatch('delete-personality', this.selectedPersonalityId)}>
                  🗑️
                </button>
              ` : ''}
            </label>
            <select @change=${(e: any) => this._dispatch('personality-changed', e.target.value)}>
              ${this.personalities.map(p => html`
                <option value=${p.id} ?selected=${this.selectedPersonalityId === p.id}>
                  ${p.name} ${p.isCustom ? '(Personnalisée)' : ''}
                </option>
              `)}
            </select>
            
            ${!this.isCreatingPersonality ? html`
              <button class="btn-small" @click=${() => this.isCreatingPersonality = true}>
                + Créer une nouvelle personnalité
              </button>
            ` : html`
              <div class="creation-form">
                <input type="text" placeholder="Nom (ex. Yoda)" 
                  .value=${this.newPersonalityName}
                  @input=${(e: any) => this.newPersonalityName = e.target.value}
                >
                <textarea class="prompt-input" placeholder="Instructions système (ex. Parler comme Yoda tu dois...)"
                  .value=${this.newPersonalityPrompt}
                  @input=${(e: any) => this.newPersonalityPrompt = e.target.value}
                ></textarea>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-small" @click=${() => this.isCreatingPersonality = false}>Annuler</button>
                  <button class="btn-small primary" @click=${this._savePersonality}>Enregistrer</button>
                </div>
              </div>
            `}
          </div>

          <div class="setting-group">
            <label class="setting-label">Mémoire à long terme</label>
            <textarea class="memory-display" readonly>${this.memory || "Aucune mémoire pour le moment. Parlez-moi !"}</textarea>
            <button class="btn-small" @click=${() => this._dispatch('clear-memory', null)}>Effacer la mémoire</button>
          </div>

          <div class="setting-group">
            <label class="setting-label">Voix</label>
            <select @change=${(e: any) => this._dispatch('voice-changed', e.target.value)}>
              ${VOICES.map(voice => html`
                <option value=${voice} ?selected=${this.selectedVoice === voice}>${voice}</option>
              `)}
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">Style et accent</label>
            <select @change=${(e: any) => this._dispatch('style-changed', e.target.value)}>
              ${STYLES.map(style => html`
                <option value=${style} ?selected=${this.selectedStyle === style}>${style}</option>
              `)}
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <span>Vitesse</span>
              <span class="setting-value">${this.playbackRate.toFixed(1)}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              .value=${this.playbackRate}
              @input=${(e: any) => this._dispatch('rate-changed', parseFloat(e.target.value))}
            >
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <span>Hauteur (Détune)</span>
              <span class="setting-value">${this.detune} cents</span>
            </label>
            <input 
              type="range" 
              min="-1200" 
              max="1200" 
              step="100" 
              .value=${this.detune}
              @input=${(e: any) => this._dispatch('detune-changed', parseFloat(e.target.value))}
            >
          </div>
        </div>
      </div>
    `;
  }
}
