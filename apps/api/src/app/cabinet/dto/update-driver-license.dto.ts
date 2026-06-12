import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';
import { DriverLicenseCategory } from '@code95/shared-types';

export class UpdateDriverLicenseDto {
  @ApiPropertyOptional({ description: 'Driver license number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  driverLicenseNo?: string | null;

  @ApiPropertyOptional({
    description: 'Open license categories',
    enum: DriverLicenseCategory,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DriverLicenseCategory, { each: true })
  driverLicenseCategories?: DriverLicenseCategory[];

  @ApiPropertyOptional({ description: 'License issue date (ISO date)' })
  @IsOptional()
  @IsDateOnly()
  driverLicenseIssueDate?: string | null;

  @ApiPropertyOptional({ description: 'License expiry date (ISO date)' })
  @IsOptional()
  @IsDateOnly()
  driverLicenseExpiryDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Date when C/CE/C1/C1E category was first opened (Наказ 789 п.11.2)',
  })
  @IsOptional()
  @IsDateOnly()
  cCategoryIssueDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Date when D/DE/D1/D1E category was first opened (Наказ 789 п.11.2)',
  })
  @IsOptional()
  @IsDateOnly()
  dCategoryIssueDate?: string | null;

  @ApiPropertyOptional({
    description:
      'D/DE driver intends to work an urban or suburban passenger route (Наказ 789, п.11.2)',
  })
  @IsOptional()
  @IsBoolean()
  intendsUrbanSuburbanRoute?: boolean;
}
