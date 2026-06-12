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
  parseSearch,
  parseSort,
} from '../common/paginate';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @ApiOperation({ summary: 'List published FAQ entries (public)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of published FAQ entries',
  })
  @Get('public')
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ medium: true, long: true })
  findPublished(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.faqService.findAllPublished(
      parsePage(page),
      parsePageSize(pageSize),
    );
  }

  @ApiOperation({ summary: 'List all FAQ entries including unpublished' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all FAQ entries',
  })
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
  ): Promise<unknown> {
    const allowed = FaqService.ALLOWED_COLUMNS;
    return this.faqService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single FAQ entry by ID' })
  @ApiResponse({ status: 200, description: 'FAQ entry' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.faqService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new FAQ entry' })
  @ApiResponse({ status: 201, description: 'FAQ entry created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: CreateFaqDto): Promise<unknown> {
    return this.faqService.create(dto);
  }

  @ApiOperation({ summary: 'Update a FAQ entry' })
  @ApiResponse({ status: 200, description: 'FAQ entry updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqDto,
  ): Promise<unknown> {
    return this.faqService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a FAQ entry' })
  @ApiResponse({ status: 204, description: 'FAQ entry deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.faqService.remove(id);
  }
}
