import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { CarryTypesService } from './carry-types.service';
import { CreateCarryTypeDto } from './dto/create-carry-type.dto';
import { UpdateCarryTypeDto } from './dto/update-carry-type.dto';

@ApiTags('carry-types')
@ApiBearerAuth()
@Controller('carry-types')
@UseGuards(JwtAuthGuard, StaffGuard)
export class CarryTypesController {
  constructor(private readonly carryTypesService: CarryTypesService) {}

  @ApiOperation({ summary: 'List all carry types' })
  @ApiResponse({ status: 200, description: 'Paginated list of carry types' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = CarryTypesService.ALLOWED_COLUMNS;
    return this.carryTypesService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single carry type by ID' })
  @ApiResponse({ status: 200, description: 'Carry type record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.carryTypesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new carry type' })
  @ApiResponse({ status: 201, description: 'Carry type created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(@Body() dto: CreateCarryTypeDto): Promise<unknown> {
    return this.carryTypesService.create(dto);
  }

  @ApiOperation({ summary: 'Update a carry type' })
  @ApiResponse({ status: 200, description: 'Carry type updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarryTypeDto,
  ): Promise<unknown> {
    return this.carryTypesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a carry type' })
  @ApiResponse({ status: 204, description: 'Carry type deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.carryTypesService.remove(id);
  }
}
