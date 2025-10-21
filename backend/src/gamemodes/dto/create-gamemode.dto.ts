import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGamemodeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  onlineDir: string;

  @IsNotEmpty()
  @IsString()
  onlineRepoUrl: string;

  @IsNotEmpty()
  @IsString()
  devDir: string;

  @IsNotEmpty()
  @IsString()
  devRepoUrl: string;

  @IsNotEmpty()
  @IsString()
  coreDir: string;

  @IsNotEmpty()
  @IsString()
  buildDir: string;
}
