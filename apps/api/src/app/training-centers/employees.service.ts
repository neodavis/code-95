import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository, type SelectQueryBuilder } from 'typeorm';
import {
  buildResult,
  type PaginatedResult,
  type SortParam,
} from '../common/paginate';
import { TrainingCenter } from './entities/training-center.entity';
import { TrainingCenterEmployee } from './entities/training-center-employee.entity';
import { User } from '../users/entities/user.entity';
import { type CreateEmployeeDto } from './dto/create-employee.dto';
import { type UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

interface EmployeeRow {
  id: string;
  isActive: boolean;
  userId: string;
  userUniqueCode: string;
  userFullName: string;
  trainingCenterId: string;
  trainingCenterName: string;
}

// Map of allowed search/sort column keys → raw SQL expressions
const COLUMN_SQL: Record<string, string> = {
  userFullName: `CONCAT_WS(' ', NULLIF(u.last_name,''), NULLIF(u.first_name,''), NULLIF(u.middle_name,''))`,
  trainingCenterName: 'tc.name',
  isActive: 'e.is_active',
};

function mapRawRow(r: Record<string, unknown>): EmployeeRow {
  return {
    id: (r['e_id'] as string) ?? (r['id'] as string),
    isActive: (r['e_is_active'] ?? r['is_active']) as boolean,
    userId: (r['e_user_id'] ?? r['user_id']) as string,
    userUniqueCode: (r['userUniqueCode'] ??
      r['user_unique_code'] ??
      '') as string,
    userFullName: (r['userFullName'] ?? r['user_full_name'] ?? '') as string,
    trainingCenterId: (r['e_training_center_id'] ??
      r['training_center_id']) as string,
    trainingCenterName: (r['trainingCenterName'] ??
      r['training_center_name'] ??
      '') as string,
  };
}

@Injectable()
export class EmployeesService {
  static readonly ALLOWED_COLUMNS = Object.keys(
    COLUMN_SQL,
  ) as readonly string[];

  constructor(
    @InjectRepository(TrainingCenter)
    private readonly tcRepo: Repository<TrainingCenter>,
    @InjectRepository(TrainingCenterEmployee)
    private readonly employeeRepo: Repository<TrainingCenterEmployee>,
    private readonly audit: AuditService,
  ) {}

  private baseQuery(): SelectQueryBuilder<TrainingCenterEmployee> {
    return this.employeeRepo
      .createQueryBuilder('e')
      .leftJoin(User, 'u', 'u.id = e.userId')
      .leftJoin(TrainingCenter, 'tc', 'tc.id = e.trainingCenterId')
      .addSelect('u.uniqueCode', 'userUniqueCode')
      .addSelect(
        `CONCAT_WS(' ', NULLIF(u.lastName,''), NULLIF(u.firstName,''), NULLIF(u.middleName,''))`,
        'userFullName',
      )
      .addSelect('tc.name', 'trainingCenterName');
  }

  async findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<EmployeeRow>> {
    const qb = this.baseQuery();

    if (search) {
      const orParts = Object.values(COLUMN_SQL)
        .map((expr) => `(${expr})::text ILIKE :search`)
        .join(' OR ');
      qb.andWhere(`(${orParts})`, { search: `%${search}%` });
    }

    // Count
    const countQb = this.employeeRepo
      .createQueryBuilder('e')
      .select('COUNT(*)', 'cnt')
      .leftJoin(User, 'u', 'u.id = e.userId')
      .leftJoin(TrainingCenter, 'tc', 'tc.id = e.trainingCenterId');

    if (search) {
      const orParts = Object.values(COLUMN_SQL)
        .map((expr) => `(${expr})::text ILIKE :search`)
        .join(' OR ');
      countQb.andWhere(`(${orParts})`, { search: `%${search}%` });
    }

    const countResult = await countQb.getRawOne<{ cnt: string }>();
    const count = parseInt(countResult?.cnt ?? '0', 10);

    // Sort
    if (sort && COLUMN_SQL[sort.column]) {
      qb.orderBy(COLUMN_SQL[sort.column], sort.order);
    } else {
      qb.orderBy('e.id', 'DESC');
    }

    // Paginate
    const offset = (page - 1) * pageSize;
    const rawRows = await qb.offset(offset).limit(pageSize).getRawMany();

    return buildResult(rawRows.map(mapRawRow), count, page, pageSize);
  }

  async findOne(id: string): Promise<EmployeeRow | null> {
    const rawRow = await this.baseQuery()
      .where('e.id = :id', { id })
      .getRawOne();

    if (!rawRow) return null;
    return mapRawRow(rawRow);
  }

  async create(dto: CreateEmployeeDto): Promise<TrainingCenterEmployee> {
    const existing = await this.employeeRepo.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        `Employee with userId ${dto.userId} already exists`,
      );
    }

    const entity = this.employeeRepo.create({
      userId: dto.userId,
      trainingCenterId: dto.trainingCenterId,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.employeeRepo.save(entity);
    await this.audit.log(
      AuditAction.EMPLOYEE_CREATE,
      'employee',
      saved.id,
      { userId: dto.userId, trainingCenterId: dto.trainingCenterId },
      { userId: null },
    );
    return saved;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeRow> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Employee #${id} not found`);

    const patch: Partial<TrainingCenterEmployee> = {};
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    await this.employeeRepo.update(id, patch);
    await this.audit.log(
      AuditAction.EMPLOYEE_UPDATE,
      'employee',
      id,
      { ...dto } as Record<string, unknown>,
      { userId: null },
    );
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Employee #${id} not found`);
    await this.employeeRepo.delete(id);
    await this.audit.log(AuditAction.EMPLOYEE_DELETE, 'employee', id, null, {
      userId: null,
    });
  }
}
