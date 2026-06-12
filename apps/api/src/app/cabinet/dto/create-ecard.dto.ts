import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

export class CreateECardDto {
  @ApiProperty({ description: 'Surname in Latin transliteration' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  surnameTranslit!: string;

  @ApiProperty({ description: 'First name in Latin transliteration' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  firstNameTranslit!: string;

  @ApiPropertyOptional({ description: 'Registration number of the e-card' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiProperty({ description: 'Driving licence number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  licenceNo!: string;

  @ApiPropertyOptional({ description: 'Date of issue (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  dateOfIssue?: string;

  @ApiPropertyOptional({
    description:
      'Date of expiry (YYYY-MM-DD). If provided, must equal SPK.dateOfTest + 5 years; otherwise server-derived.',
  })
  @IsOptional()
  @IsDateOnly()
  dateOfExpiry?: string;

  @ApiPropertyOptional({ description: 'Issuing authority name' })
  @IsOptional()
  @IsString()
  issuedBy?: string;

  @ApiPropertyOptional({ description: 'Photo image URL (stored on the card)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoImg?: string;

  @ApiPropertyOptional({
    description: 'Signature image URL (stored on the card)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signImg?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of open categories (per SPK)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoriesList?: string;
}
