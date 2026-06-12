import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SplitGroupDto {
  @ApiProperty({
    description:
      'List of driver IDs to be placed in the blocked (short course) subgroup',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  blockedDriverIds!: number[];
}
