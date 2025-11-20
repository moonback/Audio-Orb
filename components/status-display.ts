import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('status-display')
export class StatusDisplay extends LitElement {
  @property({type: String}) status = '';
  @property({type: String}) error = '';
  @property({type: Boolean}) isProcessing = false;
  @property({type: String}) fallbackMessage = '';
  @property({type: Number}) nextRetrySeconds = 0;

  // Internal state to handle toast animation
  @state() private _visibleError: string = '';
  private _errorTimeout: any;

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('error') && this.error) {
      this._showError(this.error);
    }
  }

  private _showError(msg: string) {
    this._visibleError = msg;
    if (this._errorTimeout) clearTimeout(this._errorTimeout);
    
    // Auto-hide error after 5 seconds
    this._errorTimeout = setTimeout(() => {
      this._visibleError = '';
      // Dispatch event to clear parent error state if needed
      this.dispatchEvent(new CustomEvent('clear-error', {bubbles: true, composed: true}));
    }, 5000);
  }

  static styles = css`
    :host {
      z-index: 20;
      text-align: center;
      font-family: 'Exo 2', 'Google Sans', sans-serif;
      pointer-events: none;
      width: 100%;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    /* Status Badge (Ready, Listening...) */
    .status-badge {
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 240, 255, 0.2);
      padding: 8px 20px;
      border-radius: 20px;
      color: rgba(0, 240, 255, 0.8);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: all 0.3s ease;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.1);
      text-shadow: 0 0 5px rgba(0, 240, 255, 0.3);
    }

    /* Error Toast */
    .error-toast {
      background: rgba(30, 5, 10, 0.9);
      border-left: 4px solid #ff2a6d;
      padding: 12px 20px;
      border-radius: 8px;
      color: #ffd6e0;
      font-size: 0.9rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 42, 109, 0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      max-width: 90%;
      border: 1px solid rgba(255, 42, 109, 0.3);
    }

    .error-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff2a6d;
      filter: drop-shadow(0 0 5px rgba(255, 42, 109, 0.6));
    }

    /* Processing State (Memory) */
    .processing-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      background: rgba(10, 15, 25, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 30px;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.15);
      animation: fadeIn 0.3s ease;
      z-index: 30;
    }

    .processing-spinner {
      position: relative;
      width: 24px;
      height: 24px;
    }

    .processing-spinner::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(0, 240, 255, 0.1);
      border-top-color: #00f0ff;
      border-right-color: #00f0ff;
      animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      filter: drop-shadow(0 0 4px #00f0ff);
    }
    
    .processing-spinner::after {
      content: '';
      position: absolute;
      inset: 5px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: rgba(188, 19, 254, 0.8);
      animation: spin 0.6s linear infinite reverse;
      filter: drop-shadow(0 0 3px #bc13fe);
    }

    .processing-text {
      color: #e0f7fa;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-20px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .fallback-banner {
      background: rgba(255, 153, 0, 0.1);
      border: 1px solid rgba(255, 187, 92, 0.4);
      color: #ffd08a;
      padding: 12px 20px;
      border-radius: 14px;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 0 20px rgba(255, 153, 0, 0.1);
      backdrop-filter: blur(10px);
    }
  `;

  private formatRetry() {
    if (!this.nextRetrySeconds) return '';
    if (this.nextRetrySeconds < 60) return `${Math.max(1, this.nextRetrySeconds)}s`;
    const minutes = Math.floor(this.nextRetrySeconds / 60);
    const seconds = this.nextRetrySeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  render() {
      return html`
      <!-- Memory Processing Indicator -->
      ${this.isProcessing ? html`
        <div class="processing-container" role="status" aria-live="polite" aria-label="Traitement en cours">
          <div class="processing-spinner" aria-hidden="true"></div>
          <div class="processing-text">
            ${this.status}...
          </div>
        </div>
      ` : html`
        <!-- Regular Status -->
        <div class="status-badge" role="status" aria-live="polite">${this.status}</div>
      `}

      ${this.fallbackMessage ? html`
        <div class="fallback-banner" role="alert">
          <strong>${this.fallbackMessage}</strong>
          ${this.nextRetrySeconds ? html`<span>Nouvelle tentative dans ${this.formatRetry()}.</span>` : ''}
        </div>
      ` : ''}

      <!-- Error Toast -->
      ${this._visibleError ? html`
        <div class="error-toast">
          <div class="error-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
          </div>
          <span>${this._visibleError}</span>
      </div>
      ` : ''}
    `;
  }
}
