import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { SanitizeHtml } from '../../common/sanitize-html.transform';

export class UpdateFaqDto {
  @ApiPropertyOptional({ description: 'FAQ question text' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  question?: string;

  @ApiPropertyOptional({ description: 'FAQ answer text' })
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({
    description: 'Whether this FAQ entry is publicly visible',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
