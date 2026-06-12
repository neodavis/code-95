import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArticleCategory } from './article-category.entity';
import { ArticleTag } from './article-tag.entity';

@Entity({ name: 'article_article' })
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ name: 'title_img', length: 100, default: '' })
  titleImg: string;

  @Column({ length: 255 })
  author: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 255 })
  shortly: string;

  @Column({ name: 'is_published' })
  isPublished: boolean;

  @Column({ name: 'pub_date', type: 'timestamptz' })
  pubDate: Date;

  @ManyToMany(() => ArticleCategory, { eager: false })
  @JoinTable({
    name: 'article_article_cat',
    joinColumn: { name: 'article_id' },
    inverseJoinColumn: { name: 'articlecategory_id' },
  })
  categories: ArticleCategory[];

  @ManyToMany(() => ArticleTag, { eager: false })
  @JoinTable({
    name: 'article_article_tag',
    joinColumn: { name: 'article_id' },
    inverseJoinColumn: { name: 'articletag_id' },
  })
  tags: ArticleTag[];
}
