import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'UUID of the user to assign as an employee' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'UUID of the training center to assign the employee to',
  })
  @IsUUID()
  @IsNotEmpty()
  trainingCenterId: string;

  @ApiPropertyOptional({
    description: 'Whether the employee account is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
