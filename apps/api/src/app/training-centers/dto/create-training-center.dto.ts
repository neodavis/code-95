import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CreateTrainingCenterDto {
  @ApiProperty({ description: 'Full official name of the training center' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'EDRPOU code (8 digits)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/)
  edrpou: string;

  @ApiPropertyOptional({ description: 'Short name of the training center' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nameShort?: string;

  @ApiPropertyOptional({ description: 'Full name (PIP) of the chief officer' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  chiefPip?: string;

  @ApiPropertyOptional({ description: 'ATI code (up to 4 characters)' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  atiCode?: string;

  @ApiPropertyOptional({ description: 'Division identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  division?: string;

  @ApiPropertyOptional({
    description: 'Certificate number (up to 9 characters)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  certNo?: string;

  @ApiPropertyOptional({
    description: 'Certificate issue date (ISO date string)',
  })
  @IsOptional()
  @IsDateOnly()
  certDate?: string;

  @ApiPropertyOptional({ description: 'Region of the training center' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({ description: 'City of the training center' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addrStreet?: string;

  @ApiPropertyOptional({ description: 'House/building number' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  addrHouse?: string;

  @ApiPropertyOptional({ description: 'Postal code (5 digits)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  postCode?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d[\d\s\-()]{6,19}$/)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ description: 'Whether training center is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Legacy integer ID (links to system_edriver.tc_id)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  oldId?: number;
}
