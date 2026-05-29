import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateProductDescriptionDto {
  @ApiProperty({
    example: 'Wireless Earbuds',
    maxLength: 120,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: ['Bluetooth 5.3', 'Noise Cancelling', '20h Battery'],
    type: [String],
    minItems: 1,
    maxItems: 20,
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  features: string[];
}
