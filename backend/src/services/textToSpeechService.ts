import OpenAI from 'openai';

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  language?: string; // 'en' | 'bn'
}

export interface ITextToSpeechProvider {
  synthesize(text: string, options?: TTSOptions): Promise<{ audioBuffer: Buffer; contentType: string }>;
}

export class OpenAITTSProvider implements ITextToSpeechProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(text: string, options?: TTSOptions): Promise<{ audioBuffer: Buffer; contentType: string }> {
    const voice = options?.voice || 'alloy';
    const speed = options?.speed || 1.0;

    const mp3 = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      speed: Math.max(0.25, Math.min(4.0, speed)),
    });

    const arrayBuffer = await mp3.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
    };
  }
}

export class TextToSpeechService {
  private provider: ITextToSpeechProvider | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-');

    if (isKeyConfigured) {
      this.provider = new OpenAITTSProvider(apiKey);
    }
  }

  isAvailable(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!(apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-'));
  }

  async synthesizeSpeech(text: string, options?: TTSOptions): Promise<{ audioBuffer: Buffer; contentType: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-');

    if (!isKeyConfigured) {
      return null;
    }

    if (!this.provider) {
      this.provider = new OpenAITTSProvider(apiKey);
    }

    try {
      return await this.provider.synthesize(text, options);
    } catch (err) {
      console.warn('[TextToSpeechService] OpenAI TTS failed:', err);
      return null;
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;
