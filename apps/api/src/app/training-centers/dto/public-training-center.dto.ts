import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TrainingCenter } from '../entities/training-center.entity';

/**
 * Public-safe view of a TrainingCenter. Excludes internal admin fields
 * (fatherTc, oldId, audit timestamps, etc.) so they are never leaked
 * through unauthenticated endpoints.
 */
export class PublicTrainingCenterDto {
  @ApiProperty({ description: 'Training center UUID' })
  id: string;

  @ApiProperty({ description: 'Full official name of the training center' })
  name: string;

  @ApiProperty({ description: 'Short name of the training center' })
  nameShort: string;

  @ApiProperty({ description: 'EDRPOU code' })
  edrpou: string;

  @ApiProperty({ description: 'Certificate number' })
  certNo: string;

  @ApiPropertyOptional({ description: 'Certificate issue date (ISO)' })
  certDate: string | null;

  @ApiPropertyOptional({ description: 'Region of the training center' })
  region: string | null;

  @ApiProperty({ description: 'City of the training center' })
  city: string;

  @ApiProperty({ description: 'Street address' })
  addrStreet: string;

  @ApiProperty({ description: 'House/building number' })
  addrHouse: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone: string | null;

  @ApiPropertyOptional({ description: 'Email address' })
  email: string | null;

  @ApiPropertyOptional({ description: 'Website URL' })
  website: string | null;

  static fromEntity(tc: TrainingCenter): PublicTrainingCenterDto {
    return {
      id: tc.id,
      name: tc.name,
      nameShort: tc.nameShort,
      edrpou: tc.edrpou,
      certNo: tc.certNo,
      certDate: tc.certDate,
      region: tc.region,
      city: tc.city,
      addrStreet: tc.addrStreet,
      addrHouse: tc.addrHouse,
      phone: tc.phone,
      email: tc.email,
      website: tc.website,
    };
  }
}
