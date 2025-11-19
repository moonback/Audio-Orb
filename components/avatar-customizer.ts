import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

export interface AvatarConfig {
  // Head
  headShape: 'sphere' | 'cube' | 'icosahedron' | 'octahedron';
  headColor: string;
  headMetalness: number;
  headRoughness: number;
  
  // Eyes
  eyeShape: 'capsule' | 'sphere' | 'box';
  eyeColor: string;
  eyeGlow: boolean;
  eyeSize: number;
  eyeSpacing: number;
  
  // Mouth
  mouthStyle: 'bar' | 'wave' | 'circle' | 'line';
  mouthColor: string;
  mouthIntensity: number;
  
  // Accessories
  hasEars: boolean;
  hasRing: boolean;
  ringColor: string;
  
  // Overall
  scale: number;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  headShape: 'icosahedron',
  headColor: '#1a1a2e',
  headMetalness: 0.9,
  headRoughness: 0.1,
  
  eyeShape: 'capsule',
  eyeColor: '#00ffff',
  eyeGlow: true,
  eyeSize: 1.0,
  eyeSpacing: 0.25,
  
  mouthStyle: 'bar',
  mouthColor: '#4488ff',
  mouthIntensity: 1.5,
  
  hasEars: true,
  hasRing: true,
  ringColor: '#6688ff',
  
  scale: 1.0
};

@customElement('avatar-customizer')
export class AvatarCustomizer extends LitElement {
  @property({type: Object}) config: AvatarConfig = {...DEFAULT_AVATAR_CONFIG};
  @property({type: Boolean}) show = false;

  static styles = css`
    :host {
      font-family: 'Google Sans', Roboto, sans-serif;
      --glass-bg: rgba(15, 15, 25, 0.85);
      --glass-border: rgba(255, 255, 255, 0.1);
      --primary-color: #8ab4f8;
      --text-main: #e8eaed;
      --text-dim: #9aa0a6;
      pointer-events: auto;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.25s ease-out;
      pointer-events: auto;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 28px;
      padding: 32px;
      width: 450px;
      max-height: 85vh;
      overflow-y: auto;
      color: var(--text-main);
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      backdrop-filter: blur(24px);
      animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
    }

    @keyframes slideUp {
      from { transform: scale(0.9) translateY(20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .panel::-webkit-scrollbar {
      width: 8px;
    }
    .panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 16px;
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 400;
      letter-spacing: -0.5px;
    }

    .close-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-dim);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
      display: flex;
    }

    .close-btn:hover {
      background: rgba(255,255,255,0.15);
      color: white;
      transform: rotate(90deg);
    }

    .section {
      margin-bottom: 24px;
      background: rgba(0,0,0,0.2);
      padding: 20px;
      border-radius: 16px;
    }

    .section-title {
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .control-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 0.9rem;
      color: var(--text-main);
      margin-bottom: 8px;
      font-weight: 500;
    }

    select, input[type="color"], input[type="number"] {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: white;
      padding: 12px;
      border-radius: 12px;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s;
    }

    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 12px top 50%;
      background-size: 10px auto;
    }

    select option {
      background: #1a1a1a;
      color: white;
    }

    select:hover, select:focus, input:hover, input:focus {
      border-color: var(--primary-color);
      background-color: rgba(255,255,255,0.1);
    }

    input[type="color"] {
      height: 50px;
      cursor: pointer;
      padding: 4px;
    }

    input[type="range"] {
      width: 100%;
      -webkit-appearance: none;
      background: transparent;
      margin: 10px 0;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
      margin-top: -8px;
      box-shadow: 0 0 15px rgba(138, 180, 248, 0.5);
      transition: transform 0.2s;
      border: 2px solid white;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    input[type="range"]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .preset-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .preset-btn {
      flex: 1;
      min-width: 100px;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-main);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .preset-btn:hover {
      background: var(--primary-color);
      color: #000;
      transform: translateY(-2px);
    }

    .value-display {
      display: inline-block;
      color: var(--primary-color);
      font-family: monospace;
      font-size: 0.9rem;
      margin-left: 8px;
    }
  `;

