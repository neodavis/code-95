import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  IsEnum,
} from 'class-validator';
import { CourseType } from '@code95/shared-types';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CreateStudyGroupDto {
  @ApiProperty({ description: 'Name of the study group' })
  @IsNotEmpty()
  @IsString()
  name!: string;

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

  @ApiPropertyOptional({
    description:
      'Course type per Наказ 789, п.9: initial (280h), initial_shortened (140h), periodic (35h)',
    enum: CourseType,
  })
  @IsOptional()
  @IsEnum(CourseType)
  courseType?: CourseType | null;
}
