import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  @IsNotEmpty({ message: '实例名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  dockerImage?: string;

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
  cfgTemplateId?: number;

  @IsNumber()
  @IsOptional()
  startupOptionId?: number;

  @IsString()
  @IsOptional()
  customCfg?: string;

  @IsNumber()
  @IsOptional()
  port?: number;
}
