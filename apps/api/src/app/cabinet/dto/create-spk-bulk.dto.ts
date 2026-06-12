import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CreateSpkBulkDto {
  @ApiProperty({
    description: 'List of driver IDs to create SPK records for',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  driverIds!: number[];

  @ApiPropertyOptional({ description: 'ID of the carry type for the SPK' })
  @IsOptional()
  @IsInt()
  carryTypeId?: number | null;

  @ApiProperty({ description: 'Date of the qualification test (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateOnly()
  dateOfTest!: string;

  @ApiProperty({ description: 'Date of the test protocol (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateOnly()
  dateOfTestProtocol!: string;

  @ApiProperty({ description: 'Test protocol number' })
  @IsNotEmpty()
  @IsString()
  testProtocolNo!: string;

  @ApiPropertyOptional({
    description:
      'Ignored — server derives expiry as dateOfTest + 5 years (Наказ 789, п.27).',
    deprecated: true,
  })
  @IsOptional()
  @IsDateOnly()
  dateOfExpiry?: string;

  @ApiPropertyOptional({
    description: 'Position of the person signing the SPK',
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Full name (PIP) of the chief signer' })
  @IsOptional()
  @IsString()
  chiefPip?: string;
}
