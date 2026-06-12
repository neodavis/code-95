import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CheckEligibilityDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  driverLicenseCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateOnly()
  driverLicenseIssueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateOnly()
  driverLicenseExpiryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateOnly()
  cCategoryIssueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateOnly()
  dCategoryIssueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  intendsUrbanSuburbanRoute?: boolean;
}

export interface EligibilityResult {
  canEnrollInitial: boolean;
  canEnrollShortened: boolean;
  canEnrollPeriodic: boolean;
  reasons: {
    initial?: string;
    shortened?: string;
    periodic?: string;
  };
}
