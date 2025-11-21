import {LitElement, html, css} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

@customElement('chat-interface')
export class ChatInterface extends LitElement {
  @property({type: Array}) transcript: string[] = [];
  @property({type: Object}) messageMetadata: Map<number, any> = new Map();

  @query('.chat-container') private chatContainer?: HTMLElement;

  static styles = css`
    :host {
      display: block;
      flex: 1;
      overflow: hidden;
      position: relative;
      z-index: 10;
      pointer-events: auto;
    }

    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px 15px 130px 15px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      height: 100%;
      mask-image: linear-gradient(to bottom, transparent, black 3%, black 96%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 3%, black 96%, transparent);
      transition: opacity 0.3s ease;
    }

    .chat-bubble {
      padding: 14px 20px;
      border-radius: 16px;
      max-width: 80%;
      line-height: 1.55;
      font-size: 0.95rem;
      animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      position: relative;
      border: 1px solid transparent;
      transition: all 0.3s ease;
    }

    .chat-bubble::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, var(--glass-border, rgba(0, 240, 255, 0.15)), transparent);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .chat-bubble:hover::before {
      opacity: 1;
    }

    .chat-bubble.user {
      align-self: flex-end;
      background: var(--chat-user-bg, linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 200, 255, 0.1)));
      color: var(--chat-user-text, #ffffff);
      border-bottom-right-radius: 4px;
      border-color: rgba(0, 255, 255, 0.2);
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(0, 255, 255, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .chat-bubble.user:hover {
      border-color: rgba(0, 255, 255, 0.4);
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(0, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .chat-bubble.ai {
      align-self: flex-start;
      background: var(--chat-ai-bg, linear-gradient(135deg, rgba(255, 0, 255, 0.08), rgba(188, 19, 254, 0.05)));
      border: 1px solid rgba(255, 0, 255, 0.15);
      color: var(--chat-ai-text, #e8f4ff);
      border-bottom-left-radius: 4px;
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(255, 0, 255, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .chat-bubble.ai:hover {
      border-color: rgba(255, 0, 255, 0.3);
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(255, 0, 255, 0.12);
      transform: translateY(-1px);
    }

    .chat-bubble .message-text {
      word-wrap: break-word;
    }

    .search-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      color: var(--accent-color, #00ff88);
      opacity: 0.7;
      animation: pulse 2s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    .citations-container {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.85rem;
    }

    .citations-label {
      color: var(--text-dim, #a0d7ff);
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .citations-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .citation-link {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      background: rgba(0, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 12px;
      color: var(--primary-color, #00ffff);
      text-decoration: none;
      transition: all 0.2s ease;
      font-size: 0.8rem;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .citation-link:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: rgba(0, 255, 255, 0.4);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 255, 255, 0.3);
    }

    .citation-link:active {
      transform: translateY(0);
    }

    @keyframes popIn {
      0% { 
        opacity: 0;
        transform: translateY(15px) scale(0.96);
        filter: blur(4px);
      }
      100% { 
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    /* Custom Scrollbar */
    .chat-container::-webkit-scrollbar { 
      width: 4px; 
    }
    .chat-container::-webkit-scrollbar-track { 
      background: transparent; 
    }
    .chat-container::-webkit-scrollbar-thumb { 
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.3)); 
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
    }
    .chat-container::-webkit-scrollbar-thumb:hover { 
      background: linear-gradient(180deg, rgba(0, 255, 255, 0.5), rgba(255, 0, 255, 0.5));
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
    }

    @media (max-width: 768px) {
      .chat-container {
        padding: 8px 12px 140px 12px;
        gap: 10px;
        mask-image: linear-gradient(to bottom, transparent, black 2%, black 92%, transparent);
      }
      
      .chat-bubble {
        padding: 12px 16px;
        font-size: 0.9rem;
        max-width: 92%;
        border-radius: 14px;
      }

      .citations-container {
        margin-top: 10px;
        padding-top: 10px;
        font-size: 0.8rem;
      }

      .citations-list {
        gap: 6px;
      }

      .citation-link {
        padding: 3px 8px;
        font-size: 0.75rem;
      }

      .search-indicator {
        top: 6px;
        right: 6px;
        width: 12px;
        height: 12px;
      }
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('transcript')) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      // Use requestAnimationFrame to ensure rendering is done
      requestAnimationFrame(() => {
        if (this.chatContainer) {
          this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }
      });
    }
  }

  render() {
    return html`
      <div class="chat-container">
        ${this.transcript.map((msg, index) => {
          const isUser = msg.startsWith('User: ');
          const text = msg.replace(/^(User: |AI: )/, '');
          const metadata = this.messageMetadata.get(index);
          const hasCitations = metadata?.citations && metadata.citations.length > 0;
          const hasSearch = metadata?.hasSearch;
          
          return html`
            <div class="chat-bubble ${isUser ? 'user' : 'ai'}">
              ${hasSearch ? html`
                <div class="search-indicator" title="Recherche Google effectuée">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
              ` : ''}
              <div class="message-text">${text}</div>
              ${hasCitations ? html`
                <div class="citations-container">
                  <div class="citations-label">Sources:</div>
                  <div class="citations-list">
                    ${metadata!.citations!.map((citation: any) => {
                      let displayTitle = citation.title || 'Source';
                      try {
                        if (!citation.title) {
                          const url = new URL(citation.uri);
                          displayTitle = url.hostname.replace(/^www\./, '');
                        }
                      } catch (e) {
                        displayTitle = 'Source';
                      }
                      return html`
                        <a 
                          href="${citation.uri}" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="citation-link"
                          title="${citation.uri}"
                        >
                          ${displayTitle}
                        </a>
                      `;
                    })}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }
}