  private _updateConfig(updates: Partial<AvatarConfig>) {
    this.config = {...this.config, ...updates};
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: this.config,
      bubbles: true,
      composed: true
    }));
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', {bubbles: true, composed: true}));
  }

  private _applyPreset(preset: string) {
    const presets: Record<string, Partial<AvatarConfig>> = {
      default: DEFAULT_AVATAR_CONFIG,
      robot: {
        headShape: 'cube',
        headColor: '#2a2a3e',
        eyeShape: 'box',
        eyeColor: '#ff0000',
        mouthStyle: 'line',
        hasEars: true,
        hasRing: false
      },
      alien: {
        headShape: 'sphere',
        headColor: '#1a3a2e',
        eyeShape: 'sphere',
        eyeColor: '#00ff00',
        eyeSize: 1.3,
        eyeSpacing: 0.35,
        mouthStyle: 'wave',
        mouthColor: '#00ff88',
        hasEars: false,
        hasRing: true,
        ringColor: '#00ff88'
      },
      minimal: {
        headShape: 'sphere',
        headColor: '#0a0a0a',
        headMetalness: 1.0,
        headRoughness: 0.0,
        eyeShape: 'capsule',
        eyeColor: '#ffffff',
        eyeGlow: false,
        eyeSize: 0.8,
        mouthStyle: 'bar',
        mouthColor: '#ffffff',
        hasEars: false,
        hasRing: false
      }
    };

    this._updateConfig(presets[preset]);
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div class="overlay" @click=${(e: Event) => e.target === e.currentTarget && this._close()}>
        <div class="panel">
          <div class="header">
            <h2>🎨 Personnaliser l'Avatar</h2>
            <button class="close-btn" @click=${this._close}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>

          <!-- Presets -->
          <div class="section">
            <div class="section-title">Préréglages</div>
            <div class="preset-buttons">
              <button class="preset-btn" @click=${() => this._applyPreset('default')}>Par défaut</button>
              <button class="preset-btn" @click=${() => this._applyPreset('robot')}>Robot</button>
              <button class="preset-btn" @click=${() => this._applyPreset('alien')}>Alien</button>
              <button class="preset-btn" @click=${() => this._applyPreset('minimal')}>Minimal</button>
            </div>
          </div>

          <!-- Head -->
          <div class="section">
            <div class="section-title">Tête</div>
            
            <div class="control-group">
              <label>Forme</label>
              <select .value=${this.config.headShape} @change=${(e: any) => this._updateConfig({headShape: e.target.value})}>
                <option value="sphere">Sphère</option>
                <option value="cube">Cube</option>
                <option value="icosahedron">Icosaèdre</option>
                <option value="octahedron">Octaèdre</option>
              </select>
            </div>

            <div class="control-group">
              <label>Couleur</label>
              <input type="color" .value=${this.config.headColor} @input=${(e: any) => this._updateConfig({headColor: e.target.value})}>
            </div>

            <div class="control-group">
              <label>
                Métal
                <span class="value-display">${this.config.headMetalness.toFixed(1)}</span>
              </label>
              <input type="range" min="0" max="1" step="0.1" .value=${this.config.headMetalness} 
                @input=${(e: any) => this._updateConfig({headMetalness: parseFloat(e.target.value)})}>
            </div>

            <div class="control-group">
              <label>
                Rugosité
                <span class="value-display">${this.config.headRoughness.toFixed(1)}</span>
              </label>
              <input type="range" min="0" max="1" step="0.1" .value=${this.config.headRoughness} 
                @input=${(e: any) => this._updateConfig({headRoughness: parseFloat(e.target.value)})}>
            </div>
          </div>

          <!-- Eyes -->
          <div class="section">
            <div class="section-title">Yeux</div>
            
            <div class="control-group">
              <label>Forme</label>
              <select .value=${this.config.eyeShape} @change=${(e: any) => this._updateConfig({eyeShape: e.target.value})}>
                <option value="capsule">Capsule</option>
                <option value="sphere">Sphère</option>
                <option value="box">Carré</option>
              </select>
            </div>

            <div class="control-group">
              <label>Couleur</label>
              <input type="color" .value=${this.config.eyeColor} @input=${(e: any) => this._updateConfig({eyeColor: e.target.value})}>
            </div>

            <div class="control-group">
              <label>
                Taille
                <span class="value-display">${this.config.eyeSize.toFixed(1)}</span>
              </label>
              <input type="range" min="0.5" max="2" step="0.1" .value=${this.config.eyeSize} 
                @input=${(e: any) => this._updateConfig({eyeSize: parseFloat(e.target.value)})}>
            </div>

            <div class="control-group">
              <label>
                Espacement
                <span class="value-display">${this.config.eyeSpacing.toFixed(2)}</span>
              </label>
              <input type="range" min="0.15" max="0.5" step="0.05" .value=${this.config.eyeSpacing} 
                @input=${(e: any) => this._updateConfig({eyeSpacing: parseFloat(e.target.value)})}>
            </div>

            <div class="control-group">
              <div class="checkbox-group">
                <input type="checkbox" id="eyeGlow" .checked=${this.config.eyeGlow} 
                  @change=${(e: any) => this._updateConfig({eyeGlow: e.target.checked})}>
                <label for="eyeGlow">Lueur</label>
              </div>
            </div>
          </div>

          <!-- Mouth -->
          <div class="section">
            <div class="section-title">Bouche</div>
            
            <div class="control-group">
              <label>Style</label>
              <select .value=${this.config.mouthStyle} @change=${(e: any) => this._updateConfig({mouthStyle: e.target.value})}>
                <option value="bar">Barre</option>
                <option value="wave">Vague</option>
                <option value="circle">Cercle</option>
                <option value="line">Ligne</option>
              </select>
            </div>

            <div class="control-group">
              <label>Couleur</label>
              <input type="color" .value=${this.config.mouthColor} @input=${(e: any) => this._updateConfig({mouthColor: e.target.value})}>
            </div>

            <div class="control-group">
              <label>
                Intensité lumineuse
                <span class="value-display">${this.config.mouthIntensity.toFixed(1)}</span>
              </label>
              <input type="range" min="0" max="3" step="0.1" .value=${this.config.mouthIntensity} 
                @input=${(e: any) => this._updateConfig({mouthIntensity: parseFloat(e.target.value)})}>
            </div>
          </div>

          <!-- Accessories -->
          <div class="section">
            <div class="section-title">Accessoires</div>
            
            <div class="control-group">
              <div class="checkbox-group">
                <input type="checkbox" id="hasEars" .checked=${this.config.hasEars} 
                  @change=${(e: any) => this._updateConfig({hasEars: e.target.checked})}>
                <label for="hasEars">Oreilles/Écouteurs</label>
              </div>
            </div>

            <div class="control-group">
              <div class="checkbox-group">
                <input type="checkbox" id="hasRing" .checked=${this.config.hasRing} 
                  @change=${(e: any) => this._updateConfig({hasRing: e.target.checked})}>
                <label for="hasRing">Anneau</label>
              </div>
            </div>

            ${this.config.hasRing ? html`
              <div class="control-group">
                <label>Couleur de l'anneau</label>
                <input type="color" .value=${this.config.ringColor} @input=${(e: any) => this._updateConfig({ringColor: e.target.value})}>
              </div>
            ` : ''}

            <div class="control-group">
              <label>
                Échelle globale
                <span class="value-display">${this.config.scale.toFixed(1)}</span>
              </label>
              <input type="range" min="0.5" max="2" step="0.1" .value=${this.config.scale} 
                @input=${(e: any) => this._updateConfig({scale: parseFloat(e.target.value)})}>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avatar-customizer': AvatarCustomizer;
  }
}

