import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { hashDjangoPassword } from '../auth/crypto.util';
import { type CreateUserDto } from './dto/create-user.dto';
import { type UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  findByUniqueCode(uniqueCode: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { uniqueCode, isActive: true } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, isActive: true } });
  }

  static readonly ALLOWED_COLUMNS = [
    'uniqueCode',
    'email',
    'firstName',
    'lastName',
    'phone',
    'isStaff',
    'isActive',
    'isSuperuser',
  ] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<User>> {
    return paginateWithSearch(
      this.userRepo,
      { order: { dateJoined: 'DESC' } },
      page,
      pageSize,
      sort,
      search,
      UsersService.ALLOWED_COLUMNS,
    );
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { uniqueCode: dto.uniqueCode },
    });
    if (existing) {
      throw new ConflictException(
        `User with unique code "${dto.uniqueCode}" already exists`,
      );
    }

    const hashed = await hashDjangoPassword(dto.password);
    const user = this.userRepo.create({
      uniqueCode: dto.uniqueCode,
      username: dto.uniqueCode,
      password: hashed,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      phone: dto.phone,
      email: dto.email ?? '',
      birthday: dto.birthday ?? null,
      passport: dto.passport ?? '',
      identificationCode: dto.identificationCode ?? '0',
      region: dto.region ?? '',
      isStaff: dto.isStaff ?? false,
      isSuperuser: dto.isSuperuser ?? false,
      isActive: dto.isActive ?? true,
      dateJoined: new Date(),
    });
    const saved = await this.userRepo.save(user);
    await this.audit.log(
      AuditAction.USER_CREATE,
      'user',
      saved.id,
      { uniqueCode: saved.uniqueCode },
      { userId: null },
    );
    return saved;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);

    const patch: Partial<User> = {};
    if (dto.password) patch.password = await hashDjangoPassword(dto.password);
    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.middleName !== undefined) patch.middleName = dto.middleName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.birthday !== undefined) patch.birthday = dto.birthday;
    if (dto.passport !== undefined) patch.passport = dto.passport;
    if (dto.identificationCode !== undefined)
      patch.identificationCode = dto.identificationCode;
    if (dto.region !== undefined) patch.region = dto.region;
    if (dto.isStaff !== undefined) patch.isStaff = dto.isStaff;
    if (dto.isSuperuser !== undefined) patch.isSuperuser = dto.isSuperuser;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    await this.userRepo.update(id, patch);
    const updated = await this.findOne(id);
    await this.audit.log(
      AuditAction.USER_UPDATE,
      'user',
      id,
      patch as Record<string, unknown>,
      { userId: null },
    );
    return updated;
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    await this.userRepo.update(id, { isActive: false });
    await this.audit.log(
      AuditAction.USER_DEACTIVATE,
      'user',
      id,
      { uniqueCode: user.uniqueCode },
      { userId: null },
    );
  }

  updatePassword(id: string, hashedPassword: string): Promise<void> {
    return this.userRepo
      .update(id, { password: hashedPassword })
      .then(() => undefined);
  }

  updateLastLogin(id: string): Promise<void> {
    return this.userRepo
      .update(id, { lastLogin: new Date() })
      .then(() => undefined);
  }

  /**
   * Checks if the user has an active TrainingCenterEmployee record.
   * Uses the existing Django table name directly.
   */
  async isEmployee(userId: string): Promise<boolean> {
    const result = await this.userRepo.query(
      `SELECT id FROM training_center_employee
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId],
    );
    return result.length > 0;
  }
}
