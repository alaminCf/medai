import OpenAI, { toFile } from 'openai';

export interface TranscribeOptions {
  language?: string; // 'en' | 'bn'
  prompt?: string;
}

export interface ISpeechRecognitionProvider {
  transcribe(audioBuffer: Buffer, mimetype: string, options?: TranscribeOptions): Promise<string>;
}

export class OpenAIWhisperProvider implements ISpeechRecognitionProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioBuffer: Buffer, mimetype: string, options?: TranscribeOptions): Promise<string> {
    const ext = mimetype.includes('webm') ? 'webm' : mimetype.includes('ogg') ? 'ogg' : mimetype.includes('wav') ? 'wav' : 'mp3';
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimetype });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options?.language === 'bn' ? 'bn' : 'en',
      prompt: options?.prompt,
    });

    return response.text.trim();
  }
}

export class MockSpeechRecognitionProvider implements ISpeechRecognitionProvider {
  async transcribe(_audioBuffer: Buffer, _mimetype: string, options?: TranscribeOptions): Promise<string> {
    if (options?.language === 'bn') {
      return 'আপনার সমস্যাটা কখন থেকে শুরু হয়েছে?';
    }
    return 'When did your symptoms start, and how severe is the pain?';
  }
}

export class SpeechRecognitionService {
  private provider: ISpeechRecognitionProvider;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-');

    if (isKeyConfigured) {
      this.provider = new OpenAIWhisperProvider(apiKey);
    } else {
      this.provider = new MockSpeechRecognitionProvider();
    }
  }

  async transcribeAudio(audioBuffer: Buffer, mimetype: string, options?: TranscribeOptions): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-');

    if (isKeyConfigured && !(this.provider instanceof OpenAIWhisperProvider)) {
      this.provider = new OpenAIWhisperProvider(apiKey);
    }

    try {
      return await this.provider.transcribe(audioBuffer, mimetype, options);
    } catch (err) {
      console.warn('[SpeechRecognitionService] Provider transcription failed, falling back to mock provider:', err);
      const mock = new MockSpeechRecognitionProvider();
      return await mock.transcribe(audioBuffer, mimetype, options);
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
