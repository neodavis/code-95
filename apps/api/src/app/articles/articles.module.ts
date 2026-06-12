import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { ArticleCategory } from './entities/article-category.entity';
import { ArticleTag } from './entities/article-tag.entity';
import { ArticlesService } from './articles.service';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticleTagsService } from './article-tags.service';
import { ArticlesController } from './articles.controller';
import { ArticleCategoriesController } from './article-categories.controller';
import { ArticleTagsController } from './article-tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article, ArticleCategory, ArticleTag])],
  controllers: [
    ArticlesController,
    ArticleCategoriesController,
    ArticleTagsController,
  ],
  providers: [ArticlesService, ArticleCategoriesService, ArticleTagsService],
})
export class ArticlesModule {}
