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
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import {
  parsePage,
  parsePageSize,
  type PaginatedResult,
  parseSearch,
  parseSort,
} from '../common/paginate';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { type Article } from './entities/article.entity';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiOperation({ summary: 'List published articles (public)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of published articles',
  })
  @Get('public')
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ medium: true, long: true })
  findPublished(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<Article>> {
    const allowed = ArticlesService.ALLOWED_COLUMNS;
    return this.articlesService.findAllPublished(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single published article by slug (public)' })
  @ApiResponse({ status: 200, description: 'Published article' })
  @Get('public/:slug')
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ medium: true, long: true })
  findPublishedBySlug(@Param('slug') slug: string): Promise<Article | null> {
    return this.articlesService.findOneBySlug(slug);
  }

  @ApiOperation({ summary: 'List all articles including unpublished' })
  @ApiResponse({ status: 200, description: 'Paginated list of all articles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAuthGuard, StaffGuard)
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<Article>> {
    const allowed = ArticlesService.ALLOWED_COLUMNS;
    return this.articlesService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiResponse({ status: 200, description: 'Article record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Article | null> {
    return this.articlesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: CreateArticleDto): Promise<Article> {
    return this.articlesService.create(dto);
  }

  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<Article> {
    return this.articlesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an article' })
  @ApiResponse({ status: 204, description: 'Article deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.articlesService.remove(id);
  }
}
