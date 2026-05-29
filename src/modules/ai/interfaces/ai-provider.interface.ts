export interface AiProviderGenerateOptions {
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: Record<string, unknown>;
}

export interface AiProvider {
  generateContent(
    prompt: string,
    options?: AiProviderGenerateOptions,
  ): Promise<string>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
