import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class UpdateDriverDto {
  @ApiPropertyOptional({ description: 'Driver surname' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  surname?: string;

  @ApiPropertyOptional({ description: 'Driver first name' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Driver middle name (patronymic)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  middleName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (ISO date string)' })
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

  @ApiPropertyOptional({ description: 'Email address of the driver' })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Comma-separated list of driver licence categories',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoriesList?: string | null;

  @ApiPropertyOptional({
    description: 'Country of birth ID (references system_ecountry)',
  })
  @IsOptional()
  @IsInt()
  countryOfBirthId?: number | null;

  @ApiPropertyOptional({
    description:
      'Country of birth name (free text). Upserts into system_ecountry by case-insensitive nameUkr match.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  countryOfBirthName?: string | null;

  @ApiPropertyOptional({ description: 'Surname transliteration (Latin)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  surnameTranslit?: string;

  @ApiPropertyOptional({ description: 'First name transliteration (Latin)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstNameTranslit?: string;

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

  @ApiPropertyOptional({ description: 'Address house number' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  addrHouse?: string | null;

  @ApiPropertyOptional({ description: 'Address flat number' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  addrFlat?: string | null;

  @ApiPropertyOptional({ description: 'Post code' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  postCode?: string | null;

  @ApiPropertyOptional({
    description: 'Driver status ID (references system_edriverstatus)',
  })
  @IsOptional()
  @IsInt()
  statusId?: number | null;
}
