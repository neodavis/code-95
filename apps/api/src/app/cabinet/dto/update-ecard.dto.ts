import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

// Read-only card fields are deliberately absent from this DTO (Django parity:
// ECardForm disabled fields): serialNo (SPK link), issuedBy and dateOfExpiry
// (derived from the SPK 5-year rule) are fixed at creation time.
export class UpdateECardDto {
  // Name fields — only accepted within 48 h of creation (enforced in service)
  @ApiPropertyOptional({
    description: 'Driver surname (editable within 48 h of creation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  surname?: string;

  @ApiPropertyOptional({
    description: 'Driver first name (editable within 48 h of creation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description:
      'Surname in Latin transliteration (editable within 48 h of creation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  surnameTranslit?: string;

  @ApiPropertyOptional({
    description:
      'First name in Latin transliteration (editable within 48 h of creation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstNameTranslit?: string;

  // Always editable
  @ApiPropertyOptional({ description: 'Date of issue (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  dateOfIssue?: string | null;

  @ApiPropertyOptional({ description: 'Registration number of the e-card' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string | null;

  @ApiPropertyOptional({ description: 'Driving licence number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Union Code 95 reference' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unionCode95?: string | null;

  @ApiPropertyOptional({ description: 'Photo image URL (stored on the card)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoImg?: string | null;

  @ApiPropertyOptional({
    description: 'Signature image URL (stored on the card)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signImg?: string | null;

  @ApiPropertyOptional({
    description: 'Comma-separated list of open categories (per SPK)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoriesList?: string | null;
}
