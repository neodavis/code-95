import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SanitizeHtml } from '../../common/sanitize-html.transform';

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Author name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string;

  @ApiProperty({ description: 'Short summary of the article' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  shortly: string;

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
    description: 'List of category UUIDs to assign',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'List of tag UUIDs to assign',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];
}
