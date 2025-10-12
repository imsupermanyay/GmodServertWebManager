import { PartialType } from '@nestjs/mapped-types';
import { CreateCfgTemplateDto } from './create-cfg-template.dto';

export class UpdateCfgTemplateDto extends PartialType(CreateCfgTemplateDto) {}
