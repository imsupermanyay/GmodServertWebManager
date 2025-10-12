import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
}
