import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('status-display')
export class StatusDisplay extends LitElement {
  @property({type: String}) status = '';
  @property({type: String}) error = '';
  @property({type: Boolean}) isProcessing = false;

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-align: center;
      font-family: 'Google Sans', Roboto, sans-serif;
      pointer-events: none;
    }

    .status-text {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 500;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      transition: all 0.3s ease;
    }

    .error-text {
      margin-top: 8px;
      color: #ff8a80;
      background: rgba(20, 0, 0, 0.6);
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid rgba(255, 138, 128, 0.2);
      font-size: 0.85rem;
      backdrop-filter: blur(4px);
      animation: slideDown 0.3s ease;
    }

    .processing-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      background: rgba(20, 20, 30, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(138, 180, 248, 0.2);
      border-radius: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.3s ease;
    }

    .processing-spinner {
      position: relative;
      width: 20px;
      height: 20px;
    }

    .processing-spinner::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #8ab4f8;
      border-right-color: #8ab4f8;
      animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  render() {
    if (this.isProcessing) {
      return html`
        <div class="processing-container">
          <div class="processing-spinner"></div>
          <div class="processing-text">
            ${this.status}...
          </div>
        </div>
      `;
    }

    return html`
      <div>
        <div class="status-text">${this.status}</div>
        ${this.error ? html`<div class="error-text">${this.error}</div>` : ''}
      </div>
    `;
  }
}
