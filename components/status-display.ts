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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  render() {
    return html`
      ${this.isProcessing ? html`<span class="spinner"></span>` : ''}
      ${this.status} ${this.error ? `| ${this.error}` : ''} 
    `;
  }
}

