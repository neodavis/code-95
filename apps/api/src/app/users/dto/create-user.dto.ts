import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateUserDto {
  @ApiProperty({ description: 'Unique identifier code for the user account' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  uniqueCode: string;

  @ApiProperty({ description: 'User password (minimum 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  lastName: string;

  @ApiProperty({ description: 'Middle name (по батькові) of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  middleName: string;

  @ApiProperty({ description: 'Personal phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^\+?\d[\d\s\-()]{6,19}$/)
  phone: string;

  @ApiPropertyOptional({ description: 'Email address of the user' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthday?: string | null;

  @ApiPropertyOptional({ description: 'Passport series and number' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  passport?: string;

  @ApiPropertyOptional({
    description: 'Identification code (РНОКПП)',
  })
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
