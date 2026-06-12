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
import { ArticleCategoriesService } from './article-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { type ArticleCategory } from './entities/article-category.entity';

@ApiTags('article-categories')
@ApiBearerAuth()
@Controller('article-categories')
@UseGuards(JwtAuthGuard)
export class ArticleCategoriesController {
  constructor(private readonly categoriesService: ArticleCategoriesService) {}

  @ApiOperation({ summary: 'List all article categories' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of article categories',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<ArticleCategory>> {
    const allowed = ArticleCategoriesService.ALLOWED_COLUMNS;
    return this.categoriesService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single article category by ID' })
  @ApiResponse({ status: 200, description: 'Article category record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArticleCategory | null> {
    return this.categoriesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new article category' })
  @ApiResponse({
    status: 201,
    description: 'Article category created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<ArticleCategory> {
    return this.categoriesService.create(dto);
  }

  @ApiOperation({ summary: 'Update an article category' })
  @ApiResponse({
    status: 200,
    description: 'Article category updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ArticleCategory> {
    return this.categoriesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an article category' })
  @ApiResponse({
    status: 204,
    description: 'Article category deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
