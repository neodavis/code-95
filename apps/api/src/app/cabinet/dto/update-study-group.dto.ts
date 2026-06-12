import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt } from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class UpdateStudyGroupDto {
  @ApiPropertyOptional({ description: 'Name of the study group' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'ID of the carry type for this group' })
  @IsOptional()
  @IsInt()
  carryTypeId?: number | null;

  @ApiPropertyOptional({ description: 'UUID of the group type' })
  @IsOptional()
  @IsUUID()
  groupTypeId?: string | null;

  @ApiPropertyOptional({ description: 'Course start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  dateStart?: string | null;

  @ApiPropertyOptional({ description: 'Course finish date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  dateFinish?: string | null;
}
