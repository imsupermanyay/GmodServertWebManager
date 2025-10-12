import { PartialType } from '@nestjs/mapped-types';
import { CreateStartupOptionDto } from './create-startup-option.dto';

export class UpdateStartupOptionDto extends PartialType(CreateStartupOptionDto) {}
