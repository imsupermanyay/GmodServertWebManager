import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { InstanceStatus } from '../../common/enums/instance-status.enum';

export class UpdateInstanceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(InstanceStatus)
  @IsOptional()
  status?: InstanceStatus;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

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
