import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SanitizeHtml } from '../../common/sanitize-html.transform';

export class CreateFaqDto {
  @ApiProperty({ description: 'FAQ question text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  question: string;

  @ApiProperty({ description: 'FAQ answer text' })
  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({
    description: 'Whether this FAQ entry is publicly visible',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
