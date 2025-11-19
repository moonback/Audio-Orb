import {LitElement, css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('model-selector')
export class ModelSelector extends LitElement {
  @property({type: Boolean}) show = false;
  @state() selectedSource: 'readyplayerme' | 'custom' = 'readyplayerme';
  @state() customUrl = '';
  @state() readyPlayerMeUrl = 'https://models.readyplayer.me/6913458cd14d41dcac39ac9a.glb';

  static styles = css`
    :host {
      font-family: 'Google Sans', Roboto, sans-serif;
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
      background: rgba(15, 15, 25, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 32px;
      width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      color: #e8eaed;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      backdrop-filter: blur(24px);
      animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
    }

    @keyframes slideUp {
      from { transform: scale(0.9) translateY(20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 16px;
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 400;
    }

    .close-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #9aa0a6;
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

    .option {
      background: rgba(0,0,0,0.2);
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 16px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.3s;
    }

    .option:hover {
      background: rgba(0,0,0,0.3);
      border-color: rgba(138, 180, 248, 0.3);
    }

    .option.selected {
      background: rgba(138, 180, 248, 0.1);
      border-color: #8ab4f8;
    }

    .option-title {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .option-desc {
      font-size: 0.9rem;
      color: #9aa0a6;
      line-height: 1.5;
    }

    .icon {
      font-size: 1.5rem;
    }

    input[type="text"] {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 12px;
      border-radius: 12px;
      font-size: 0.95rem;
      outline: none;
      margin-top: 12px;
      transition: all 0.2s;
    }

    input[type="text"]:focus {
      border-color: #8ab4f8;
      background: rgba(255,255,255,0.1);
    }

    .btn-primary {
      width: 100%;
      background: #8ab4f8;
      color: #000;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 24px;
    }

    .btn-primary:hover {
      background: #aecbfa;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .info-box {
      background: rgba(138, 180, 248, 0.1);
      border: 1px solid rgba(138, 180, 248, 0.3);
      padding: 16px;
      border-radius: 12px;
      margin-top: 16px;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .info-box a {
      color: #8ab4f8;
      text-decoration: none;
    }

    .info-box a:hover {
      text-decoration: underline;
    }
  `;

  private _close() {
    this.dispatchEvent(new CustomEvent('close', {bubbles: true, composed: true}));
  }

  private _selectOption(source: 'readyplayerme' | 'custom') {
    this.selectedSource = source;
  }

  private _apply() {
    const modelUrl = this.selectedSource === 'readyplayerme' 
      ? this.readyPlayerMeUrl 
      : this.customUrl;

    this.dispatchEvent(new CustomEvent('model-selected', {
      detail: { modelUrl, source: this.selectedSource },
      bubbles: true,
      composed: true
    }));
    this._close();
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div class="overlay" @click=${(e: Event) => e.target === e.currentTarget && this._close()}>
        <div class="panel">
          <div class="header">
            <h2>🧑 Choisir un Avatar 3D</h2>
            <button class="close-btn" @click=${this._close}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>

          <!-- Ready Player Me -->
          <div 
            class="option ${this.selectedSource === 'readyplayerme' ? 'selected' : ''}"
            @click=${() => this._selectOption('readyplayerme')}>
            <div class="option-title">
              <span class="icon">👤</span>
              Ready Player Me
            </div>
            <div class="option-desc">
              Avatar 3D réaliste créé avec Ready Player Me (recommandé)
            </div>
            ${this.selectedSource === 'readyplayerme' ? html`
              <input 
                type="text" 
                placeholder="Collez l'URL de votre avatar .glb"
                .value=${this.readyPlayerMeUrl}
                @input=${(e: any) => this.readyPlayerMeUrl = e.target.value}
                @click=${(e: Event) => e.stopPropagation()}>
              <div class="info-box">
                <strong>Comment obtenir un avatar :</strong><br>
                1. Allez sur <a href="https://readyplayer.me" target="_blank">readyplayer.me</a><br>
                2. Créez votre avatar gratuitement<br>
                3. Cliquez sur "Download" → "GLB for web"<br>
                4. Copiez l'URL du fichier .glb ici
              </div>
            ` : ''}
          </div>

          <!-- Custom Model -->
          <div 
            class="option ${this.selectedSource === 'custom' ? 'selected' : ''}"
            @click=${() => this._selectOption('custom')}>
            <div class="option-title">
              <span class="icon">📦</span>
              Modèle Personnalisé
            </div>
            <div class="option-desc">
              Chargez votre propre modèle 3D au format GLB/GLTF
            </div>
            ${this.selectedSource === 'custom' ? html`
              <input 
                type="text" 
                placeholder="URL de votre modèle .glb ou .gltf"
                .value=${this.customUrl}
                @input=${(e: any) => this.customUrl = e.target.value}
                @click=${(e: Event) => e.stopPropagation()}>
              <div class="info-box">
                <strong>Ressources gratuites :</strong><br>
                • <a href="https://sketchfab.com/tags/human" target="_blank">Sketchfab</a> (modèles humains gratuits)<br>
                • <a href="https://www.mixamo.com" target="_blank">Mixamo</a> (avatars animés)<br>
                • <a href="https://free3d.com" target="_blank">Free3D</a> (bibliothèque de modèles)
              </div>
            ` : ''}
          </div>

          <button 
            class="btn-primary" 
            @click=${this._apply}
            ?disabled=${
              (this.selectedSource === 'readyplayerme' && !this.readyPlayerMeUrl) ||
              (this.selectedSource === 'custom' && !this.customUrl)
            }>
            Charger ce Modèle
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'model-selector': ModelSelector;
  }
}

