import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import {
  AI_PROVIDER,
  AiProvider,
} from './interfaces/ai-provider.interface';

describe('AiService', () => {
  let service: AiService;
  let provider: jest.Mocked<AiProvider>;

  beforeEach(async () => {
    provider = {
      generateContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: AI_PROVIDER,
          useValue: provider,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('delegates text generation to the configured provider', async () => {
    provider.generateContent.mockResolvedValue('Generated copy');

    await expect(service.generateContent('  Write copy  ')).resolves.toBe(
      'Generated copy',
    );

    expect(provider.generateContent).toHaveBeenCalledWith('Write copy');
  });

  it('rejects empty prompts', async () => {
    await expect(service.generateContent('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requests JSON output and parses structured responses', async () => {
    provider.generateContent.mockResolvedValue(
      '```json\n{"description":"Good","highlights":[],"keywords":[]}\n```',
    );

    await expect(
      service.generateStructuredContent('Make JSON', { type: 'object' }),
    ).resolves.toEqual({
      description: 'Good',
      highlights: [],
      keywords: [],
    });

    expect(provider.generateContent).toHaveBeenCalledWith('Make JSON', {
      responseMimeType: 'application/json',
      responseSchema: { type: 'object' },
    });
  });
});
