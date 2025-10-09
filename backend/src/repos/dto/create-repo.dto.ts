import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateRepoDto {
  @IsString()
  name: string;

  @IsUrl()
  gitea_http_url: string;

  @IsString()
  @IsOptional()
  gitea_ssh_url?: string;

  @IsString()
  @IsOptional()
  default_branch?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
