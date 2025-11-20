import { GoogleGenAI, Session, LiveServerMessage, Modality } from '@google/genai';

export class GeminiClient extends EventTarget {
  private client: GoogleGenAI;
  private session: Session | null = null;
  public isConnected = false;

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenAI({ apiKey });
  }

  async connect(model: string, config: any) {
    try {
      console.log('[GeminiClient] Connecting to model:', model);
      this.session = await this.client.live.connect({
        model,
        config,
        callbacks: {
          onopen: () => {
            console.log('[GeminiClient] Session opened');
            this.isConnected = true;
            this.dispatchEvent(new CustomEvent('status', { detail: 'Connecté' }));
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: (e) => {
            console.log('[GeminiClient] Session closed', e);
            this.isConnected = false;
            this.dispatchEvent(new CustomEvent('status', { detail: 'Déconnecté' }));
            this.dispatchEvent(new CustomEvent('disconnected'));
          },
          onerror: (err) => {
            console.error('[GeminiClient] Error:', err);
            this.dispatchEvent(new CustomEvent('error', { detail: err.message }));
          }
        }
      });
    } catch (e: any) {
      console.error('[GeminiClient] Connection failed:', e);
      this.dispatchEvent(new CustomEvent('error', { detail: e.message }));
      throw e;
    }
  }

  private handleMessage(msg: LiveServerMessage) {
    const serverContent = msg.serverContent;
    
    if (!serverContent) {
        // Handle tool calls or other message types if necessary
        return;
    }

    // Audio
    const audio = serverContent.modelTurn?.parts?.[0]?.inlineData;
    if (audio) {
      this.dispatchEvent(new CustomEvent('audio-response', { detail: audio }));
    }
    
    // Transcription (User)
    const inputTrans = serverContent.inputTranscription?.text;
    if (inputTrans) {
        this.dispatchEvent(new CustomEvent('transcript', { detail: { text: inputTrans, source: 'User' } }));
    }

    // Transcription (AI)
    const outputTrans = serverContent.outputTranscription?.text;
    if (outputTrans) {
        this.dispatchEvent(new CustomEvent('transcript', { detail: { text: outputTrans, source: 'AI' } }));
    }
    
    // Interruption
    if (serverContent.interrupted) {
      this.dispatchEvent(new CustomEvent('interrupted'));
    }
    
    // Turn Complete
    if (serverContent.turnComplete) {
        this.dispatchEvent(new CustomEvent('turn-complete'));
    }
  }

  async sendAudio(base64Data: string) {
    if (!this.isConnected || !this.session) return;
    try {
        await this.session.sendRealtimeInput({
            media: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
            }
        });
    } catch (e) {
        console.error("Error sending audio:", e);
    }
  }

  disconnect() {
    if (this.session) {
        // Note: The close method might not be strictly typed in the current SDK version, casting to any
        try {
            (this.session as any).close(); 
        } catch (e) {
            console.warn("Error closing session:", e);
        }
        this.session = null;
    }
    this.isConnected = false;
  }
}

