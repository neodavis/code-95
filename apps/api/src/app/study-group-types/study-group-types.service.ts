import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { StudyGroupType } from './entities/study-group-type.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { type CreateStudyGroupTypeDto } from './dto/create-study-group-type.dto';
import { type UpdateStudyGroupTypeDto } from './dto/update-study-group-type.dto';

@Injectable()
export class StudyGroupTypesService {
  constructor(
    @InjectRepository(StudyGroupType)
    private readonly studyGroupTypeRepo: Repository<StudyGroupType>,
  ) {}

  static readonly ALLOWED_COLUMNS = ['name'] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<StudyGroupType>> {
    return paginateWithSearch(
      this.studyGroupTypeRepo,
      { order: { name: 'ASC' } },
      page,
      pageSize,
      sort,
      search,
      StudyGroupTypesService.ALLOWED_COLUMNS,
    );
  }

  findOne(id: string): Promise<StudyGroupType | null> {
    return this.studyGroupTypeRepo.findOne({ where: { id } });
  }

  create(dto: CreateStudyGroupTypeDto): Promise<StudyGroupType> {
    const entity = this.studyGroupTypeRepo.create({ name: dto.name });
    return this.studyGroupTypeRepo.save(entity);
  }

  async update(
    id: string,
    dto: UpdateStudyGroupTypeDto,
  ): Promise<StudyGroupType> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`StudyGroupType #${id} not found`);

    const patch: Partial<StudyGroupType> = {};
    if (dto.name !== undefined) patch.name = dto.name;

    await this.studyGroupTypeRepo.update(id, patch);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`StudyGroupType #${id} not found`);
    await this.studyGroupTypeRepo.delete(id);
  }
}
