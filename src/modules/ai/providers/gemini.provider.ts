import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GenerationConfig,
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import {
  AiProvider,
  AiProviderGenerateOptions,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly modelName: string;
  private client?: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';

      this.logger.log(`Using Gemini model: ${this.modelName}`);
  }

  async generateContent(
    prompt: string,
    options?: AiProviderGenerateOptions,
  ): Promise<string> {
    try {
      const result = await this.getModel(options).generateContent(prompt);
      const text = result.response.text();

      if (!text?.trim()) {
        throw new BadGatewayException('AI provider returned an empty response.');
      }

      return text.trim();
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(
        'Gemini content generation failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'AI content generation is temporarily unavailable.',
      );
    }
  }

  private getModel(options?: AiProviderGenerateOptions): GenerativeModel {
    const generationConfig: GenerationConfig = {
      temperature: 0.45,
      topP: 0.9,
      maxOutputTokens: 700,
    };

    if (options?.responseMimeType) {
      generationConfig.responseMimeType = options.responseMimeType;
    }

    if (options?.responseSchema) {
      generationConfig.responseSchema =
        options.responseSchema as unknown as GenerationConfig['responseSchema'];
    }

    return this.getClient().getGenerativeModel({
      model: this.modelName,
      generationConfig,
    });
  }

  private getClient(): GoogleGenerativeAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured.',
      );
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(apiKey);
    }

    return this.client;
  }
}
