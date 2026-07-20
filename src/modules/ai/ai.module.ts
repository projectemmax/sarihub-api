import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { SellerAiController } from './seller-ai.controller';
import { SellerAiService } from './seller-ai.service';
import { OpenAiProvider } from './providers/openai.provider';
import { HttpModule } from '@nestjs/axios';

import { OllamaProvider } from './providers/ollama.provider';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [SellerAiController],
  providers: [
    AiService,
    SellerAiService,
    GeminiProvider,
    OpenAiProvider,
    OllamaProvider,
    {
  provide: AI_PROVIDER,
  useFactory: (
    config: ConfigService,
    gemini: GeminiProvider,
    ollama: OllamaProvider,
  ) => {
    const provider =
      config.get<string>('AI_PROVIDER');

    switch (provider) {
      case 'ollama':
        return ollama;

      case 'gemini':
      default:
        return gemini;
    }
  },
  inject: [
    ConfigService,
    GeminiProvider,
    OllamaProvider,
  ],
},
  ],
  exports: [AiService],
})
export class AiModule {}
