import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import {
  type PaginatedResult,
  paginateWithSearch,
  type SortParam,
} from '../common/paginate';
import { ArticleCategory } from './entities/article-category.entity';
import { ArticleTag } from './entities/article-tag.entity';
import { type CreateArticleDto } from './dto/create-article.dto';
import { type UpdateArticleDto } from './dto/update-article.dto';
import { slugify } from './slug.util';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(ArticleCategory)
    private readonly categoryRepo: Repository<ArticleCategory>,
    @InjectRepository(ArticleTag)
    private readonly tagRepo: Repository<ArticleTag>,
    private readonly audit: AuditService,
  ) {}

  static readonly ALLOWED_COLUMNS = [
    'title',
    'author',
    'isPublished',
    'pubDate',
  ] as const;

  findAll(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<Article>> {
    return paginateWithSearch(
      this.articleRepo,
      {
        relations: ['categories', 'tags'],
        order: { pubDate: 'DESC' },
      },
      page,
      pageSize,
      sort,
      search,
      ArticlesService.ALLOWED_COLUMNS,
    );
  }

  findAllPublished(
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<Article>> {
    return paginateWithSearch(
      this.articleRepo,
      {
        where: { isPublished: true },
        relations: ['categories', 'tags'],
        order: { pubDate: 'DESC' },
      },
      page,
      pageSize,
      sort,
      search,
      ArticlesService.ALLOWED_COLUMNS,
    );
  }

  findOneBySlug(slug: string): Promise<Article | null> {
    return this.articleRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['categories', 'tags'],
    });
  }

  findOne(id: string): Promise<Article | null> {
    return this.articleRepo.findOne({
      where: { id },
      relations: ['categories', 'tags'],
    });
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const baseSlug = slugify(dto.title);
    const slug = await this.resolveUniqueSlug(baseSlug);

    const categories = dto.categoryIds?.length
      ? await this.categoryRepo.findBy({ id: In(dto.categoryIds) })
      : [];

    const tags = dto.tagIds?.length
      ? await this.tagRepo.findBy({ id: In(dto.tagIds) })
      : [];

    const entity = this.articleRepo.create({
      title: dto.title,
      slug,
      author: dto.author,
      shortly: dto.shortly,
      description: dto.description ?? '',
      isPublished: dto.isPublished ?? false,
      pubDate: dto.pubDate ? new Date(dto.pubDate) : new Date(),
      titleImg: dto.titleImg ?? '',
      categories,
      tags,
    });

    const saved = await this.articleRepo.save(entity);
    await this.audit.log(
      AuditAction.ARTICLE_CREATE,
      'article',
      saved.id,
      { title: saved.title },
      { userId: null },
    );
    return saved;
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Article #${id} not found`);

    const patch: Partial<Article> = {};
    if (dto.title !== undefined) {
      patch.title = dto.title;
      const baseSlug = slugify(dto.title);
      patch.slug = await this.resolveUniqueSlug(baseSlug, id);
    }
    if (dto.author !== undefined) patch.author = dto.author;
    if (dto.shortly !== undefined) patch.shortly = dto.shortly;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.isPublished !== undefined) patch.isPublished = dto.isPublished;
    if (dto.pubDate !== undefined) patch.pubDate = new Date(dto.pubDate);
    if (dto.titleImg !== undefined) patch.titleImg = dto.titleImg;

    if (dto.categoryIds !== undefined) {
      existing.categories = dto.categoryIds.length
        ? await this.categoryRepo.findBy({ id: In(dto.categoryIds) })
        : [];
    }

    if (dto.tagIds !== undefined) {
      existing.tags = dto.tagIds.length
        ? await this.tagRepo.findBy({ id: In(dto.tagIds) })
        : [];
    }

    Object.assign(existing, patch);
    const saved = await this.articleRepo.save(existing);
    await this.audit.log(
      AuditAction.ARTICLE_UPDATE,
      'article',
      id,
      { ...dto } as Record<string, unknown>,
      { userId: null },
    );
    return saved;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException(`Article #${id} not found`);
    await this.articleRepo.delete(id);
    await this.audit.log(AuditAction.ARTICLE_DELETE, 'article', id, null, {
      userId: null,
    });
  }

  private async resolveUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = base;
    let counter = 2;
    while (true) {
      const existing = await this.articleRepo.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }
}
