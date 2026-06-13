import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import {
  AiProvider,
  AiProviderGenerateOptions,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  private client?: OpenAI;

  constructor(
    private readonly configService: ConfigService,
  ) {}

  async generateContent(
    prompt: string,
    options?: AiProviderGenerateOptions,
  ): Promise<string> {
    try {
      const response =
        await this.getClient().responses.create({
          model:
            this.configService.get<string>(
              'OPENAI_MODEL',
            ) ?? 'gpt-5-mini',

          input: prompt,
        });

      const text =
        response.output_text?.trim();

      if (!text) {
        throw new BadGatewayException(
          'AI provider returned an empty response.',
        );
      }

      return text;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(
        'OpenAI content generation failed',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw new ServiceUnavailableException(
        'AI content generation is temporarily unavailable.',
      );
    }
  }

  private getClient(): OpenAI {
    const apiKey =
      this.configService.get<string>(
        'OPENAI_API_KEY',
      );

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY is not configured.',
      );
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
      });
    }

    return this.client;
  }
}