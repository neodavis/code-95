import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { ArticleCategory } from './entities/article-category.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { type CreateCategoryDto } from './dto/create-category.dto';
import { type UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from './slug.util';

@Injectable()
export class ArticleCategoriesService {
  constructor(
    @InjectRepository(ArticleCategory)
    private readonly categoryRepo: Repository<ArticleCategory>,
  ) {}

  static readonly ALLOWED_COLUMNS = ['name', 'slug', 'description'] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<ArticleCategory>> {
    return paginateWithSearch(
      this.categoryRepo,
      { order: { name: 'ASC' } },
      page,
      pageSize,
      sort,
      search,
      ArticleCategoriesService.ALLOWED_COLUMNS,
    );
  }

  findOne(id: string): Promise<ArticleCategory | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async create(dto: CreateCategoryDto): Promise<ArticleCategory> {
    const baseSlug = slugify(dto.name);
    const slug = await this.resolveUniqueSlug(baseSlug);
    const entity = this.categoryRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? '',
    });
    return this.categoryRepo.save(entity);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ArticleCategory> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`ArticleCategory #${id} not found`);

    const patch: Partial<ArticleCategory> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
      const baseSlug = slugify(dto.name);
      patch.slug = await this.resolveUniqueSlug(baseSlug, id);
    }
    if (dto.description !== undefined) patch.description = dto.description;

    await this.categoryRepo.update(id, patch);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing)
      throw new NotFoundException(`ArticleCategory #${id} not found`);
    await this.categoryRepo.delete(id);
  }

  private async resolveUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = base;
    let counter = 2;
    while (true) {
      const existing = await this.categoryRepo.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }
}
