import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('avatar-button')
export class AvatarButton extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      bottom: 40px;
      right: 40px;
      z-index: 20;
      pointer-events: auto;
    }

    button {
      background: rgba(138, 180, 248, 0.2);
      border: 1px solid rgba(138, 180, 248, 0.4);
      color: white;
      padding: 14px 24px;
      border-radius: 24px;
      cursor: pointer;
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      backdrop-filter: blur(16px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      outline: none;
    }

    button:hover {
      background: rgba(138, 180, 248, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(138, 180, 248, 0.3);
      border-color: rgba(138, 180, 248, 0.6);
    }

    button:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .icon {
      font-size: 1.2rem;
      line-height: 1;
    }
  `;

  private _handleClick() {
    this.dispatchEvent(new CustomEvent('avatar-customize', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <button @click=${this._handleClick}>
        <span class="icon">🎨</span>
        <span>Personnaliser Avatar</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avatar-button': AvatarButton;
  }
}

