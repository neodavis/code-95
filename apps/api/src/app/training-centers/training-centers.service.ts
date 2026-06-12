import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { TrainingCenter } from './entities/training-center.entity';
import { type CreateTrainingCenterDto } from './dto/create-training-center.dto';
import { type UpdateTrainingCenterDto } from './dto/update-training-center.dto';
import { PublicTrainingCenterDto } from './dto/public-training-center.dto';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class TrainingCentersService {
  constructor(
    @InjectRepository(TrainingCenter)
    private readonly tcRepo: Repository<TrainingCenter>,
    private readonly audit: AuditService,
  ) {}

  static readonly ALLOWED_COLUMNS = [
    'name',
    'edrpou',
    'region',
    'city',
    'email',
  ] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<TrainingCenter>> {
    return paginateWithSearch(
      this.tcRepo,
      { order: { name: 'ASC' } },
      page,
      pageSize,
      sort,
      search,
      TrainingCentersService.ALLOWED_COLUMNS,
    );
  }

  async findAllPublic(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<PublicTrainingCenterDto>> {
    const result = await this.findAll(page, pageSize, sort, search);
    return {
      ...result,
      results: result.results.map(PublicTrainingCenterDto.fromEntity),
    };
  }

  findOne(id: string): Promise<TrainingCenter | null> {
    return this.tcRepo.findOne({ where: { id } });
  }

  async findOnePublic(id: string): Promise<PublicTrainingCenterDto | null> {
    const tc = await this.findOne(id);
    return tc ? PublicTrainingCenterDto.fromEntity(tc) : null;
  }

  async create(dto: CreateTrainingCenterDto): Promise<TrainingCenter> {
    const oldId = dto.oldId ?? (await this.nextOldId());
    const entity = this.tcRepo.create({
      name: dto.name,
      edrpou: dto.edrpou,
      nameShort: dto.nameShort ?? '',
      chiefPip: dto.chiefPip ?? '',
      atiCode: dto.atiCode ?? '',
      division: dto.division ?? '',
      certNo: dto.certNo ?? '',
      certDate: dto.certDate ?? null,
      region: dto.region ?? null,
      city: dto.city ?? '',
      addrStreet: dto.addrStreet ?? '',
      addrHouse: dto.addrHouse ?? '',
      postCode: dto.postCode ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      website: dto.website ?? null,
      isActive: dto.isActive ?? true,
      fatherTc: '',
      oldId,
    });
    const saved = await this.tcRepo.save(entity);
    await this.audit.log(
      AuditAction.TC_CREATE,
      'training_center',
      saved.id,
      { name: saved.name },
      { userId: null },
    );
    return saved;
  }

  private async nextOldId(): Promise<number> {
    const row = await this.tcRepo
      .createQueryBuilder('tc')
      .select('COALESCE(MAX(tc.old_id), 0) + 1', 'next')
      .getRawOne<{ next: number | string }>();
    return Number(row?.next ?? 1);
  }

  async update(
    id: string,
    dto: UpdateTrainingCenterDto,
  ): Promise<TrainingCenter> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`TrainingCenter #${id} not found`);

    const patch: Partial<TrainingCenter> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.edrpou !== undefined) patch.edrpou = dto.edrpou;
    if (dto.nameShort !== undefined) patch.nameShort = dto.nameShort;
    if (dto.chiefPip !== undefined) patch.chiefPip = dto.chiefPip;
    if (dto.atiCode !== undefined) patch.atiCode = dto.atiCode;
    if (dto.division !== undefined) patch.division = dto.division;
    if (dto.certNo !== undefined) patch.certNo = dto.certNo;
    if (dto.certDate !== undefined) patch.certDate = dto.certDate;
    if (dto.region !== undefined) patch.region = dto.region;
    if (dto.city !== undefined) patch.city = dto.city;
    if (dto.addrStreet !== undefined) patch.addrStreet = dto.addrStreet;
    if (dto.addrHouse !== undefined) patch.addrHouse = dto.addrHouse;
    if (dto.postCode !== undefined) patch.postCode = dto.postCode;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.website !== undefined) patch.website = dto.website;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    await this.tcRepo.update(id, patch);
    await this.audit.log(
      AuditAction.TC_UPDATE,
      'training_center',
      id,
      { ...dto } as Record<string, unknown>,
      { userId: null },
    );
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`TrainingCenter #${id} not found`);
    await this.tcRepo.delete(id);
    await this.audit.log(AuditAction.TC_DELETE, 'training_center', id, null, {
      userId: null,
    });
  }
}
