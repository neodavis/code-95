import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCarryTypeDto {
  @ApiPropertyOptional({ description: 'Carry type display name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'SPK certificate text variant' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameSpk?: string;
}
