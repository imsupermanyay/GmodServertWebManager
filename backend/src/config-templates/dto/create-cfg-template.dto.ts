import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCfgTemplateDto {
  @IsString()
  @IsNotEmpty({ message: '模板名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '模板内容不能为空' })
  content: string;
}
