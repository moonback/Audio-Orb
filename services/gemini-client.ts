import { GoogleGenAI, Session, LiveServerMessage, Modality } from '@google/genai';
import { logger } from './logger';

export class GeminiClient extends EventTarget {
  private client: GoogleGenAI;
  private session: Session | null = null;
  public isConnected = false;
  private lastUsageMetadata: Record<string, number> | null = null;

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenAI({ apiKey });
  }

  async connect(model: string, config: any) {
    try {
      logger.info('gemini_connecting', { model });
      this.session = await this.client.live.connect({
        model,
        config,
        callbacks: {
          onopen: () => {
            logger.info('gemini_session_opened', { model });
            this.isConnected = true;
            this.dispatchEvent(new CustomEvent('status', { detail: 'Connecté' }));
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: (e) => {
            logger.warn('gemini_session_closed', { reason: e?.reason, code: (e as any)?.code });
            this.isConnected = false;
            this.dispatchEvent(new CustomEvent('status', { detail: 'Déconnecté' }));
            this.dispatchEvent(new CustomEvent('disconnected'));
          },
          onerror: (err) => {
            const detail = (err as Error)?.message ?? 'Erreur inconnue';
            logger.error('gemini_stream_error', { detail });
            this.dispatchEvent(new CustomEvent('error', { detail }));
          }
        }
      });
    } catch (e: any) {
      logger.error('gemini_connection_failed', { detail: e?.message });
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

    // Metrics / quota
    const usage = (serverContent as any).usageMetadata;
    if (usage) {
      this.lastUsageMetadata = usage;
      this.dispatchEvent(new CustomEvent('quota', { detail: usage }));
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

  get rawClient() {
    return this.client;
  }

  get usageMetadata() {
    return this.lastUsageMetadata;
  }
}

