import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import type { AiProvider } from './interfaces/ai-provider.interface';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AiProvider,
  ) {}

  async generateContent(prompt: string): Promise<string> {
    const sanitizedPrompt = this.sanitizePrompt(prompt);

    return this.aiProvider.generateContent(sanitizedPrompt);
  }

  async generateStructuredContent<T = Record<string, unknown>>(
    prompt: string,
    responseSchema?: Record<string, unknown>,
  ): Promise<T> {
    const sanitizedPrompt = this.sanitizePrompt(prompt);
    const response = await this.aiProvider.generateContent(sanitizedPrompt, {
      responseMimeType: 'application/json',
      responseSchema,
    });

    return this.parseJsonResponse<T>(response);
  }

  private sanitizePrompt(prompt: string): string {
    const sanitizedPrompt = prompt?.trim();

    if (!sanitizedPrompt) {
      throw new BadRequestException('Prompt is required.');
    }

    return sanitizedPrompt;
  }

  private parseJsonResponse<T>(response: string): T {
    const normalized = response
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(normalized) as T;
    } catch {
      throw new BadGatewayException(
        'AI provider returned invalid structured content.',
      );
    }
  }
}
