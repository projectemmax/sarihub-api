import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { GenerateProductDescriptionDto } from './dto/generate-product-description.dto';
import { ProductDescriptionResponseDto } from './dto/product-description-response.dto';
import { SellerAiService } from './seller-ai.service';

@ApiTags('Seller AI')
@ApiBearerAuth('access-token')
@Controller('seller/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class SellerAiController {
  constructor(private readonly sellerAiService: SellerAiService) {}

  @Post('generate-description')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate seller product description content with AI',
  })
  @ApiBody({ type: GenerateProductDescriptionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProductDescriptionResponseDto,
  })
  generateDescription(
    @Body() dto: GenerateProductDescriptionDto,
  ): Promise<ProductDescriptionResponseDto> {
    return this.sellerAiService.generateProductDescription(dto);
  }
}
