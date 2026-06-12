import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CreateDriverDto {
  @ApiProperty({ description: 'Driver surname' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  surname!: string;

  @ApiProperty({ description: 'Driver first name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  firstName!: string;

  @ApiProperty({ description: 'Driver middle name (patronymic)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  middleName?: string;

  @ApiProperty({ description: 'Driver tax identification number (10 digits)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'taxNumber must be exactly 10 digits' })
  taxNumber!: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ description: 'Phone number of the driver' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d[\d\s\-()]{6,19}$/, {
    message: 'Invalid phone number format',
  })
  phone?: string | null;

  @ApiProperty({ description: 'Email address of the driver' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Surname transliteration' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  surnameTranslit?: string | null;

  @ApiPropertyOptional({ description: 'First name transliteration' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstNameTranslit?: string | null;

  @ApiPropertyOptional({ description: 'Country of birth (ECountry id)' })
  @IsOptional()
  @IsInt()
  countryOfBirthId?: number | null;

  @ApiPropertyOptional({ description: 'Country of birth name (free text)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  countryOfBirthName?: string | null;

  @ApiPropertyOptional({ description: 'Address town' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addrTown?: string | null;

  @ApiPropertyOptional({ description: 'Address street' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addrStreet?: string | null;

  @ApiPropertyOptional({ description: 'Address house' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  addrHouse?: string | null;

  @ApiPropertyOptional({ description: 'Address flat' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  addrFlat?: string | null;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  postCode?: string | null;

  @ApiPropertyOptional({ description: 'Status id' })
  @IsOptional()
  @IsInt()
  statusId?: number | null;

  @ApiPropertyOptional({
    description: 'CPC categories list (e.g., B, C, D, …)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoriesList?: string[];

  @ApiPropertyOptional({ description: 'Driver license number' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  driverLicenseNo?: string | null;

  @ApiPropertyOptional({
    description: 'Driver license open categories',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  driverLicenseCategories?: string[];

  @ApiPropertyOptional({ description: 'Driver license issue date (ISO)' })
  @IsOptional()
  @IsString()
  driverLicenseIssueDate?: string | null;

  @ApiPropertyOptional({ description: 'Driver license expiry date (ISO)' })
  @IsOptional()
  @IsString()
  driverLicenseExpiryDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Date when C/CE/C1/C1E category was first opened (Наказ 789 п.11.2 — стаж керування цієї категорії)',
  })
  @IsOptional()
  @IsString()
  cCategoryIssueDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Date when D/DE/D1/D1E category was first opened (Наказ 789 п.11.2 — стаж керування цієї категорії)',
  })
  @IsOptional()
  @IsString()
  dCategoryIssueDate?: string | null;

  @ApiPropertyOptional({
    description: 'Driver intends urban/suburban route (D/DE)',
  })
  @IsOptional()
  @IsBoolean()
  intendsUrbanSuburbanRoute?: boolean;
}
