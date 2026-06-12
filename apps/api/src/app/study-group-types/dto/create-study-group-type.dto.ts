import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStudyGroupTypeDto {
  @ApiProperty({ description: 'Name of the study group type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;
}
