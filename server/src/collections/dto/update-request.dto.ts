import { IsBoolean } from 'class-validator';

export class UpdateRequestDto {
  @IsBoolean()
  isCritical!: boolean;
}
