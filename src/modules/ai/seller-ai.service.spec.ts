import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PRODUCT_DESCRIPTION_RESPONSE_SCHEMA } from './prompts/product-description.prompt';
import { SellerAiService } from './seller-ai.service';

describe('SellerAiService', () => {
  let service: SellerAiService;
  let aiService: jest.Mocked<Pick<AiService, 'generateStructuredContent'>>;

  beforeEach(async () => {
    aiService = {
      generateStructuredContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerAiService,
        {
          provide: AiService,
          useValue: aiService,
        },
      ],
    }).compile();

    service = module.get<SellerAiService>(SellerAiService);
  });

  it('generates and normalizes seller product description content', async () => {
    aiService.generateStructuredContent.mockResolvedValue({
      description: '  Crisp wireless audio for everyday use.  ',
      highlights: [' Bluetooth 5.3 ', 'Noise cancelling', '20h battery'],
      keywords: ['Wireless Earbuds', 'Bluetooth Earbuds'],
    });

    await expect(
      service.generateProductDescription({
        name: 'Wireless Earbuds',
        features: ['Bluetooth 5.3', 'Noise Cancelling', '20h Battery'],
      }),
    ).resolves.toEqual({
      description: 'Crisp wireless audio for everyday use.',
      highlights: ['Bluetooth 5.3', 'Noise cancelling', '20h battery'],
      keywords: ['wireless earbuds', 'bluetooth earbuds'],
    });

    expect(aiService.generateStructuredContent).toHaveBeenCalledWith(
      expect.stringContaining('Wireless Earbuds'),
      PRODUCT_DESCRIPTION_RESPONSE_SCHEMA,
    );
  });
});
