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
import { StaffGuard } from '../auth/guards/staff.guard';
import {
  parsePage,
  parsePageSize,
  parseSearch,
  parseSort,
} from '../common/paginate';
import { StudyGroupTypesService } from './study-group-types.service';
import { CreateStudyGroupTypeDto } from './dto/create-study-group-type.dto';
import { UpdateStudyGroupTypeDto } from './dto/update-study-group-type.dto';

@ApiTags('study-group-types')
@ApiBearerAuth()
@Controller('study-group-types')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StudyGroupTypesController {
  constructor(
    private readonly studyGroupTypesService: StudyGroupTypesService,
  ) {}

  @ApiOperation({ summary: 'List all study group types' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of study group types',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = StudyGroupTypesService.ALLOWED_COLUMNS;
    return this.studyGroupTypesService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single study group type by ID' })
  @ApiResponse({ status: 200, description: 'Study group type record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.studyGroupTypesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new study group type' })
  @ApiResponse({
    status: 201,
    description: 'Study group type created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(@Body() dto: CreateStudyGroupTypeDto): Promise<unknown> {
    return this.studyGroupTypesService.create(dto);
  }

  @ApiOperation({ summary: 'Update a study group type' })
  @ApiResponse({
    status: 200,
    description: 'Study group type updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudyGroupTypeDto,
  ): Promise<unknown> {
    return this.studyGroupTypesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a study group type' })
  @ApiResponse({
    status: 204,
    description: 'Study group type deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.studyGroupTypesService.remove(id);
  }
}
