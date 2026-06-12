import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CourseType } from '@code95/shared-types';

export class SetCourseTypeDto {
  @ApiProperty({
    description: 'Course type to assign to the study group',
    enum: CourseType,
  })
  @IsNotEmpty()
  @IsEnum(CourseType)
  courseType!: CourseType;
}
