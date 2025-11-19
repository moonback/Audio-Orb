import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('vu-meter')
export class VuMeter extends LitElement {
  @property({type: Number}) inputLevel = 0; // 0-100
  @property({type: Number}) outputLevel = 0; // 0-100
  @property({type: Boolean}) isActive = false;

  static styles = css`
    :host {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 15;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .container {
      background: var(--glass-bg, rgba(20, 20, 30, 0.6));
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 180px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .label {
      font-size: 0.75rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      margin-bottom: 12px;
      text-align: center;
    }

    .meter-group {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .meter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .meter-label {
      font-size: 0.7rem;
      color: var(--text-dim, rgba(255, 255, 255, 0.5));
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meter-bar-container {
      width: 12px;
      height: 120px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .meter-bar {
      width: 100%;
      transition: height 0.1s linear;
      position: relative;
      overflow: hidden;
    }

    .meter-bar.input {
      background: linear-gradient(to top, 
        #4ade80 0%, 
        #22c55e 30%,
        #fbbf24 60%,
        #f87171 85%,
        #ef4444 100%);
    }

    .meter-bar.output {
      background: linear-gradient(to top, 
        #a8a8ff 0%, 
        #8b8bff 30%,
        #6b6bff 60%,
        #4a4aff 85%,
        #3b3bff 100%);
    }

    .meter-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to top, 
        transparent 0%, 
        rgba(255, 255, 255, 0.2) 50%, 
        transparent 100%);
      animation: shimmer-vertical 2s infinite;
    }

    @keyframes shimmer-vertical {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }

    .meter-segments {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      pointer-events: none;
    }

    .meter-segment {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .meter-segment:nth-child(1) { bottom: 0%; }    /* 0% */
    .meter-segment:nth-child(2) { bottom: 20%; }   /* 20% */
    .meter-segment:nth-child(3) { bottom: 40%; }   /* 40% */
    .meter-segment:nth-child(4) { bottom: 60%; }   /* 60% */
    .meter-segment:nth-child(5) { bottom: 80%; }   /* 80% */
    .meter-segment:nth-child(6) { bottom: 100%; }  /* 100% */

    .hidden {
      display: none;
    }
  `;

  render() {
    if (!this.isActive) {
      return html``;
    }

    return html`
      <div class="container">
        <div class="label">Niveau Audio</div>
        <div class="meter-group">
          <div class="meter">
            <div class="meter-label">Entrée</div>
            <div class="meter-bar-container">
              <div class="meter-segments">
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
              </div>
              <div 
                class="meter-bar input" 
                style="height: ${this.inputLevel}%">
              </div>
            </div>
          </div>
          <div class="meter">
            <div class="meter-label">Sortie</div>
            <div class="meter-bar-container">
              <div class="meter-segments">
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
                <div class="meter-segment"></div>
              </div>
              <div 
                class="meter-bar output" 
                style="height: ${this.outputLevel}%">
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

