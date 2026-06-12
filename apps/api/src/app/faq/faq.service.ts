import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  paginateWithFilterSort,
  type SortParam,
} from '../common/paginate';
import { type CreateFaqDto } from './dto/create-faq.dto';
import { type UpdateFaqDto } from './dto/update-faq.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
    private readonly audit: AuditService,
  ) {}

  static readonly ALLOWED_COLUMNS = ['question', 'isPublished'] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<Faq>> {
    return paginateWithSearch(
      this.faqRepo,
      { order: { id: 'DESC' } },
      page,
      pageSize,
      sort,
      search,
      FaqService.ALLOWED_COLUMNS,
    );
  }

  findAllPublished(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Faq>> {
    return paginateWithFilterSort(
      this.faqRepo,
      {
        where: { isPublished: true },
        order: { id: 'ASC' },
      },
      page,
      pageSize,
      null,
      {},
    );
  }

  findOne(id: string): Promise<Faq | null> {
    return this.faqRepo.findOne({ where: { id } });
  }

  async create(dto: CreateFaqDto): Promise<Faq> {
    const entity = this.faqRepo.create({
      question: dto.question,
      answer: dto.answer,
      isPublished: dto.isPublished ?? false,
    });
    const saved = await this.faqRepo.save(entity);
    await this.audit.log(
      AuditAction.FAQ_CREATE,
      'faq',
      saved.id,
      { question: saved.question },
      { userId: null },
    );
    return saved;
  }

  async update(id: string, dto: UpdateFaqDto): Promise<Faq> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Faq #${id} not found`);

    const patch: Partial<Faq> = {};
    if (dto.question !== undefined) patch.question = dto.question;
    if (dto.answer !== undefined) patch.answer = dto.answer;
    if (dto.isPublished !== undefined) patch.isPublished = dto.isPublished;

    await this.faqRepo.update(id, patch);
    await this.audit.log(
      AuditAction.FAQ_UPDATE,
      'faq',
      id,
      { ...dto } as Record<string, unknown>,
      { userId: null },
    );
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Faq #${id} not found`);
    await this.faqRepo.delete(id);
    await this.audit.log(AuditAction.FAQ_DELETE, 'faq', id, null, {
      userId: null,
    });
  }
}
