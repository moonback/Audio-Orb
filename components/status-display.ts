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
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-align: center;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 16px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
      transition: all 0.3s ease;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top-color: var(--primary-color, #a8a8ff);
      animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .processing-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: var(--glass-bg, rgba(20, 20, 30, 0.8));
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .processing-spinner {
      position: relative;
      width: 24px;
      height: 24px;
    }

    .processing-spinner::before,
    .processing-spinner::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      border: 2px solid transparent;
    }

    .processing-spinner::before {
      width: 24px;
      height: 24px;
      border-top-color: var(--primary-color, #a8a8ff);
      border-right-color: var(--primary-color, #a8a8ff);
      animation: spin-processing 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .processing-spinner::after {
      width: 16px;
      height: 16px;
      top: 4px;
      left: 4px;
      border-bottom-color: rgba(168, 168, 255, 0.6);
      border-left-color: rgba(168, 168, 255, 0.6);
      animation: spin-processing-reverse 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .processing-text {
      color: var(--text-main, rgba(255, 255, 255, 0.9));
      font-weight: 500;
      position: relative;
    }

    .processing-dots {
      display: inline-block;
      width: 20px;
      text-align: left;
    }

    .processing-dots::after {
      content: '...';
      animation: dots 1.5s steps(4, end) infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes spin-processing {
      to { transform: rotate(360deg); }
    }

    @keyframes spin-processing-reverse {
      to { transform: rotate(-360deg); }
    }

    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
  `;

  render() {
    if (this.isProcessing) {
      return html`
        <div class="processing-container">
          <div class="processing-spinner"></div>
          <div class="processing-text">
            ${this.status}
            <span class="processing-dots"></span>
          </div>
        </div>
      `;
    }

    return html`
      ${this.status} ${this.error ? `| ${this.error}` : ''} 
    `;
  }
}

