import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface OnboardingStep {
  title: string;
  description: string;
  accent?: string;
}

@customElement('onboarding-modal')
export class OnboardingModal extends LitElement {
  @property({type: Boolean}) open = false;
  @property({type: Number}) step = 0;
  @property({type: Array}) steps: OnboardingStep[] = [];

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      display: none;
      z-index: 250;
      font-family: 'Exo 2', 'Google Sans', sans-serif;
    }

    :host([data-open="true"]) {
      display: block;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(5, 5, 10, 0.9);
      backdrop-filter: blur(12px);
    }

    .modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(85vw, 550px);
      background: rgba(10, 15, 25, 0.85);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 24px;
      padding: 40px;
      color: #e0f7fa;
      box-shadow: 0 0 60px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.1);
      text-align: center;
    }

    h2 {
      margin: 0 0 16px 0;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #00f0ff;
      text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
    }

    p {
      margin: 0 0 32px 0;
      color: #b3e5fc;
      line-height: 1.6;
      font-size: 1rem;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }

    button {
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 0.95rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      font-family: 'Exo 2', sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .ghost {
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      border: 1px solid transparent;
    }
    
    .ghost:hover {
      color: white;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .primary {
      background: rgba(0, 240, 255, 0.15);
      color: #00f0ff;
      border: 1px solid #00f0ff;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
    }
    
    .primary:hover {
      background: #00f0ff;
      color: #000;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.5);
      transform: translateY(-2px);
    }

    .dots {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      transition: all 0.3s;
    }

    .dot.active {
      background: #00f0ff;
      width: 24px;
      border-radius: 4px;
      box-shadow: 0 0 10px #00f0ff;
    }
  `;

  updated() {
    if (this.open) {
      this.setAttribute('data-open', 'true');
    } else {
      this.removeAttribute('data-open');
    }
  }

  private next() {
    if (this.step < this.steps.length - 1) {
      this.step += 1;
    } else {
      this.dispatchEvent(new CustomEvent('complete'));
    }
  }

  private skip() {
    this.dispatchEvent(new CustomEvent('skip'));
  }

  render() {
    if (!this.open || !this.steps.length) return html``;
    const current = this.steps[this.step];
    return html`
      <div class="backdrop"></div>
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${current.title}</h2>
        <p>${current.description}</p>
        <div class="actions">
          <button class="ghost" @click=${this.skip}>Passer</button>
          <div class="dots" aria-hidden="true">
            ${this.steps.map((_, index) => html`
              <div class="dot ${index === this.step ? 'active' : ''}"></div>
            `)}
          </div>
          <button class="primary" @click=${this.next}>
            ${this.step < this.steps.length - 1 ? 'Suivant' : 'Commencer'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'onboarding-modal': OnboardingModal;
  }
}


