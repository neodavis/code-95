import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { ECarryType } from '../cabinet/entities/ecarry-type.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { type CreateCarryTypeDto } from './dto/create-carry-type.dto';
import { type UpdateCarryTypeDto } from './dto/update-carry-type.dto';

@Injectable()
export class CarryTypesService {
  constructor(
    @InjectRepository(ECarryType)
    private readonly carryTypeRepo: Repository<ECarryType>,
  ) {}

  static readonly ALLOWED_COLUMNS = ['name', 'nameSpk'] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<ECarryType>> {
    return paginateWithSearch(
      this.carryTypeRepo,
      { order: { name: 'ASC' } },
      page,
      pageSize,
      sort,
      search,
      CarryTypesService.ALLOWED_COLUMNS,
    );
  }

  findOne(id: number): Promise<ECarryType | null> {
    return this.carryTypeRepo.findOne({ where: { id } });
  }

  create(dto: CreateCarryTypeDto): Promise<ECarryType> {
    const entity = this.carryTypeRepo.create({
      name: dto.name,
      nameSpk: dto.nameSpk ?? '',
    });
    return this.carryTypeRepo.save(entity);
  }

  async update(id: number, dto: UpdateCarryTypeDto): Promise<ECarryType> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`CarryType #${id} not found`);

    const patch: Partial<ECarryType> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.nameSpk !== undefined) patch.nameSpk = dto.nameSpk;

    await this.carryTypeRepo.update(id, patch);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`CarryType #${id} not found`);
    await this.carryTypeRepo.delete(id);
  }
}
