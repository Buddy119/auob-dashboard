import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRunDto {
  @IsOptional() @IsString()
  environmentId?: string;

  // newman options (optional)
  @IsOptional() @IsInt() @Min(0)
  timeoutRequestMs?: number;

  @IsOptional() @IsInt() @Min(0)
  delayRequestMs?: number;

  @IsOptional() @IsBoolean()
  bail?: boolean;

  @IsOptional() @IsBoolean()
  insecure?: boolean;
}
