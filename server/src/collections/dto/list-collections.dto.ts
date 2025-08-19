import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCollectionsQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @IsInt() @Min(0)
  offset?: number = 0;

  @IsOptional() @IsString()
  q?: string;
}
