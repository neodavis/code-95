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
import {
  parsePage,
  parsePageSize,
  parseSearch,
  parseSort,
} from '../common/paginate';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { TrainingCentersService } from './training-centers.service';
import { CreateTrainingCenterDto } from './dto/create-training-center.dto';
import { UpdateTrainingCenterDto } from './dto/update-training-center.dto';

@ApiTags('training-centers')
@Controller('training-centers')
export class TrainingCentersController {
  constructor(
    private readonly trainingCentersService: TrainingCentersService,
  ) {}

  @ApiOperation({
    summary: 'List training centers (public-safe fields only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of public-safe training centers',
  })
  @Get()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ medium: true, long: true })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = TrainingCentersService.ALLOWED_COLUMNS;
    return this.trainingCentersService.findAllPublic(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({
    summary: 'List all training centers with full admin fields',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of training centers (admin view)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, StaffGuard)
  findAllAdmin(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = TrainingCentersService.ALLOWED_COLUMNS;
    return this.trainingCentersService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({
    summary: 'Get a single training center by ID (admin view, full fields)',
  })
  @ApiResponse({
    status: 200,
    description: 'Training center record with full admin fields',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.trainingCentersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Get a single training center by ID (public-safe fields only)',
  })
  @ApiResponse({ status: 200, description: 'Training center record (public)' })
  @Get(':id')
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ medium: true, long: true })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.trainingCentersService.findOnePublic(id);
  }

  @ApiOperation({ summary: 'Create a new training center' })
  @ApiResponse({
    status: 201,
    description: 'Training center created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: CreateTrainingCenterDto): Promise<unknown> {
    return this.trainingCentersService.create(dto);
  }

  @ApiOperation({ summary: 'Update a training center' })
  @ApiResponse({
    status: 200,
    description: 'Training center updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingCenterDto,
  ): Promise<unknown> {
    return this.trainingCentersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a training center' })
  @ApiResponse({
    status: 204,
    description: 'Training center deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.trainingCentersService.remove(id);
  }
}
