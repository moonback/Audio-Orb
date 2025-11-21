import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Personality} from '../personality';
import {StructuredMemory, MemoryCategory} from '../memory';

const VOICES = ['Orus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
const STYLES = ['Naturel', 'Professionnel', 'Joyeux', 'Accent britannique', 'Accent français', 'Chuchotement', 'Enthousiaste'];
type DeviceOption = { deviceId: string; label: string };

@customElement('settings-panel')
export class SettingsPanel extends LitElement {
  @property({type: Boolean, reflect: true}) show = false;
  @property({type: String}) selectedVoice = 'Orus';
  @property({type: String}) selectedStyle = 'Naturel';
  @property({type: Number}) playbackRate = 1.0;
  @property({type: Number}) detune = 0;
  @property({type: String}) memory = '';
  @property({type: Object}) structuredMemory: StructuredMemory = {preferences: [], facts: [], context: []};
  
  // Personality Props
  @property({type: Array}) personalities: Personality[] = [];
  @property({type: String}) selectedPersonalityId = 'assistant';
  
  // Audio Equalizer Props
  @property({type: Number}) bassGain = 0;
  @property({type: Number}) trebleGain = 0;
  @property({type: String}) audioPreset = 'Personnalisé';
  @property({type: Number}) textScale = 1;
  @property({type: Array}) inputDevices: DeviceOption[] = [];
  @property({type: Array}) outputDevices: DeviceOption[] = [];
  @property({type: String}) selectedInputDeviceId = 'default';
  @property({type: String}) selectedOutputDeviceId = 'default';
  @property({type: Boolean}) canSelectOutput = false;
  @property({type: Boolean}) isCalibratingInput = false;
  @property({type: Boolean}) showVUMeter = false;

  @state() isCreatingPersonality = false;
  @state() newPersonalityName = '';
  @state() newPersonalityPrompt = '';

  static styles = css`
    :host {
      font-family: 'Exo 2', 'Google Sans', Roboto, sans-serif;
      --bg-panel: rgba(8, 12, 20, 0.95);
      --bg-input: rgba(15, 20, 30, 0.8);
      --bg-card: rgba(12, 18, 28, 0.6);
      --border-color: rgba(0, 240, 255, 0.2);
      --border-hover: rgba(0, 240, 255, 0.4);
      --primary-color: #00ffff; /* Neon Cyan */
      --primary-hover: #00cccc;
      --secondary-color: #ff00ff; /* Neon Magenta */
      --danger-color: #ff4444;
      --text-main: #ffffff;
      --text-dim: #a0d7ff;
      --glow-cyan: rgba(0, 255, 255, 0.3);
      --glow-magenta: rgba(255, 0, 255, 0.3);
      z-index: 100;
    }

    :host(:not([show])) {
      display: none;
    }

    :host([show]) {
      position: fixed;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }

    .settings-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      opacity: 0;
      animation: fadeIn 0.3s ease-out forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .settings-panel {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 32px;
      width: 850px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 
        0 0 40px rgba(0, 240, 255, 0.15),
        0 0 80px rgba(188, 19, 254, 0.1),
        0 20px 60px rgba(0, 0, 0, 0.5);
      transform: scale(0.95) translateY(20px);
      opacity: 0;
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      position: relative;
    }

    .settings-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 20px;
      padding: 1px;
      background: linear-gradient(135deg, 
        rgba(0, 240, 255, 0.3) 0%, 
        rgba(188, 19, 254, 0.3) 50%,
        rgba(0, 240, 255, 0.3) 100%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    @keyframes slideUp {
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* Scrollbar */
    .settings-panel::-webkit-scrollbar {
      width: 6px;
    }
    .settings-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .settings-panel::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;
    }
    .settings-panel::-webkit-scrollbar-thumb:hover {
      background: #52525b;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
      position: relative;
    }

    .settings-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
      border-radius: 2px;
    }
    
    .settings-header h2 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      font-size: 1.5rem;
    }

    .settings-header button {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      cursor: pointer;
      padding: 10px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      width: 40px;
      height: 40px;
    }
    
    .settings-header button:hover {
      background: rgba(0, 240, 255, 0.2);
      border-color: var(--primary-color);
      box-shadow: 0 0 15px var(--glow-cyan);
      transform: rotate(90deg);
    }

    .setting-group {
      margin-bottom: 28px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }

    .setting-group::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, 
        transparent, 
        var(--primary-color), 
        var(--secondary-color),
        transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .setting-group:hover::before {
      opacity: 1;
    }

    .setting-group:hover {
      border-color: var(--border-hover);
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
    }

    .setting-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-main);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.85rem;
    }

    .setting-value {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(188, 19, 254, 0.15));
      padding: 4px 10px;
      border-radius: 8px;
      color: var(--primary-color);
      border: 1px solid var(--border-color);
      font-weight: 600;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }

    .device-select {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    select, input[type="text"], textarea {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: all 0.3s;
    }

    select:focus, input[type="text"]:focus, textarea:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
      background: rgba(15, 20, 30, 0.95);
    }
    
    select option {
      background: var(--bg-panel);
      color: var(--text-main);
    }

    input[type=range] {
      width: 100%;
      -webkit-appearance: none; 
      background: transparent; 
      margin: 12px 0;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 18px;
      width: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      cursor: pointer;
      margin-top: -7px; 
      box-shadow: 0 0 15px var(--glow-cyan), 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 20px var(--glow-cyan), 0 0 30px var(--glow-magenta);
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 6px;
      cursor: pointer;
      background: linear-gradient(90deg, 
        var(--border-color) 0%, 
        rgba(0, 240, 255, 0.3) 50%,
        var(--border-color) 100%);
      border-radius: 3px;
    }

    .info-text {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 8px;
      padding-left: 12px;
      border-left: 2px solid var(--border-color);
      font-style: italic;
      line-height: 1.5;
    }
    
    textarea.memory-display {
      height: 120px;
      font-family: monospace;
      font-size: 0.85rem;
    }

    textarea.prompt-input {
      height: 80px;
      margin-top: 8px;
    }
    
    .btn-small {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 12px 20px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 8px;
      width: 100%;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      position: relative;
      overflow: hidden;
    }

    .btn-small::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      opacity: 0;
      transition: opacity 0.3s;
    }

    .btn-small:hover {
      background: rgba(0, 240, 255, 0.1);
      border-color: var(--primary-color);
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
      transform: translateY(-2px);
    }

    .btn-small.primary {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-color: transparent;
      color: white;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
    }

    .btn-small.primary:hover {
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.6), 0 0 40px rgba(188, 19, 254, 0.4);
      transform: translateY(-2px) scale(1.02);
    }
    
    .btn-small.danger {
      color: var(--danger-color);
      border-color: rgba(255, 68, 68, 0.3);
    }
    
    .btn-small.danger:hover {
      background: rgba(255, 68, 68, 0.15);
      border-color: var(--danger-color);
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
    }

    .btn-icon {
      background: rgba(255, 68, 68, 0.1);
      border: 1px solid rgba(255, 68, 68, 0.3);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 6px;
      border-radius: 8px;
      color: var(--text-dim);
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-icon:hover { 
        color: var(--danger-color);
        background: rgba(255, 68, 68, 0.2);
        border-color: var(--danger-color);
        box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
        transform: scale(1.1);
    }
    
    .btn-icon-small {
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 1.2rem;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.3s;
      font-weight: bold;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-icon-small:hover {
      color: var(--danger-color);
      background: rgba(255, 68, 68, 0.15);
      border-color: rgba(255, 68, 68, 0.4);
      box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
      transform: scale(1.2);
    }
    
    .memory-categories {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      max-height: 300px;
      overflow-y: auto;
      background: var(--bg-input);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid var(--border-color);
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
    }
    
    .memory-category {
      margin-bottom: 8px;
    }
    
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 4px 8px;
    }
    
    .category-title {
      font-weight: 700;
      font-size: 0.75rem;
      color: var(--text-main);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .category-count {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: #000;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 700;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
    }
    
    .memory-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .memory-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--bg-panel);
      border-radius: 10px;
      font-size: 0.85rem;
      border: 1px solid transparent;
      transition: all 0.3s;
    }

    .memory-item:hover {
      border-color: var(--border-hover);
      background: rgba(0, 240, 255, 0.05);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
      transform: translateX(4px);
    }
    
    .memory-item span {
      flex: 1;
      color: var(--text-main);
      margin-right: 8px;
    }
    
    .memory-empty {
      text-align: center;
      padding: 24px;
      color: var(--text-dim);
      font-size: 0.875rem;
      font-style: italic;
    }
    
    .memory-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    
    .memory-actions .btn-small {
      flex: 1;
      margin-top: 0;
    }
    
    .memory-actions label.btn-small {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .creation-form {
      margin-top: 16px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
      animation: fadeIn 0.3s ease;
      background: rgba(0, 240, 255, 0.03);
      border-radius: 12px;
      padding: 16px;
      margin-top: 12px;
    }
    
    .creation-form input {
      margin-bottom: 8px;
    }

    /* Mobile Adaptations */
    @media (max-width: 768px) {
      .settings-panel {
        padding: 16px;
        width: 100%;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
        border: none;
      }
      
      .memory-actions {
        flex-direction: column;
      }
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

  private _exportMemory() {
    this._dispatch('export-memory', null);
  }

  private _handleImportMemory(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this._dispatch('import-memory', input.files[0]);
      input.value = ''; // Reset input
    }
  }

  private _deleteMemoryItem(category: MemoryCategory, id: string) {
    this._dispatch('delete-memory-item', {category, id});
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div class="settings-overlay" @click=${(e: Event) => e.target === e.currentTarget && this._close()}>
        <div class="settings-panel">
          <div class="settings-header">
            <h2>Paramètres</h2>
            <button @click=${this._close} aria-label="Fermer les paramètres" title="Fermer (Échap)">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
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
            <select 
              @change=${(e: any) => this._dispatch('personality-changed', e.target.value)}
              aria-label="Sélectionner une personnalité">
              ${this.personalities.map(p => html`
                <option value=${p.id} ?selected=${this.selectedPersonalityId === p.id}>
                  ${p.name} ${p.isCustom ? '(Personnalisée)' : ''}
                </option>
              `)}
            </select>
            
            ${!this.isCreatingPersonality ? html`
              <button class="btn-small" @click=${() => this.isCreatingPersonality = true}>
                <span>+</span> Créer une nouvelle personnalité
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
                <div style="display: flex; gap: 12px; margin-top: 12px;">
                  <button class="btn-small" @click=${() => this.isCreatingPersonality = false}>Annuler</button>
                  <button class="btn-small primary" @click=${this._savePersonality}>Enregistrer</button>
                </div>
              </div>
            `}
          </div>

          <div class="setting-group">
            <label class="setting-label">
                <span>Mémoire à long terme</span>
                <span class="setting-value" style="font-size: 0.7rem; cursor: help" title="Ce que l'IA a appris de vous">?</span>
            </label>
            
            <!-- Memory Categories -->
            <div class="memory-categories">
              ${this.structuredMemory.preferences.length > 0 ? html`
                <div class="memory-category">
                  <div class="category-header">
                    <span class="category-title">📋 Préférences</span>
                    <span class="category-count">${this.structuredMemory.preferences.length}</span>
                  </div>
                  <div class="memory-items">
                    ${this.structuredMemory.preferences.map(item => html`
                      <div class="memory-item">
                        <span>${item.content}</span>
                        <button class="btn-icon-small" @click=${() => this._deleteMemoryItem('preferences', item.id)} title="Supprimer">×</button>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
              
              ${this.structuredMemory.facts.length > 0 ? html`
                <div class="memory-category">
                  <div class="category-header">
                    <span class="category-title">ℹ️ Faits</span>
                    <span class="category-count">${this.structuredMemory.facts.length}</span>
                  </div>
                  <div class="memory-items">
                    ${this.structuredMemory.facts.map(item => html`
                      <div class="memory-item">
                        <span>${item.content}</span>
                        <button class="btn-icon-small" @click=${() => this._deleteMemoryItem('facts', item.id)} title="Supprimer">×</button>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
              
              ${this.structuredMemory.context.length > 0 ? html`
                <div class="memory-category">
                  <div class="category-header">
                    <span class="category-title">🌍 Contexte</span>
                    <span class="category-count">${this.structuredMemory.context.length}</span>
                  </div>
                  <div class="memory-items">
                    ${this.structuredMemory.context.map(item => html`
                      <div class="memory-item">
                        <span>${item.content}</span>
                        <button class="btn-icon-small" @click=${() => this._deleteMemoryItem('context', item.id)} title="Supprimer">×</button>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
              
              ${this.structuredMemory.preferences.length === 0 && 
                this.structuredMemory.facts.length === 0 && 
                this.structuredMemory.context.length === 0 ? html`
                <div class="memory-empty">
                  Aucune mémoire pour le moment. Parlez-moi pour que je m'en souvienne !
                </div>
              ` : ''}
            </div>
            
            <!-- Memory Actions -->
            <div class="memory-actions">
              <button class="btn-small" @click=${this._exportMemory} title="Exporter la mémoire en JSON">
                📥 Exporter
              </button>
              <label class="btn-small" style="cursor: pointer;">
                📤 Importer
                <input type="file" accept=".json" style="display: none;" @change=${this._handleImportMemory}>
              </label>
              <button class="btn-small danger" @click=${() => this._dispatch('clear-memory', null)}>
                🗑️ Effacer
              </button>
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label">Voix du Synthétiseur</label>
            <select 
              @change=${(e: any) => this._dispatch('voice-changed', e.target.value)}
              aria-label="Sélectionner une voix">
              ${VOICES.map(voice => html`
                <option value=${voice} ?selected=${this.selectedVoice === voice}>${voice}</option>
              `)}
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">Style et accent</label>
            <select 
              @change=${(e: any) => this._dispatch('style-changed', e.target.value)}
              aria-label="Sélectionner un style">
              ${STYLES.map(style => html`
                <option value=${style} ?selected=${this.selectedStyle === style}>${style}</option>
              `)}
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <span>Taille du texte</span>
              <span class="setting-value">${Math.round(this.textScale * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.9"
              max="1.4"
              step="0.05"
              .value=${String(this.textScale)}
              @input=${(e: any) => this._dispatch('text-scale-changed', parseFloat(e.target.value))}
              aria-label="Taille du texte"
            >
            <div class="info-text">Agrandissez les bulles et panneaux pour améliorer la lisibilité.</div>
          </div>

          <div class="setting-group">
            <label class="setting-label" style="cursor: pointer; user-select: none;">
              <span>VU Meter (Indicateur audio)</span>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input 
                  type="checkbox" 
                  .checked=${this.showVUMeter}
                  @change=${(e: any) => this._dispatch('vu-meter-changed', e.target.checked)}
                  style="width: 18px; height: 18px; cursor: pointer;"
                >
                <span style="font-size: 0.875rem; color: var(--text-dim);">
                  ${this.showVUMeter ? 'Activé' : 'Désactivé'}
                </span>
              </label>
            </label>
            <div class="info-text">Affiche les niveaux audio d'entrée et de sortie en temps réel.</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <span>Vitesse de lecture</span>
              <span class="setting-value">${this.playbackRate.toFixed(1)}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              .value=${this.playbackRate}
              @input=${(e: any) => this._dispatch('rate-changed', parseFloat(e.target.value))}
              aria-label="Vitesse de lecture"
              aria-valuemin="0.5"
              aria-valuemax="2.0"
              aria-valuenow=${this.playbackRate}
            >
          </div>

          <div class="setting-group">
            <label class="setting-label">Périphériques audio</label>
            <div class="device-select">
              <span style="font-size:0.85rem; color: var(--text-dim);">Microphone</span>
              <select
                @change=${(e: any) => this._dispatch('input-device-changed', e.target.value)}
                aria-label="Sélectionner le microphone">
                ${this.inputDevices.map(device => html`
                  <option value=${device.deviceId} ?selected=${device.deviceId === this.selectedInputDeviceId}>
                    ${device.label}
                  </option>
                `)}
              </select>
            </div>
            <div class="device-select">
              <span style="font-size:0.85rem; color: var(--text-dim);">Sortie audio</span>
              <select
                @change=${(e: any) => this._dispatch('output-device-changed', e.target.value)}
                aria-label="Sélectionner le haut-parleur"
                ?disabled=${!this.canSelectOutput}>
                ${this.outputDevices.map(device => html`
                  <option value=${device.deviceId} ?selected=${device.deviceId === this.selectedOutputDeviceId}>
                    ${device.label}
                  </option>
                `)}
              </select>
              ${!this.canSelectOutput ? html`
                <div class="info-text">La sélection de sortie est indisponible sur ce navigateur.</div>
              ` : ''}
            </div>
            <button
              class="btn-small primary"
              style="margin-top: 16px;"
              ?disabled=${this.isCalibratingInput}
              @click=${() => this._dispatch('calibrate-input', null)}>
              ${this.isCalibratingInput ? 'Calibrage en cours...' : 'Calibrer automatiquement le micro'}
            </button>
            <div class="info-text">Parlez pendant quelques secondes pour équilibrer automatiquement le niveau d’entrée.</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <span>Hauteur (Pitch)</span>
              <span class="setting-value">${this.detune} cents</span>
            </label>
            <input 
              type="range" 
              min="-1200" 
              max="1200" 
              step="100" 
              .value=${this.detune}
              @input=${(e: any) => this._dispatch('detune-changed', parseFloat(e.target.value))}
              aria-label="Hauteur de la voix"
              aria-valuemin="-1200"
              aria-valuemax="1200"
              aria-valuenow=${this.detune}
            >
          </div>

          <!-- Audio Equalizer Section -->
          <div class="setting-group">
            <label class="setting-label">
              <span>Égaliseur Audio</span>
            </label>
            <select 
              @change=${(e: any) => this._dispatch('audio-preset-changed', e.target.value)}
              aria-label="Préréglage audio">
              <option value="Personnalisé" ?selected=${this.audioPreset === 'Personnalisé'}>Personnalisé</option>
              <option value="Voix" ?selected=${this.audioPreset === 'Voix'}>Voix</option>
              <option value="Musique" ?selected=${this.audioPreset === 'Musique'}>Musique</option>
              <option value="Neutre" ?selected=${this.audioPreset === 'Neutre'}>Neutre</option>
              <option value="Bass Boost" ?selected=${this.audioPreset === 'Bass Boost'}>Bass Boost</option>
              <option value="Clarté" ?selected=${this.audioPreset === 'Clarté'}>Clarté</option>
            </select>
            
            <div style="margin-top: 16px;">
              <label class="setting-label" style="margin-bottom: 8px;">
                <span>Basses</span>
                <span class="setting-value">${this.bassGain > 0 ? '+' : ''}${this.bassGain.toFixed(1)} dB</span>
              </label>
              <input 
                type="range" 
                min="-20" 
                max="20" 
                step="0.5" 
                .value=${this.bassGain}
                @input=${(e: any) => {
                  this.bassGain = parseFloat(e.target.value);
                  this.audioPreset = 'Personnalisé';
                  this._dispatch('bass-changed', this.bassGain);
                }}
                aria-label="Niveau des basses"
                aria-valuemin="-20"
                aria-valuemax="20"
                aria-valuenow=${this.bassGain}
              >
            </div>
            
            <div style="margin-top: 16px;">
              <label class="setting-label" style="margin-bottom: 8px;">
                <span>Aigus</span>
                <span class="setting-value">${this.trebleGain > 0 ? '+' : ''}${this.trebleGain.toFixed(1)} dB</span>
              </label>
              <input 
                type="range" 
                min="-20" 
                max="20" 
                step="0.5" 
                .value=${this.trebleGain}
                @input=${(e: any) => {
                  this.trebleGain = parseFloat(e.target.value);
                  this.audioPreset = 'Personnalisé';
                  this._dispatch('treble-changed', this.trebleGain);
                }}
                aria-label="Niveau des aigus"
                aria-valuemin="-20"
                aria-valuemax="20"
                aria-valuenow=${this.trebleGain}
              >
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border-color);">
            <div style="color: var(--text-dim); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;">
              <span style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700;">NeuroChat</span>
              <span style="margin: 0 8px;">•</span>
              <span>v2.0</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
