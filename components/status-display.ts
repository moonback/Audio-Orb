import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('status-display')
export class StatusDisplay extends LitElement {
  @property({type: String}) status = '';
  @property({type: String}) error = '';
  @property({type: Boolean}) isProcessing = false;

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
      position: absolute;
      top: 80px; /* Below latency indicator roughly */
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      text-align: center;
      font-family: 'Google Sans', Roboto, sans-serif;
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
      background: rgba(10, 10, 20, 0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 16px;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }

    /* Error Toast */
    .error-toast {
      background: rgba(30, 5, 5, 0.9);
      border-left: 4px solid #ff5252;
      padding: 12px 20px;
      border-radius: 8px;
      color: #ffdede;
      font-size: 0.9rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto; /* Allow clicking close button if we had one */
      max-width: 90%;
    }

    .error-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff5252;
    }

    /* Processing State (Memory) */
    .processing-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      background: rgba(20, 20, 40, 0.8);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(138, 180, 248, 0.3);
      border-radius: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
      border: 3px solid rgba(138, 180, 248, 0.2);
      border-top-color: #8ab4f8;
      border-right-color: #8ab4f8;
      animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    
    .processing-spinner::after {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: rgba(138, 180, 248, 0.6);
      animation: spin 0.6s linear infinite reverse;
    }

    .processing-text {
      color: #e8eaed;
      font-weight: 500;
      font-size: 0.9rem;
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
  `;

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
