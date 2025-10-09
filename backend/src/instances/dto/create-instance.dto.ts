import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  name: string;

  @IsString()
  docker_container_name: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  query_port?: number;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  rcon_port?: number;

  @IsString()
  @IsOptional()
  map?: string;

  @IsString()
  @IsOptional()
  gamemode?: string;

  @IsInt()
  @IsOptional()
  max_players?: number;

  @IsBoolean()
  @IsOptional()
  auto_restart_on_code_change?: boolean;
}
