import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Personality} from '../personality';
import {StructuredMemory, MemoryCategory} from '../memory';

const VOICES = ['Orus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
const STYLES = ['Naturel', 'Professionnel', 'Joyeux', 'Accent britannique', 'Accent français', 'Chuchotement', 'Enthousiaste'];
type DeviceOption = { deviceId: string; label: string };

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
  @property({type: Number}) textScale = 1;
  @property({type: Array}) inputDevices: DeviceOption[] = [];
  @property({type: Array}) outputDevices: DeviceOption[] = [];
  @property({type: String}) selectedInputDeviceId = 'default';
  @property({type: String}) selectedOutputDeviceId = 'default';
  @property({type: Boolean}) canSelectOutput = false;
  @property({type: Boolean}) isCalibratingInput = false;

  @state() isCreatingPersonality = false;
  @state() newPersonalityName = '';
  @state() newPersonalityPrompt = '';

  static styles = css`
    :host {
      font-family: 'Exo 2', 'Google Sans', sans-serif;
      --glass-bg: rgba(10, 15, 25, 0.9);
      --glass-border: rgba(0, 240, 255, 0.2);
      --primary-color: #00f0ff;
      --primary-hover: #60f7ff;
      --danger-color: #ff2a6d;
      --text-main: #e0f7fa;
      --text-dim: #81d4fa;
      --input-bg: rgba(0, 0, 0, 0.3);
    }

    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(20px) saturate(180%);
      opacity: 0;
      animation: fadeIn 0.2s ease-out forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .settings-panel {
      background: linear-gradient(135deg, rgba(5, 10, 20, 0.85), rgba(10, 15, 25, 0.75));
      border: 1px solid rgba(0, 255, 255, 0.25);
      border-radius: 20px;
      padding: 28px;
      width: 850px;
      max-width: 94vw;
      max-height: 88vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 
        0 0 60px rgba(0, 255, 255, 0.15),
        0 0 100px rgba(255, 0, 255, 0.08),
        0 20px 50px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(30px) saturate(180%);
      transform: scale(0.92) translateY(15px);
      opacity: 0;
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      animation-delay: 0.05s;
    }

    @keyframes slideUp {
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .settings-panel::-webkit-scrollbar {
      width: 4px;
    }
    .settings-panel::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }
    .settings-panel::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.3));
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
    }
    .settings-panel::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.5), rgba(255, 0, 255, 0.5));
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      border-bottom: 1px solid rgba(0, 255, 255, 0.2);
      padding-bottom: 14px;
    }
    
    .settings-header h2 {
      margin: 0;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #00ffff;
      text-shadow: 
        0 0 15px rgba(0, 255, 255, 0.6),
        0 0 30px rgba(0, 255, 255, 0.3);
      background: linear-gradient(90deg, #00ffff, #00ccff, #00ffff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .settings-header button {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.1));
      border: 1px solid rgba(0, 255, 255, 0.2);
      color: var(--text-dim);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .settings-header button:hover {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 200, 255, 0.1));
      color: #00ffff;
      border-color: #00ffff;
      transform: rotate(90deg) scale(1.1);
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.4),
        0 4px 15px rgba(0, 0, 0, 0.4);
    }

    .setting-group {
      margin-bottom: 20px;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2));
      padding: 18px;
      border-radius: 14px;
      border: 1px solid rgba(0, 255, 255, 0.08);
      transition: all 0.3s ease;
      position: relative;
    }

    .setting-group::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), transparent);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .setting-group:hover {
      border-color: rgba(0, 255, 255, 0.2);
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.25));
    }

    .setting-group:hover::before {
      opacity: 1;
    }

    .setting-label {
      margin-bottom: 10px;
      font-size: 0.8rem;
      color: rgba(160, 215, 255, 0.9);
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }

    .setting-value {
      color: #00ffff;
      font-family: 'Orbitron', monospace;
      font-size: 0.8rem;
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.12), rgba(0, 200, 255, 0.08));
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0, 255, 255, 0.25);
      box-shadow: 
        0 0 10px rgba(0, 255, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
    }

    .device-select {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    select, input[type="text"] {
      width: 100%;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3));
      border: 1px solid rgba(0, 255, 255, 0.2);
      color: var(--text-main);
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: 'Exo 2', sans-serif;
      outline: none;
      transition: all 0.3s ease;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300ffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 14px top 50%;
      background-size: 9px auto;
      padding-right: 40px;
    }
    
    select:hover, select:focus, input[type="text"]:focus {
      border-color: rgba(0, 255, 255, 0.5);
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(0, 200, 255, 0.05));
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.15),
        inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    select option {
      background: #0a0f19;
      color: var(--text-main);
      padding: 10px;
    }

    input[type=range] {
      width: 100%;
      -webkit-appearance: none; 
      background: transparent; 
      margin: 10px 0;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00ffff, #00ccff);
      border: 2px solid rgba(0, 255, 255, 0.5);
      cursor: pointer;
      margin-top: -6px; 
      box-shadow: 
        0 0 12px rgba(0, 255, 255, 0.8),
        0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
      background: linear-gradient(135deg, #00ffff, #00eeff);
      border-color: #00ffff;
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 1),
        0 0 30px rgba(0, 255, 255, 0.5);
    }

    input[type=range]::-webkit-slider-thumb:active {
      transform: scale(1.05);
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.2));
      border-radius: 2px;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .info-text {
      font-size: 0.75rem;
      color: rgba(160, 215, 255, 0.7);
      margin-top: 6px;
      line-height: 1.4;
    }

    textarea {
      width: 100%;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3));
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 10px;
      color: var(--text-main);
      padding: 12px;
      font-family: 'Exo 2', monospace;
      font-size: 0.85rem;
      resize: none;
      transition: all 0.3s ease;
      line-height: 1.5;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    textarea.memory-display {
      height: 110px;
      opacity: 0.9;
    }

    textarea.prompt-input {
      height: 90px;
      margin-top: 8px;
      font-family: 'Exo 2', sans-serif;
    }
    
    textarea:focus {
      outline: none;
      border-color: rgba(0, 255, 255, 0.5);
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(0, 200, 255, 0.05));
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.15),
        inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .btn-small {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(0, 200, 255, 0.05));
      border: 1px solid rgba(0, 255, 255, 0.25);
      color: var(--text-main);
      padding: 10px 18px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 10px;
      width: 100%;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      position: relative;
      overflow: hidden;
    }
    
    .btn-small::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .btn-small:hover {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.12), rgba(0, 200, 255, 0.08));
      border-color: rgba(0, 255, 255, 0.4);
      transform: translateY(-2px);
      box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(0, 255, 255, 0.2);
    }

    .btn-small:hover::before {
      opacity: 1;
    }

    .btn-small.primary {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 200, 255, 0.15));
      color: #00ffff;
      border: 1px solid rgba(0, 255, 255, 0.5);
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.2),
        0 2px 10px rgba(0, 0, 0, 0.3);
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }

    .btn-small.primary:hover {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 200, 255, 0.2));
      transform: translateY(-2px);
      box-shadow: 
        0 0 35px rgba(0, 255, 255, 0.4),
        0 4px 20px rgba(0, 0, 0, 0.4);
    }
    
    .btn-small.danger {
      color: #ff3388;
      border-color: rgba(255, 0, 100, 0.4);
      background: linear-gradient(135deg, rgba(255, 0, 100, 0.12), rgba(200, 0, 80, 0.08));
      text-shadow: 0 0 8px rgba(255, 0, 100, 0.4);
    }
    
    .btn-small.danger:hover {
      background: linear-gradient(135deg, rgba(255, 0, 100, 0.2), rgba(200, 0, 80, 0.15));
      border-color: rgba(255, 0, 100, 0.6);
      box-shadow: 
        0 0 25px rgba(255, 0, 100, 0.3),
        0 4px 20px rgba(0, 0, 0, 0.4);
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
        background: rgba(255, 42, 109, 0.1);
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
      background: rgba(255, 42, 109, 0.1);
      color: var(--danger-color);
    }
    
    .memory-categories {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 4px;
    }
    
    .memory-categories::-webkit-scrollbar {
      width: 4px;
    }
    
    .memory-categories::-webkit-scrollbar-thumb {
      background: rgba(0, 240, 255, 0.2);
      border-radius: 2px;
    }
    
    .memory-category {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .category-title {
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .category-count {
      background: rgba(0, 240, 255, 0.1);
      color: var(--primary-color);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
      border: 1px solid rgba(0, 240, 255, 0.2);
    }
    
    .memory-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .memory-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      font-size: 0.85rem;
      line-height: 1.4;
      transition: background 0.2s;
      border: 1px solid transparent;
    }
    
    .memory-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
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
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--glass-border);
      animation: fadeIn 0.3s ease;
    }
    
    .creation-form input {
      margin-bottom: 12px;
    }

    /* Mobile Adaptations */
    @media (max-width: 768px) {
      .settings-panel {
        padding: 20px;
        width: 100%;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
        border: none;
      }
      
      .settings-header h2 {
        font-size: 1.4rem;
      }
      
      .btn-small {
        padding: 14px;
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
          
          <div style="text-align: center; margin-top: 40px; color: var(--text-dim); font-size: 0.8rem;">
            NeuroChat - v2.0
          </div>
        </div>
      </div>
    `;
  }
}
