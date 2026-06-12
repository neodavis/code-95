import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'article_articletag' })
export class ArticleTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;
}
