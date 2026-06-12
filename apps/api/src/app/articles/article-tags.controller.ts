import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  parsePage,
  parsePageSize,
  type PaginatedResult,
  parseSearch,
  parseSort,
} from '../common/paginate';
import { ArticleTagsService } from './article-tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { type ArticleTag } from './entities/article-tag.entity';

@ApiTags('article-tags')
@ApiBearerAuth()
@Controller('article-tags')
@UseGuards(JwtAuthGuard)
export class ArticleTagsController {
  constructor(private readonly tagsService: ArticleTagsService) {}

  @ApiOperation({ summary: 'List all article tags' })
  @ApiResponse({ status: 200, description: 'Paginated list of article tags' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<ArticleTag>> {
    const allowed = ArticleTagsService.ALLOWED_COLUMNS;
    return this.tagsService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single article tag by ID' })
  @ApiResponse({ status: 200, description: 'Article tag record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ArticleTag | null> {
    return this.tagsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new article tag' })
  @ApiResponse({ status: 201, description: 'Article tag created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(@Body() dto: CreateTagDto): Promise<ArticleTag> {
    return this.tagsService.create(dto);
  }

  @ApiOperation({ summary: 'Update an article tag' })
  @ApiResponse({ status: 200, description: 'Article tag updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<ArticleTag> {
    return this.tagsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an article tag' })
  @ApiResponse({ status: 204, description: 'Article tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tagsService.remove(id);
  }
}
