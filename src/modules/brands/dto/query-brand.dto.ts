import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryBrandDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}