import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('quota-indicator')
export class QuotaIndicator extends LitElement {
  @property({type: Number}) limit = 100;
  @property({type: Number}) used = 0;
  @property({type: Number}) resetTimestamp = 0;
  @property({type: Boolean}) degraded = false;

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      right: 220px;
      z-index: 15;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .card {
      background: var(--glass-bg, rgba(15, 15, 30, 0.8));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.15));
      border-radius: 16px;
      padding: 12px 16px;
      min-width: 180px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(16px);
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .card.degraded {
      border-color: rgba(255, 138, 128, 0.6);
      box-shadow: 0 10px 25px rgba(255, 87, 34, 0.25);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 0.8rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.6));
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .value {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-main, #e8eaed);
    }

    .progress {
      height: 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
      position: relative;
    }

    .progress > div {
      height: 100%;
      border-radius: inherit;
      transition: width 0.3s ease;
      background: linear-gradient(90deg, #7dd3fc, #60a5fa, #818cf8);
    }

    .card.degraded .progress > div {
      background: linear-gradient(90deg, #f97316, #ef4444);
    }

    .hint {
      margin-top: 8px;
      font-size: 0.75rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.6));
    }
  `;

  private get percentage() {
    if (this.limit === 0) return 0;
    return Math.min(100, Math.round((this.used / this.limit) * 100));
  }

  private formatReset() {
    if (!this.resetTimestamp) return 'Quota courant';
    const date = new Date(this.resetTimestamp);
    return `Reset ${date.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
  }

  render() {
    return html`
      <div class="card ${this.degraded ? 'degraded' : ''}" aria-live="polite" aria-label="Quota Gemini restant">
        <header>
          <span>Quota</span>
          <span>${this.percentage}%</span>
        </header>
        <div class="value">${this.used}/${this.limit}</div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${this.limit}" aria-valuenow="${this.used}">
          <div style="width: ${this.percentage}%;"></div>
        </div>
        <div class="hint">${this.formatReset()}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'quota-indicator': QuotaIndicator;
  }
}


