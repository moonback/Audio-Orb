import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('mini-waveform')
export class MiniWaveform extends LitElement {
  @property({attribute: false}) inputNode: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private buffer: Uint8Array = new Uint8Array(512);

  static styles = css`
    :host {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 12;
    }

    canvas {
      width: 240px;
      height: 80px;
      border-radius: 16px;
      background: var(--glass-bg, rgba(15, 15, 25, 0.8));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35);
    }
  `;

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.raf);
    this.teardownAnalyser();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('inputNode')) {
      this.setupAnalyser();
    }
  }

  private teardownAnalyser() {
    if (this.analyser && this.inputNode) {
      try {
        this.inputNode.disconnect(this.analyser);
      } catch {
        // ignore
      }
    }
    this.analyser = null;
  }

  private setupAnalyser() {
    cancelAnimationFrame(this.raf);
    this.teardownAnalyser();
    if (!this.inputNode) return;
    const analyser = this.inputNode.context.createAnalyser();
    analyser.fftSize = 1024;
    this.buffer = new Uint8Array(analyser.fftSize);
    this.inputNode.connect(analyser);
    this.analyser = analyser;
    this.draw();
  }

  private draw = () => {
    if (!this.analyser) return;
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.analyser.getByteTimeDomainData(this.buffer);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = canvas.width / this.buffer.length;
    let x = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = this.buffer[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    this.raf = requestAnimationFrame(this.draw);
  };

  render() {
    return html`<canvas width="480" height="160" aria-hidden="true"></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mini-waveform': MiniWaveform;
  }
}


