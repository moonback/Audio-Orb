import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Personality} from '../personality';
import {StructuredMemory, MemoryCategory} from '../memory';

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
  @property({type: Object}) structuredMemory: StructuredMemory = {preferences: [], facts: [], context: []};
  
  // Personality Props
  @property({type: Array}) personalities: Personality[] = [];
  @property({type: String}) selectedPersonalityId = 'assistant';
  
  // Audio Equalizer Props
  @property({type: Number}) bassGain = 0;
  @property({type: Number}) trebleGain = 0;
  @property({type: String}) audioPreset = 'Personnalisé';

  @state() isCreatingPersonality = false;
  @state() newPersonalityName = '';
  @state() newPersonalityPrompt = '';

  static styles = css`
    :host {
      font-family: 'Google Sans', Roboto, sans-serif;
      --glass-bg: rgba(15, 15, 25, 0.8);
      --glass-border: rgba(255, 255, 255, 0.1);
      --primary-color: #8ab4f8;
      --primary-hover: #aecbfa;
      --danger-color: #ff8a80;
      --text-main: #e8eaed;
      --text-dim: #9aa0a6;
      --input-bg: rgba(255, 255, 255, 0.05);
    }

    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      opacity: 0;
      animation: fadeIn 0.25s ease-out forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .settings-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 28px;
      padding: 32px;
      width: 400px;
      max-height: 85vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      backdrop-filter: blur(24px);
      transform: scale(0.9) translateY(20px);
      opacity: 0;
      animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      animation-delay: 0.05s;
    }

    @keyframes slideUp {
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .settings-panel::-webkit-scrollbar {
      width: 8px;
    }
    .settings-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .settings-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    .settings-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 16px;
    }
    
    .settings-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 400;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #fff, #aaa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .settings-header button {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-dim);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
      display: flex;
    }
    
    .settings-header button:hover {
      background: rgba(255,255,255,0.15);
      color: white;
      transform: rotate(90deg);
    }

    .setting-group {
      margin-bottom: 28px;
      background: rgba(0,0,0,0.2);
      padding: 20px;
      border-radius: 20px;
      border: 1px solid transparent;
      transition: border-color 0.3s;
    }

    .setting-group:hover {
      border-color: rgba(255,255,255,0.05);
    }

    .setting-label {
      margin-bottom: 12px;
      font-size: 0.8rem;
      color: var(--text-dim);
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
    }

    .setting-value {
      color: var(--primary-color);
      font-family: 'Roboto Mono', monospace;
      font-size: 0.85rem;
      background: rgba(138, 180, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    select, input[type="text"] {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--glass-border);
      color: white;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
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
      box-shadow: 0 0 0 4px rgba(138, 180, 248, 0.1);
    }
    
    select option {
      background: #1a1a1a;
      color: white;
    }

    input[type=range] {
      width: 100%;
      -webkit-appearance: none; 
      background: transparent; 
      margin: 10px 0;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
      margin-top: -8px; 
      box-shadow: 0 0 15px rgba(138, 180, 248, 0.5);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid white;
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

    .info-text {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 8px;
      line-height: 1.4;
    }

    textarea {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      color: var(--text-main);
      padding: 14px;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.85rem;
      resize: none;
      transition: all 0.2s;
      line-height: 1.5;
    }
    
    textarea.memory-display {
      height: 120px;
      opacity: 0.8;
    }

    textarea.prompt-input {
      height: 100px;
      margin-top: 8px;
      font-family: 'Google Sans', Roboto, sans-serif;
    }
    
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      background: rgba(255,255,255,0.08);
    }

    .btn-small {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-main);
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      margin-top: 12px;
      width: 100%;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .btn-small:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .btn-small.primary {
      background: var(--primary-color);
      color: #000;
      font-weight: 600;
      border: none;
      box-shadow: 0 4px 12px rgba(138, 180, 248, 0.3);
    }

    .btn-small.primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(138, 180, 248, 0.4);
    }
    
    .btn-small.danger {
        color: var(--danger-color);
        border-color: rgba(255, 138, 128, 0.3);
    }
    
    .btn-small.danger:hover {
        background: rgba(255, 138, 128, 0.1);
        border-color: var(--danger-color);
    }

    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 6px;
      border-radius: 8px;
      color: var(--text-dim);
      transition: all 0.2s;
    }
    .btn-icon:hover { 
        background: rgba(255,255,255,0.1);
        color: var(--danger-color);
    }
    
    .btn-icon-small {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 1.2rem;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s;
      line-height: 1;
    }
    
    .btn-icon-small:hover {
      background: rgba(255, 138, 128, 0.2);
      color: var(--danger-color);
    }
    
    .memory-categories {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .memory-categories::-webkit-scrollbar {
      width: 6px;
    }
    
    .memory-categories::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    
    .memory-category {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .category-title {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .category-count {
      background: rgba(138, 180, 248, 0.2);
      color: var(--primary-color);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .memory-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .memory-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 0.85rem;
      line-height: 1.4;
      transition: background 0.2s;
    }
    
    .memory-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    
    .memory-item span {
      flex: 1;
      color: var(--text-main);
    }
    
    .memory-empty {
      text-align: center;
      padding: 24px;
      color: var(--text-dim);
      font-size: 0.9rem;
      font-style: italic;
    }
    
    .memory-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
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
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--glass-border);
      animation: fadeIn 0.3s ease;
    }
    
    .creation-form input {
      margin-bottom: 12px;
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
          
          <div style="text-align: center; margin-top: 40px; color: var(--text-dim); font-size: 0.8rem;">
            Audio Orb - v2.0
          </div>
        </div>
      </div>
    `;
  }
}
