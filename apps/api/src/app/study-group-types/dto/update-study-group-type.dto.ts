import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStudyGroupTypeDto {
  @ApiPropertyOptional({ description: 'Name of the study group type' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
}
