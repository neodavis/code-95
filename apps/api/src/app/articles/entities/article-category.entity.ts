import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'article_articlecategory' })
export class ArticleCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', default: '' })
  description: string;
}
