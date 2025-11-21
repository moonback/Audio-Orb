import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import './vu-meter';
import './status-display';
import './metrics-panel';
import './latency-indicator';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({type: Boolean}) showVUMeter = false;
  @property({type: Number}) inputLevel = 0;
  @property({type: Number}) outputLevel = 0;
  @property({type: Boolean}) isRecording = false;
  @property({type: String}) status = 'Prêt';
  @property({type: String}) error = '';
  @property({type: Boolean}) isProcessing = false;
  @property({type: String}) fallbackMessage = '';
  @property({type: Number}) nextRetrySeconds = 0;
  
  // Metrics
  @property({type: Number}) avgLatency = 0;
  @property({type: Number}) errorRate = 0;
  @property({type: Number}) uptimeSeconds = 0;
  @property({type: Boolean}) fallbackActive = false;
  
  @property({type: Number}) latency = 0;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px;
      z-index: 20;
      pointer-events: none;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .app-header > * {
      pointer-events: auto;
    }
    
    .header-left, .header-right {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .header-center {
      position: absolute;
      left: 50%;
      top: 16px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    /* Mobile Adaptations - Ultra Compact */
    @media (max-width: 768px) {
      :host {
        padding: 10px;
      }
      
      .header-left {
        align-items: flex-start;
        gap: 4px;
      }
      
      .header-right {
        align-items: flex-end;
        gap: 4px;
      }
      
      /* Adjust Status Display position on mobile */
      .header-center {
        top: 50px;
        width: 90%;
      }
    }
  `;

  private _onClearError() {
    this.dispatchEvent(new CustomEvent('clear-error', {bubbles: true, composed: true}));
  }

  render() {
    return html`
      <div class="app-header">
        <div class="header-left">
           ${this.showVUMeter ? html`
             <vu-meter
              .inputLevel=${this.inputLevel}
              .outputLevel=${this.outputLevel}
              .isActive=${this.isRecording || this.status === 'Parle...'}
             ></vu-meter>
           ` : ''}
        </div>
        
        <div class="header-center">
           <status-display
            .status=${this.status}
            .error=${this.error}
            .isProcessing=${this.isProcessing}
            .fallbackMessage=${this.fallbackMessage}
            .nextRetrySeconds=${this.nextRetrySeconds}
            @clear-error=${this._onClearError}
           ></status-display>
           
           <metrics-panel
            .avgLatency=${this.avgLatency}
            .errorRate=${this.errorRate}
            .uptimeSeconds=${this.uptimeSeconds}
            .fallback=${this.fallbackActive}
           ></metrics-panel>
        </div>

        <div class="header-right">
           <latency-indicator
            .latency=${this.latency}
            .isActive=${this.isRecording}
           ></latency-indicator>
        </div>
      </div>
    `;
  }
}

