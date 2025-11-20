import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('metrics-panel')
export class MetricsPanel extends LitElement {
  @property({type: Number}) avgLatency = 0;
  @property({type: Number}) errorRate = 0;
  @property({type: Number}) uptimeSeconds = 0;
  @property({type: Boolean}) fallback = false;

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 14;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .panel {
      display: flex;
      gap: 12px;
      background: var(--glass-bg, rgba(15, 15, 30, 0.7));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 18px;
      padding: 10px 20px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
    }

    .metric {
      display: flex;
      flex-direction: column;
      min-width: 110px;
    }

    .label {
      font-size: 0.7rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.6));
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-main, #e8eaed);
    }

    .value.warning {
      color: #fbbf24;
    }

    .value.danger {
      color: #f87171;
    }
  `;

  private get uptimeLabel() {
    const minutes = Math.floor(this.uptimeSeconds / 60);
    const seconds = this.uptimeSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  render() {
    return html`
      <div class="panel" aria-label="Métriques temps réel">
        <div class="metric">
          <span class="label">Latence moyenne</span>
          <span class="value ${this.avgLatency > 600 ? 'danger' : this.avgLatency > 350 ? 'warning' : ''}">
            ${this.avgLatency} ms
          </span>
        </div>
        <div class="metric">
          <span class="label">Taux d'erreur</span>
          <span class="value ${this.errorRate > 10 ? 'danger' : this.errorRate > 5 ? 'warning' : ''}">
            ${this.errorRate} %
          </span>
        </div>
        <div class="metric">
          <span class="label">${this.fallback ? 'Mode' : 'Uptime'}</span>
          <span class="value ${this.fallback ? 'warning' : ''}">
            ${this.fallback ? 'Fallback actif' : this.uptimeLabel}
          </span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'metrics-panel': MetricsPanel;
  }
}


