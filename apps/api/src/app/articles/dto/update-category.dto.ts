import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { SanitizeHtml } from '../../common/sanitize-html.transform';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  description?: string;
}
