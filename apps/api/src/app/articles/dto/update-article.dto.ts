import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SanitizeHtml } from '../../common/sanitize-html.transform';

export class UpdateArticleDto {
  @ApiPropertyOptional({ description: 'Article title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Author name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @ApiPropertyOptional({ description: 'Short summary of the article' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  shortly?: string;

  @ApiPropertyOptional({
    description: 'Full article body (HTML or plain text)',
  })
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the article is publicly visible',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Publication date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  pubDate?: string;

  @ApiPropertyOptional({ description: 'Title image filename or path' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titleImg?: string;

  @ApiPropertyOptional({
    description: 'List of category IDs to assign',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: 'List of tag IDs to assign',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
