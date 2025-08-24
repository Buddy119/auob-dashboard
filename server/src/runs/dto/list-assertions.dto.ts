import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAssertionsDto {
  @IsOptional() @IsInt() @Min(1) @Max(200)
  limit?: number = 50;

  @IsOptional() @IsInt() @Min(0)
  offset?: number = 0;

  @IsOptional() @IsString()
  stepId?: string;
}
