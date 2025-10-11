import { IsString, IsOptional, MinLength, IsArray, IsNumber } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: '密码至少需要6个字符' })
  password?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  instanceIds?: number[];
}
