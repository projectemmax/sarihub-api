import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSiteConfigItemDto {
  @IsString()
  key: string;

  @IsOptional()
  value: any; // 🔥 allow object, string, number, etc.
}

export class UpdateSiteConfigBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSiteConfigItemDto)
  configs: UpdateSiteConfigItemDto[];
}