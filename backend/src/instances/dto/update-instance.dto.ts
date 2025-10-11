import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateInstanceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hostDirectory?: string;

  @IsString()
  @IsOptional()
  containerDirectory?: string;

  @IsNumber()
  @IsOptional()
  adminId?: number;
}
