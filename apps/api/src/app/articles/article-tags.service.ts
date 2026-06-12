import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { ArticleTag } from './entities/article-tag.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { type CreateTagDto } from './dto/create-tag.dto';
import { type UpdateTagDto } from './dto/update-tag.dto';
import { slugify } from './slug.util';

@Injectable()
export class ArticleTagsService {
  constructor(
    @InjectRepository(ArticleTag)
    private readonly tagRepo: Repository<ArticleTag>,
  ) {}

  static readonly ALLOWED_COLUMNS = ['name', 'slug'] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<ArticleTag>> {
    return paginateWithSearch(
      this.tagRepo,
      { order: { name: 'ASC' } },
      page,
      pageSize,
      sort,
      search,
      ArticleTagsService.ALLOWED_COLUMNS,
    );
  }

  findOne(id: string): Promise<ArticleTag | null> {
    return this.tagRepo.findOne({ where: { id } });
  }

  async create(dto: CreateTagDto): Promise<ArticleTag> {
    const baseSlug = slugify(dto.name);
    const slug = await this.resolveUniqueSlug(baseSlug);
    const entity = this.tagRepo.create({ name: dto.name, slug });
    return this.tagRepo.save(entity);
  }

  async update(id: string, dto: UpdateTagDto): Promise<ArticleTag> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`ArticleTag #${id} not found`);

    const patch: Partial<ArticleTag> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
      const baseSlug = slugify(dto.name);
      patch.slug = await this.resolveUniqueSlug(baseSlug, id);
    }

    await this.tagRepo.update(id, patch);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`ArticleTag #${id} not found`);
    await this.tagRepo.delete(id);
  }

  private async resolveUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = base;
    let counter = 2;
    while (true) {
      const existing = await this.tagRepo.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }
}
