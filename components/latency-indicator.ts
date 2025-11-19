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
    }

    .container {
      background: var(--glass-bg, rgba(20, 20, 30, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 200px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .label {
      font-size: 0.75rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .value {
      font-size: 0.85rem;
      color: var(--text-main, rgba(255, 255, 255, 0.9));
      font-weight: 500;
    }

    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, 
        var(--primary-color, #a8a8ff) 0%, 
        #6b6bff 50%, 
        #4a4aff 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 255, 255, 0.3) 50%, 
        transparent 100%);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-color, #a8a8ff);
      animation: pulse 2s infinite;
    }

    .status-indicator.excellent {
      background: #4ade80;
    }

    .status-indicator.good {
      background: #a8a8ff;
    }

    .status-indicator.fair {
      background: #fbbf24;
    }

    .status-indicator.poor {
      background: #f87171;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .hidden {
      display: none;
    }
  `;

  private getLatencyPercentage(): number {
    // Latence optimale: 0-200ms = 0-50%
    // Latence acceptable: 200-500ms = 50-75%
    // Latence élevée: 500-1000ms = 75-95%
    // Latence très élevée: >1000ms = 95-100%
    if (this.latency <= 200) return (this.latency / 200) * 50;
    if (this.latency <= 500) return 50 + ((this.latency - 200) / 300) * 25;
    if (this.latency <= 1000) return 75 + ((this.latency - 500) / 500) * 20;
    return Math.min(95 + ((this.latency - 1000) / 1000) * 5, 100);
  }

  private getStatusClass(): string {
    if (this.latency <= 200) return 'excellent';
    if (this.latency <= 500) return 'good';
    if (this.latency <= 1000) return 'fair';
    return 'poor';
  }

  private formatLatency(): string {
    if (this.latency < 1000) {
      return `${Math.round(this.latency)}ms`;
    }
    return `${(this.latency / 1000).toFixed(1)}s`;
  }

  render() {
    if (!this.isActive) {
      return html``;
    }

    const percentage = this.getLatencyPercentage();
    const statusClass = this.getStatusClass();

    return html`
      <div class="container">
        <div class="label">
          <span>Latence</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="status-indicator ${statusClass}"></span>
            <span class="value">${this.formatLatency()}</span>
          </div>
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

