import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListRunsQueryDto {
  @IsOptional() @IsString()
  collectionId?: string;

  @IsOptional() @IsString()
  status?: string; // RunStatus as string; validated in service

  @IsOptional() @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @IsInt() @Min(0)
  offset?: number = 0;
}
