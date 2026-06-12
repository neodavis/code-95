import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Whether the employee account is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
