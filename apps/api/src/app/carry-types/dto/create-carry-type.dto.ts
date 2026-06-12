import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCarryTypeDto {
  @ApiProperty({ description: 'Carry type display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'SPK certificate text variant' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameSpk?: string;
}
