import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
