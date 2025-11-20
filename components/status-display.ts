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

    /* Status Badge - Ultra Futuristic */
    .status-badge {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(0, 200, 255, 0.05));
      backdrop-filter: blur(15px) saturate(180%);
      border: 1px solid rgba(0, 255, 255, 0.25);
      padding: 6px 18px;
      border-radius: 18px;
      color: rgba(0, 255, 255, 0.9);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      transition: all 0.3s ease;
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      text-shadow: 
        0 0 8px rgba(0, 255, 255, 0.6),
        0 0 15px rgba(0, 255, 255, 0.3);
      position: relative;
    }

    .status-badge::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.3));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0.5;
      animation: shimmer 3s linear infinite;
    }

    @keyframes shimmer {
      0% { background-position: -100% 0; }
      100% { background-position: 200% 0; }
    }

    /* Error Toast - Futuristic */
    .error-toast {
      background: linear-gradient(135deg, rgba(255, 0, 100, 0.15), rgba(200, 0, 80, 0.1));
      border: 1px solid rgba(255, 0, 100, 0.4);
      padding: 10px 18px;
      border-radius: 12px;
      color: #ffcce0;
      font-size: 0.85rem;
      backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6), 
        0 0 30px rgba(255, 0, 100, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: auto;
      max-width: 88%;
      position: relative;
    }

    .error-toast::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, #ff0066, #ff3388);
      border-radius: 12px 0 0 12px;
      box-shadow: 0 0 10px rgba(255, 0, 100, 0.6);
    }

    .error-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff3388;
      filter: drop-shadow(0 0 6px rgba(255, 0, 100, 0.8));
      animation: pulse-error 2s ease-in-out infinite;
    }

    @keyframes pulse-error {
      0%, 100% { 
        filter: drop-shadow(0 0 6px rgba(255, 0, 100, 0.8));
      }
      50% { 
        filter: drop-shadow(0 0 12px rgba(255, 0, 100, 1));
      }
    }

    /* Processing State - Enhanced Futuristic */
    .processing-container {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      background: linear-gradient(135deg, rgba(5, 10, 20, 0.8), rgba(10, 15, 25, 0.7));
      backdrop-filter: blur(25px) saturate(180%);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 25px;
      box-shadow: 
        0 0 30px rgba(0, 255, 255, 0.2),
        0 8px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      animation: fadeIn 0.3s ease;
      z-index: 30;
    }

    .processing-spinner {
      position: relative;
      width: 22px;
      height: 22px;
    }

    .processing-spinner::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(0, 255, 255, 0.1);
      border-top-color: #00ffff;
      border-right-color: #00ffff;
      animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      filter: drop-shadow(0 0 6px #00ffff);
    }
    
    .processing-spinner::after {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: rgba(255, 0, 255, 0.9);
      animation: spin 0.5s linear infinite reverse;
      filter: drop-shadow(0 0 4px #ff00ff);
    }

    .processing-text {
      color: #ffffff;
      font-weight: 600;
      font-size: 0.85rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-15px) scale(0.95);
        filter: blur(3px);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
    
    .fallback-banner {
      background: linear-gradient(135deg, rgba(255, 170, 0, 0.12), rgba(255, 140, 0, 0.08));
      border: 1px solid rgba(255, 187, 92, 0.35);
      color: #ffe0a0;
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 3px;
      text-align: left;
      width: 100%;
      max-width: 400px;
      box-shadow: 
        0 0 25px rgba(255, 153, 0, 0.15),
        0 4px 15px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(15px) saturate(180%);
    }

    .fallback-banner strong {
      text-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
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
