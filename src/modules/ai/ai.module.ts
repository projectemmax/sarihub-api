import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { SellerAiController } from './seller-ai.controller';
import { SellerAiService } from './seller-ai.service';

@Module({
  imports: [ConfigModule],
  controllers: [SellerAiController],
  providers: [
    AiService,
    SellerAiService,
    GeminiProvider,
    {
      provide: AI_PROVIDER,
      useExisting: GeminiProvider,
    },
  ],
  exports: [AiService],
})
export class AiModule {}
