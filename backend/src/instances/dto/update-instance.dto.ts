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

  @IsString()
  @IsOptional()
  binHostDirectory?: string;

  @IsNumber()
  @IsOptional()
  adminId?: number;

  @IsNumber()
  @IsOptional()
  cfgTemplateId?: number;

  @IsNumber()
  @IsOptional()
  startupOptionId?: number;

  @IsNumber()
  @IsOptional()
  gamemodeId?: number;

  @IsString()
  @IsOptional()
  customCfg?: string;
}
