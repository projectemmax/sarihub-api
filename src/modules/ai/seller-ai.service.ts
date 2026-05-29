import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateProductDescriptionDto } from './dto/generate-product-description.dto';
import { ProductDescriptionAiResult } from './interfaces/product-description.interface';
import {
  PRODUCT_DESCRIPTION_RESPONSE_SCHEMA,
  buildProductDescriptionPrompt,
} from './prompts/product-description.prompt';

@Injectable()
export class SellerAiService {
  constructor(private readonly aiService: AiService) {}

  async generateProductDescription(
    dto: GenerateProductDescriptionDto,
  ): Promise<ProductDescriptionAiResult> {
    const prompt = buildProductDescriptionPrompt({
      name: dto.name,
      features: dto.features,
    });

    const result =
      await this.aiService.generateStructuredContent<ProductDescriptionAiResult>(
        prompt,
        PRODUCT_DESCRIPTION_RESPONSE_SCHEMA,
      );

    return this.normalizeProductDescription(result);
  }

  private normalizeProductDescription(
    result: ProductDescriptionAiResult,
  ): ProductDescriptionAiResult {
    if (
      typeof result?.description !== 'string' ||
      !Array.isArray(result.highlights) ||
      !Array.isArray(result.keywords)
    ) {
      throw new BadGatewayException(
        'AI provider returned an unexpected product description format.',
      );
    }

    const description = result.description.trim();
    const highlights = this.cleanStringList(result.highlights, 5);
    const keywords = this.cleanStringList(result.keywords, 8).map((keyword) =>
      keyword.toLowerCase(),
    );

    if (!description || highlights.length === 0 || keywords.length === 0) {
      throw new BadGatewayException(
        'AI provider returned incomplete product description content.',
      );
    }

    return {
      description,
      highlights,
      keywords,
    };
  }

  private cleanStringList(value: unknown[], limit: number): string[] {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }
}
