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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, StaffGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiOperation({ summary: 'List all employees with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of employees' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = EmployeesService.ALLOWED_COLUMNS;
    return this.employeesService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Get a single employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.employeesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new employee assignment' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(@Body() dto: CreateEmployeeDto): Promise<unknown> {
    return this.employeesService.create(dto);
  }

  @ApiOperation({ summary: 'Update an employee record' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<unknown> {
    return this.employeesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an employee assignment' })
  @ApiResponse({ status: 204, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.employeesService.remove(id);
  }
}
