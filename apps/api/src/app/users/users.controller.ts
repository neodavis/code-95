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
import { type User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toSafe({ password, ...rest }: User): Omit<User, 'password'> {
  return rest;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, StaffGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List all users with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = UsersService.ALLOWED_COLUMNS;
    const result = await this.usersService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
    return { ...result, results: result.results.map(toSafe) };
  }

  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiResponse({ status: 200, description: 'User record without password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    const user = await this.usersService.findOne(id);
    return user ? toSafe(user) : null;
  }

  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<unknown> {
    const user = await this.usersService.create(dto);
    return toSafe(user);
  }

  @ApiOperation({ summary: 'Update an existing user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<unknown> {
    const user = await this.usersService.update(id, dto);
    return toSafe(user);
  }

  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiResponse({ status: 204, description: 'User deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.usersService.deactivate(id);
  }
}
