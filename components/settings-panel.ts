import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Personality} from '../personality';
import {StructuredMemory, MemoryCategory} from '../memory';
import {CustomInstructions} from '../custom-instructions';

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
  
  // Custom Instructions Props
  @property({type: Array}) customInstructions: CustomInstructions[] = [];
  
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
  
  @state() isCreatingCustomInstruction = false;
  @state() newCustomInstructionTitle = '';
  @state() newCustomInstructionText = '';
  @state() editingCustomInstructionId: string | null = null;

  static styles = css`
    :host {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      --bg-panel: #18181b;
      --bg-input: #27272a;
      --border-color: #3f3f46;
      --primary-color: #3b82f6; /* Professional Blue */
      --primary-hover: #2563eb;
      --danger-color: #ef4444;
      --text-main: #f4f4f5;
      --text-dim: #a1a1aa;
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
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      opacity: 0;
      animation: fadeIn 0.2s ease-out forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .settings-panel {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      width: 800px;
      max-width: 90vw;
      max-height: 85vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.1), 
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transform: scale(0.95);
      opacity: 0;
      animation: slideUp 0.2s ease-out forwards;
    }

    @keyframes slideUp {
      to { transform: scale(1); opacity: 1; }
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
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
    }
    
    .settings-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-main);
      letter-spacing: -0.025em;
    }

    .settings-header button {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-dim);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      transition: all 0.2s;
    }
    
    .settings-header button:hover {
      background: var(--bg-input);
      color: var(--text-main);
    }

    .setting-group {
      margin-bottom: 24px;
    }

    .setting-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-main);
    }

    .setting-value {
      font-family: monospace;
      font-size: 0.75rem;
      background: var(--bg-input);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-dim);
      border: 1px solid var(--border-color);
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
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    select:focus, input[type="text"]:focus, textarea:focus {
      border-color: var(--primary-color);
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
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
      margin-top: -6px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: var(--border-color);
      border-radius: 2px;
    }

    .info-text {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 6px;
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
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 8px;
      width: 100%;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-small:hover {
      background: #3f3f46;
    }

    .btn-small.primary {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: white;
    }

    .btn-small.primary:hover {
      background: var(--primary-hover);
    }
    
    .btn-small.danger {
      color: var(--danger-color);
      border-color: rgba(239, 68, 68, 0.3);
    }
    
    .btn-small.danger:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--danger-color);
    }

    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 4px;
      border-radius: 4px;
      color: var(--text-dim);
      transition: color 0.2s;
    }
    .btn-icon:hover { 
        color: var(--danger-color);
        background: rgba(239, 68, 68, 0.1);
    }
    
    .btn-icon-small {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 1.1rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .btn-icon-small:hover {
      color: var(--danger-color);
      background: rgba(239, 68, 68, 0.1);
    }
    
    .memory-categories {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      max-height: 300px;
      overflow-y: auto;
      background: var(--bg-input);
      border-radius: 8px;
      padding: 8px;
      border: 1px solid var(--border-color);
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
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .category-count {
      background: rgba(255,255,255,0.1);
      color: var(--text-main);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
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
      padding: 8px 12px;
      background: var(--bg-panel);
      border-radius: 6px;
      font-size: 0.85rem;
      border: 1px solid transparent;
    }
    
    .memory-item:hover {
      border-color: var(--border-color);
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
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      animation: fadeIn 0.2s ease;
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

  private _saveCustomInstruction() {
    if (this.newCustomInstructionTitle.trim() && this.newCustomInstructionText.trim()) {
      this._dispatch('create-custom-instruction', {
        title: this.newCustomInstructionTitle,
        instructions: this.newCustomInstructionText,
        enabled: true
      });
      this.isCreatingCustomInstruction = false;
      this.newCustomInstructionTitle = '';
      this.newCustomInstructionText = '';
    }
  }

  private _toggleCustomInstruction(id: string) {
    this._dispatch('toggle-custom-instruction', id);
  }

  private _deleteCustomInstruction(id: string) {
    if (confirm('Supprimer cette instruction personnalisée ?')) {
      this._dispatch('delete-custom-instruction', id);
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

          <!-- Custom Instructions Section -->
          <div class="setting-group">
            <label class="setting-label">
              <span>Instructions personnalisées (Règles de base)</span>
              <span class="setting-value" style="font-size: 0.7rem; cursor: help" title="Règles de base et instructions pour définir comment l'IA doit interagir, au-delà de la personnalité">?</span>
            </label>
            
            ${this.customInstructions.length > 0 ? html`
              <div class="memory-categories" style="margin-top: 8px; max-height: 200px;">
                ${this.customInstructions.map(instruction => html`
                  <div class="memory-item">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" 
                          ?checked=${instruction.enabled}
                          @change=${() => this._toggleCustomInstruction(instruction.id)}
                          style="cursor: pointer;"
                        >
                        <span style="font-weight: 500; font-size: 0.875rem;">${instruction.title}</span>
                      </div>
                      ${this.editingCustomInstructionId === instruction.id ? html`
                        <div style="margin-top: 8px; padding: 8px; background: var(--bg-input); border-radius: 6px; border: 1px solid var(--border-color);">
                          <input type="text" 
                            .value=${instruction.title}
                            @input=${(e: any) => this._dispatch('update-custom-instruction', {
                              id: instruction.id,
                              updates: { title: e.target.value }
                            })}
                            placeholder="Titre"
                            style="margin-bottom: 8px;"
                          >
                          <textarea class="prompt-input" 
                            .value=${instruction.instructions}
                            @input=${(e: any) => this._dispatch('update-custom-instruction', {
                              id: instruction.id,
                              updates: { instructions: e.target.value }
                            })}
                            placeholder="Instructions..."
                            style="height: 80px; margin-bottom: 8px;"
                          ></textarea>
                          <button class="btn-small primary" @click=${() => this.editingCustomInstructionId = null} style="width: 100%;">Terminer l'édition</button>
                        </div>
                      ` : html`
                        <div style="font-size: 0.8rem; color: var(--text-dim); margin-left: 24px; white-space: pre-wrap; max-height: 60px; overflow-y: auto;">
                          ${instruction.instructions}
                        </div>
                      `}
                    </div>
                    <div style="display: flex; gap: 4px;">
                      ${this.editingCustomInstructionId !== instruction.id ? html`
                        <button class="btn-icon-small" @click=${() => this.editingCustomInstructionId = instruction.id} title="Modifier">✏️</button>
                      ` : ''}
                      <button class="btn-icon-small" @click=${() => this._deleteCustomInstruction(instruction.id)} title="Supprimer">🗑️</button>
                    </div>
                  </div>
                `)}
              </div>
            ` : html`
              <div style="text-align: center; padding: 16px; color: var(--text-dim); font-size: 0.875rem;">
                Aucune instruction personnalisée. Créez-en une pour définir des règles de base.
              </div>
            `}
            
            ${!this.isCreatingCustomInstruction ? html`
              <button class="btn-small" @click=${() => this.isCreatingCustomInstruction = true} style="margin-top: 12px;">
                <span>+</span> Ajouter une instruction personnalisée
              </button>
            ` : html`
              <div class="creation-form">
                <input type="text" placeholder="Titre (ex. Règles de politesse)" 
                  .value=${this.newCustomInstructionTitle}
                  @input=${(e: any) => this.newCustomInstructionTitle = e.target.value}
                >
                <textarea class="prompt-input" placeholder="Instructions... (ex. Toujours répondre de manière concise, éviter les blagues inappropriées)"
                  .value=${this.newCustomInstructionText}
                  @input=${(e: any) => this.newCustomInstructionText = e.target.value}
                  style="height: 100px;"
                ></textarea>
                <div style="display: flex; gap: 12px; margin-top: 12px;">
                  <button class="btn-small" @click=${() => {
                    this.isCreatingCustomInstruction = false;
                    this.newCustomInstructionTitle = '';
                    this.newCustomInstructionText = '';
                  }}>Annuler</button>
                  <button class="btn-small primary" @click=${this._saveCustomInstruction}>Enregistrer</button>
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
