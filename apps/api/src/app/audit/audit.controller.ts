import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { AuditAction, AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import {
  parsePage,
  parsePageSize,
  type PaginatedResult,
} from '../common/paginate';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, StaffGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({
    summary: 'List audit log entries with pagination and optional filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'ISO date string',
  })
  @ApiQuery({ name: 'dateTo', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
  ): Promise<PaginatedResult<AuditLog>> {
    const validAction = Object.values(AuditAction).includes(
      action as AuditAction,
    )
      ? (action as AuditAction)
      : undefined;
    return this.auditService.findAll(
      parsePage(page),
      parsePageSize(pageSize),
      validAction,
      dateFrom,
      dateTo,
      userId,
      entity,
    );
  }
}
