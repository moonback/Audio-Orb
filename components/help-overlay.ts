import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface HelpSection {
  title: string;
  description: string;
  tips: string[];
}

@customElement('help-overlay')
export class HelpOverlay extends LitElement {
  @property({type: Boolean}) open = false;
  @property({type: Array}) sections: HelpSection[] = [];

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      display: none;
      z-index: 200;
    }

    :host([data-open="true"]) {
      display: block;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(5, 8, 15, 0.7);
      backdrop-filter: blur(6px);
    }

    .panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(90vw, 720px);
      max-height: 80vh;
      overflow-y: auto;
      background: var(--glass-bg, rgba(10, 10, 20, 0.95));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
      border-radius: 24px;
      padding: 32px;
      color: var(--text-main, #e8eaed);
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.45);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    header h2 {
      margin: 0;
      font-size: 1.5rem;
      letter-spacing: -0.02em;
    }

    button {
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: inherit;
      padding: 6px 10px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
    }

    .card h3 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text-dim, rgba(255, 255, 255, 0.7));
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `;

  updated() {
    if (this.open) {
      this.setAttribute('data-open', 'true');
    } else {
      this.removeAttribute('data-open');
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    if (!this.open) return html``;
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <div class="panel" role="dialog" aria-modal="true" aria-label="Aide contextuelle">
        <header>
          <h2>Centre d’aide rapide</h2>
          <button @click=${this.close}>Fermer</button>
        </header>
        <div class="grid">
          ${this.sections.map(section => html`
            <div class="card">
              <h3>${section.title}</h3>
              <p>${section.description}</p>
              <ul>
                ${section.tips.map(tip => html`<li>${tip}</li>`)}
              </ul>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'help-overlay': HelpOverlay;
  }
}


