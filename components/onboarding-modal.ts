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
    }

    :host([data-open="true"]) {
      display: block;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(8, 12, 20, 0.8);
      backdrop-filter: blur(8px);
    }

    .modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(90vw, 600px);
      background: var(--glass-bg, rgba(10, 10, 25, 0.95));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
      border-radius: 28px;
      padding: 32px;
      color: var(--text-main, #e8eaed);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
    }

    h2 {
      margin: 0 0 12px 0;
      font-size: 1.8rem;
    }

    p {
      margin: 0 0 24px 0;
      color: var(--text-dim, rgba(255, 255, 255, 0.7));
      line-height: 1.6;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 0.95rem;
      cursor: pointer;
      font-weight: 600;
    }

    .ghost {
      background: transparent;
      color: var(--text-dim, rgba(255, 255, 255, 0.7));
    }

    .primary {
      background: linear-gradient(120deg, #60a5fa, #818cf8);
      color: #0f172a;
    }

    .dots {
      display: flex;
      gap: 6px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
    }

    .dot.active {
      background: #fff;
      width: 20px;
      border-radius: 999px;
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


