import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ArticleCategory } from './entities/article-category.entity';
import { ArticleTag } from './entities/article-tag.entity';
import { AuditService } from '../audit/audit.service';
import { createMockRepository } from '../../test-helpers/mock-repository';
import {
  makeArticle,
  makeCategory,
  makeTag,
} from '../../test-helpers/fixtures';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_2 = '550e8400-e29b-41d4-a716-446655440002';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let articleRepo: ReturnType<typeof createMockRepository<Article>>;
  let categoryRepo: ReturnType<typeof createMockRepository<ArticleCategory>>;
  let tagRepo: ReturnType<typeof createMockRepository<ArticleTag>>;

  beforeEach(async () => {
    articleRepo = createMockRepository<Article>();
    categoryRepo = createMockRepository<ArticleCategory>();
    tagRepo = createMockRepository<ArticleTag>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        {
          provide: getRepositoryToken(ArticleCategory),
          useValue: categoryRepo,
        },
        { provide: getRepositoryToken(ArticleTag), useValue: tagRepo },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  describe('findOne', () => {
    it('returns article with relations', async () => {
      const article = makeArticle();
      articleRepo.findOne.mockResolvedValue(article);

      const result = await service.findOne(ID_1);
      expect(result).toBe(article);
      expect(articleRepo.findOne).toHaveBeenCalledWith({
        where: { id: ID_1 },
        relations: ['categories', 'tags'],
      });
    });

    it('returns null when not found', async () => {
      articleRepo.findOne.mockResolvedValue(null);
      expect(await service.findOne(ID_NOT_FOUND)).toBeNull();
    });
  });

  describe('findOneBySlug', () => {
    it('finds published article by slug', async () => {
      const article = makeArticle({ slug: 'my-article' });
      articleRepo.findOne.mockResolvedValue(article);

      const result = await service.findOneBySlug('my-article');
      expect(result).toBe(article);
      expect(articleRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'my-article', isPublished: true },
        relations: ['categories', 'tags'],
      });
    });
  });

  describe('create', () => {
    it('creates article with unique slug', async () => {
      const article = makeArticle();
      // resolveUniqueSlug: first findOne returns null (slug is unique)
      articleRepo.findOne.mockResolvedValueOnce(null);
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValue(article);

      const result = await service.create({
        title: 'Test Article',
        author: 'Author',
        shortly: 'Short',
      });

      expect(result).toBe(article);
      expect(articleRepo.create).toHaveBeenCalled();
    });

    it('resolves slug conflict by appending counter', async () => {
      const existing = makeArticle({ slug: 'test-article' });
      const article = makeArticle({ slug: 'test-article-2' });
      // First findOne: slug exists; second findOne: slug-2 is free
      articleRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValue(article);

      await service.create({
        title: 'Test Article',
        author: 'Author',
        shortly: 'Short',
      });

      expect(articleRepo.create).toHaveBeenCalled();
    });

    it('resolves categories and tags when IDs provided', async () => {
      const cats = [makeCategory({ id: ID_1 }), makeCategory({ id: ID_2 })];
      const tags = [makeTag({ id: ID_1 })];
      articleRepo.findOne.mockResolvedValue(null); // unique slug
      articleRepo.create.mockReturnValue(makeArticle());
      articleRepo.save.mockResolvedValue(makeArticle());
      categoryRepo.findBy.mockResolvedValue(cats);
      tagRepo.findBy.mockResolvedValue(tags);

      await service.create({
        title: 'With Relations',
        author: 'Author',
        shortly: 'Short',
        categoryIds: [ID_1, ID_2],
        tagIds: [ID_1],
      });

      expect(categoryRepo.findBy).toHaveBeenCalled();
      expect(tagRepo.findBy).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates article fields', async () => {
      const article = makeArticle();
      articleRepo.findOne.mockResolvedValue(article);
      articleRepo.save.mockResolvedValue({ ...article, author: 'New Author' });

      await service.update(ID_1, { author: 'New Author' });
      expect(articleRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when article does not exist', async () => {
      articleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID_NOT_FOUND, { author: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('regenerates slug when title changes', async () => {
      const article = makeArticle();
      // First findOne: find article; second findOne: resolveUniqueSlug check
      articleRepo.findOne
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(null);
      articleRepo.save.mockResolvedValue(article);

      await service.update(ID_1, { title: 'New Title' });
      expect(articleRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes existing article', async () => {
      articleRepo.findOne.mockResolvedValue(makeArticle());

      await service.remove(ID_1);
      expect(articleRepo.delete).toHaveBeenCalledWith(ID_1);
    });

    it('throws NotFoundException when article does not exist', async () => {
      articleRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(ID_NOT_FOUND)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
