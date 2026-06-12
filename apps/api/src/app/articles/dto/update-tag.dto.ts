import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Tag name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
