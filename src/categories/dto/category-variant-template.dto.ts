import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CategoryVariantTemplateDto {
  @ApiProperty({
    example: ['Color', 'Size'],
  })
  @IsArray()
  @IsString({ each: true })
  attributes: string[];
}