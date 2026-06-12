import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/is-date-only.validator';

// Read-only SPK fields are deliberately absent from this DTO (Django parity:
// SPKForm.readonly_fields): tcName, tcCertNo, carryTypeTxt and the four
// ministry-order fields are fixed at creation time. dateOfExpiry is likewise
// excluded — the server always derives it as dateOfTest + 5 years.
export class UpdateSpkDto {
  // Name — only accepted within 48 h of creation (enforced in service)
  @ApiPropertyOptional({
    description: 'Driver full name (PIP) (editable within 48 h of creation)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  driverPip?: string;

  // Always editable
  @ApiPropertyOptional({
    description: 'Date of the qualification test (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateOnly()
  dateOfTest?: string | null;

  @ApiPropertyOptional({ description: 'Test protocol number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  testProtocolNo?: string | null;

  @ApiPropertyOptional({
    description: 'Date of the test protocol (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateOnly()
  dateOfTestProtocol?: string | null;

  @ApiPropertyOptional({
    description: 'Position of the person signing the SPK',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string | null;

  @ApiPropertyOptional({ description: 'Full name (PIP) of the chief signer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chiefPip?: string | null;
}
