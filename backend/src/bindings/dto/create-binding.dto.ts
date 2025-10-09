import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateBindingDto {
  @IsInt()
  repo_id: number;

  @IsString()
  branch: string;

  @IsInt()
  instance_id: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
