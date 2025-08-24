import { IsOptional, IsString } from 'class-validator';

export class CreateRunDto {
  @IsOptional()
  @IsString()
  environmentId?: string; // reserved for later
}
