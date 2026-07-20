import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  AiProvider,
  AiProviderGenerateOptions,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generateContent(
    prompt: string,
    options?: AiProviderGenerateOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('OLLAMA_MODEL') ??
      'qwen3:8b';
    
    const payload: any = {
        model,
        prompt,
        stream: false,
    };

    // Enable Ollama JSON mode when structured content is requested
    if (options?.responseMimeType === 'application/json') {
        payload.format = 'json';
    }

    const response = await firstValueFrom(
        this.http.post(
            'http://localhost:11434/api/generate',
            payload,
        ),
    );

    const text = response.data?.response?.trim();

    if (!text) {
      throw new BadGatewayException(
        'Ollama returned an empty response.',
      );
    }

    return text;
  }
}