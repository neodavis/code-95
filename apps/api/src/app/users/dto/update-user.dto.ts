import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'New password (minimum 6 characters)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'First name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Middle name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  middleName?: string;

  @ApiPropertyOptional({ description: 'Email address of the user' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^\+?\d[\d\s\-()]{6,19}$/)
  phone?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthday?: string | null;

  @ApiPropertyOptional({ description: 'Passport series and number' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  passport?: string;

  @ApiPropertyOptional({ description: 'Identification code (РНОКПП)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  identificationCode?: string;

  @ApiPropertyOptional({ description: 'Region / oblast' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  region?: string;

  @ApiPropertyOptional({ description: 'Whether the user has staff privileges' })
  @IsOptional()
  @IsBoolean()
  isStaff?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user has superuser privileges',
  })
  @IsOptional()
  @IsBoolean()
  isSuperuser?: boolean;

  @ApiPropertyOptional({ description: 'Whether the user account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
