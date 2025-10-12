import { IsString, IsNotEmpty } from 'class-validator';

export class CreateStartupOptionDto {
  @IsString()
  @IsNotEmpty({ message: '启动项名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '启动项内容不能为空' })
  content: string;
}
