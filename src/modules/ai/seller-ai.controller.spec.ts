import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { SellerAiController } from './seller-ai.controller';
import { SellerAiService } from './seller-ai.service';

describe('SellerAiController', () => {
  let app: INestApplication<App>;

  const sellerAiService = {
    generateProductDescription: jest.fn(),
  };

  beforeEach(async () => {
    sellerAiService.generateProductDescription.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellerAiController],
      providers: [
        {
          provide: SellerAiService,
          useValue: sellerAiService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('generates product description content through the seller AI endpoint', async () => {
    const generated = {
      description: 'A dependable Samsung 5G phone for everyday use.',
      shortDescription: 'Samsung 5G phone with Android performance.',
      seoDescription: 'Shop a Samsung Android 5G phone built for daily productivity.',
      tags: ['Samsung', 'Android', '5G'],
    };

    sellerAiService.generateProductDescription.mockResolvedValue(generated);

    await request(app.getHttpServer())
      .post('/api/seller/ai/generate-description')
      .send({
        name: 'Samsung Phone',
        category: 'Mobile Phones',
        brand: 'Samsung',
        features: ['Android'],
        specifications: ['5G'],
      })
      .expect(200)
      .expect({
        success: true,
        message: null,
        data: generated,
      });

    expect(sellerAiService.generateProductDescription).toHaveBeenCalledWith({
      name: 'Samsung Phone',
      category: 'Mobile Phones',
      brand: 'Samsung',
      features: ['Android'],
      specifications: ['5G'],
    });
  });
});
