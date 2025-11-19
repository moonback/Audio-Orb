import {LitElement, css, html, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('vu-meter')
export class VuMeter extends LitElement {
  @property({type: Number}) inputLevel = 0; // 0-100
  @property({type: Number}) outputLevel = 0; // 0-100
  @property({type: Boolean}) isActive = false;

  // Peak hold tracking
  @state() private inputPeak = 0;
  @state() private outputPeak = 0;
  private peakDecayInterval: any = null;

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('inputLevel') || changedProperties.has('outputLevel')) {
      // Update peak hold
      if (this.inputLevel > this.inputPeak) {
        this.inputPeak = this.inputLevel;
      }
      if (this.outputLevel > this.outputPeak) {
        this.outputPeak = this.outputLevel;
      }
      
      // Start peak decay if not already running
      if (!this.peakDecayInterval) {
        this.peakDecayInterval = setInterval(() => {
          this.inputPeak = Math.max(0, this.inputPeak - 0.5);
          this.outputPeak = Math.max(0, this.outputPeak - 0.5);
          if (this.inputPeak === 0 && this.outputPeak === 0) {
            clearInterval(this.peakDecayInterval);
            this.peakDecayInterval = null;
          }
        }, 50);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.peakDecayInterval) {
      clearInterval(this.peakDecayInterval);
    }
  }

  // Convert linear 0-100 to dB scale (approximate)
  private toDecibels(linear: number): number {
    if (linear === 0) return -Infinity;
    // Approximate: -60dB at 0%, 0dB at 100%
    return (linear / 100) * 60 - 60;
  }

  // Get color zone based on level
  private getZoneColor(level: number): string {
    if (level < 40) return '#4ade80'; // Green (Safe)
    if (level < 60) return '#22c55e'; // Light Green
    if (level < 75) return '#fbbf24'; // Yellow (Warning)
    if (level < 90) return '#f97316'; // Orange (Caution)
    return '#ef4444'; // Red (Danger/Clip)
  }

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 15;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .container {
      background: var(--glass-bg, rgba(20, 20, 30, 0.8));
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.15));
      border-radius: 16px;
      padding: 16px 20px;
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .label {
      font-size: 0.8rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.6));
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .meter-group {
      display: flex;
      gap: 20px;
      justify-content: center;
    }

    .meter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .meter-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .meter-label {
      font-size: 0.7rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .meter-value {
      font-size: 0.85rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-main, rgba(255, 255, 255, 0.9));
      min-width: 45px;
      text-align: center;
    }

    .meter-bar-container {
      width: 16px;
      height: 160px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
      box-shadow: 
        inset 0 2px 8px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    .meter-bar {
      width: 100%;
      transition: height 0.05s linear;
      position: relative;
      overflow: hidden;
      border-radius: 0 0 8px 8px;
    }

    .meter-bar.input {
      background: linear-gradient(to top, 
        #4ade80 0%, 
        #4ade80 25%,
        #22c55e 40%,
        #fbbf24 60%,
        #f97316 75%,
        #ef4444 90%,
        #dc2626 100%);
      box-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
    }

    .meter-bar.output {
      background: linear-gradient(to top, 
        #8b5cf6 0%, 
        #7c3aed 25%,
        #6366f1 40%,
        #3b82f6 60%,
        #0ea5e9 75%,
        #06b6d4 90%,
        #14b8a6 100%);
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
    }

    /* Peak indicator */
    .peak-indicator {
      position: absolute;
      left: 0;
      right: 0;
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
      z-index: 10;
      transition: bottom 0.1s linear;
    }

    /* Segment markers */
    .meter-segments {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column-reverse;
    }

    .meter-segment {
      position: relative;
      flex: 1;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
    }

    .meter-segment.major {
      border-top-width: 2px;
      border-top-color: rgba(255, 255, 255, 0.3);
    }

    /* Zone indicators (colored sections) */
    .zone-indicators {
      position: absolute;
      left: -4px;
      top: 0;
      bottom: 0;
      width: 3px;
      pointer-events: none;
    }

    .zone {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      opacity: 0.6;
    }

    .zone.safe { background: #4ade80; }
    .zone.warning { background: #fbbf24; }
    .zone.caution { background: #f97316; }
    .zone.danger { background: #ef4444; }

    .hidden {
      display: none;
    }
  `;

  render() {
    if (!this.isActive) {
      return html``;
    }

    const inputDb = this.toDecibels(this.inputLevel);
    const outputDb = this.toDecibels(this.outputLevel);
    const inputDbText = isFinite(inputDb) ? `${inputDb.toFixed(1)} dB` : '-∞ dB';
    const outputDbText = isFinite(outputDb) ? `${outputDb.toFixed(1)} dB` : '-∞ dB';

    return html`
      <div class="container">
        <div class="header">
          <div class="label">VU Meter</div>
        </div>
        <div class="meter-group">
          <!-- Input Meter -->
          <div class="meter">
            <div class="meter-header">
              <div class="meter-label">Entrée</div>
              <div class="meter-value">${inputDbText}</div>
            </div>
            <div class="meter-bar-container">
              <!-- Zone indicators -->
              <div class="zone-indicators">
                <div class="zone safe" style="bottom: 0%; height: 40%;"></div>
                <div class="zone warning" style="bottom: 40%; height: 20%;"></div>
                <div class="zone caution" style="bottom: 60%; height: 15%;"></div>
                <div class="zone danger" style="bottom: 75%; height: 25%;"></div>
              </div>
              
              <!-- Segment markers -->
              <div class="meter-segments">
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
              </div>
              
              <!-- Peak indicator -->
              ${this.inputPeak > 0 ? html`
                <div 
                  class="peak-indicator" 
                  style="bottom: ${this.inputPeak}%;">
                </div>
              ` : ''}
              
              <!-- Level bar -->
              <div 
                class="meter-bar input" 
                style="height: ${this.inputLevel}%; background: linear-gradient(to top, ${this.getZoneColor(this.inputLevel)} 0%, ${this.getZoneColor(this.inputLevel * 0.7)} 100%);">
              </div>
            </div>
          </div>

          <!-- Output Meter -->
          <div class="meter">
            <div class="meter-header">
              <div class="meter-label">Sortie</div>
              <div class="meter-value">${outputDbText}</div>
            </div>
            <div class="meter-bar-container">
              <!-- Zone indicators -->
              <div class="zone-indicators">
                <div class="zone safe" style="bottom: 0%; height: 40%;"></div>
                <div class="zone warning" style="bottom: 40%; height: 20%;"></div>
                <div class="zone caution" style="bottom: 60%; height: 15%;"></div>
                <div class="zone danger" style="bottom: 75%; height: 25%;"></div>
              </div>
              
              <!-- Segment markers -->
              <div class="meter-segments">
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment major"></div>
              </div>
              
              <!-- Peak indicator -->
              ${this.outputPeak > 0 ? html`
                <div 
                  class="peak-indicator" 
                  style="bottom: ${this.outputPeak}%;">
                </div>
              ` : ''}
              
              <!-- Level bar -->
              <div 
                class="meter-bar output" 
                style="height: ${this.outputLevel}%; background: linear-gradient(to top, ${this.getZoneColor(this.outputLevel)} 0%, ${this.getZoneColor(this.outputLevel * 0.7)} 100%);">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vu-meter': VuMeter;
  }
}
