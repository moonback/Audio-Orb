import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('latency-indicator')
export class LatencyIndicator extends LitElement {
  @property({type: Number}) latency = 0; // Latence en millisecondes
  @property({type: Boolean}) isActive = false;

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 15;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: 'Google Sans', Roboto, sans-serif;
      transition: opacity 0.3s ease;
    }

    .container {
      background: var(--glass-bg, rgba(20, 20, 30, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 180px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: border-color 0.3s ease;
    }

    .label {
      font-size: 0.75rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .value {
      font-size: 0.85rem;
      color: var(--text-main, rgba(255, 255, 255, 0.9));
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: var(--indicator-color, #a8a8ff);
      border-radius: 2px;
      transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 10px var(--indicator-color, #a8a8ff);
    }

    /* Status dot pulse animation */
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--indicator-color, #a8a8ff);
      box-shadow: 0 0 8px var(--indicator-color, #a8a8ff);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.7; }
      100% { transform: scale(0.95); opacity: 1; }
    }
  `;

  private getLatencyPercentage(): number {
    // Mapping non-linéaire pour une meilleure lisibilité
    // 0-200ms -> 0-40% (Zone verte)
    // 200-600ms -> 40-80% (Zone jaune)
    // 600ms+ -> 80-100% (Zone rouge)
    
    if (this.latency <= 200) {
      return (this.latency / 200) * 40;
    } else if (this.latency <= 600) {
      return 40 + ((this.latency - 200) / 400) * 40;
    } else {
      return Math.min(80 + ((this.latency - 600) / 400) * 20, 100);
    }
  }

  private getStatusColor(): string {
    // Seuils de couleur plus stricts
    if (this.latency <= 250) return '#4ade80'; // Vert (Excellent)
    if (this.latency <= 600) return '#fbbf24'; // Jaune (Attention)
    return '#f87171'; // Rouge (Mauvais)
  }

  private formatLatency(): string {
    if (this.latency < 1000) {
      return `${Math.round(this.latency)}ms`;
    }
    return `${(this.latency / 1000).toFixed(2)}s`;
  }

  render() {
    if (!this.isActive && this.latency === 0) {
      return html``;
    }

    const percentage = Math.max(5, this.getLatencyPercentage()); // Min 5% visibility
    const color = this.getStatusColor();

    return html`
      <div class="container" style="--indicator-color: ${color}">
        <div class="label">
          <div style="display: flex; align-items: center; gap: 8px;">
             <div class="status-indicator"></div>
             <span>Latence</span>
          </div>
          <span class="value">${this.formatLatency()}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'latency-indicator': LatencyIndicator;
  }
}
