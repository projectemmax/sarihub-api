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
    category: dto.category,
    brand: dto.brand,
    features: dto.features,
    specifications: dto.specifications,
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
      typeof result?.shortDescription !== 'string' ||
      typeof result?.seoDescription !== 'string' ||
      !Array.isArray(result.tags)
    ) {
      throw new BadGatewayException(
        'AI provider returned an unexpected product description format.',
      );
    }

    const description = result.description.trim();
    const shortDescription = result.shortDescription.trim();
    const seoDescription = result.seoDescription.trim();
    const tags = this.cleanStringList(result.tags, 8);

    if (!description || !shortDescription || !seoDescription || tags.length === 0) {
      throw new BadGatewayException(
        'AI provider returned incomplete product description content.',
      );
    }

    return {
      description,
      shortDescription,
      seoDescription,
      tags,
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
