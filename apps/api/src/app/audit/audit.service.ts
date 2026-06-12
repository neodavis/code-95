import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import type { Request } from 'express';
import { AuditLog, AuditAction } from './audit-log.entity';
import {
  buildResult,
  paginate,
  type PaginatedResult,
} from '../common/paginate';

export interface AuditContext {
  userId?: string | null;
  req?: Request;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    action: AuditAction,
    entity: string | null,
    entityId: string | null,
    changes: Record<string, unknown> | null,
    ctx: AuditContext,
  ): Promise<void> {
    const entry = this.auditRepo.create({
      action,
      entity,
      entityId,
      changes,
      userId: ctx.userId ?? null,
      ipAddress: ctx.req ? this.extractIp(ctx.req) : null,
      userAgent: ctx.req?.headers?.['user-agent'] ?? null,
    });
    await this.auditRepo.save(entry);
  }

  async findAll(
    page: number,
    pageSize: number,
    action?: AuditAction,
    dateFrom?: string,
    dateTo?: string,
    userId?: string,
    entity?: string,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    // Date range via QueryBuilder when provided
    if (dateFrom || dateTo) {
      const qb = this.auditRepo
        .createQueryBuilder('a')
        .where(where)
        .orderBy('a.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);
      if (dateFrom) qb.andWhere('a.created_at >= :dateFrom', { dateFrom });
      if (dateTo) qb.andWhere('a.created_at <= :dateTo', { dateTo });
      const [results, count] = await qb.getManyAndCount();
      return buildResult(results, count, page, pageSize);
    }
    return paginate(
      this.auditRepo,
      { where, order: { createdAt: 'DESC' } },
      page,
      pageSize,
    );
  }

  private extractIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return first?.trim() ?? null;
    }
    return req.socket?.remoteAddress ?? null;
  }
}
