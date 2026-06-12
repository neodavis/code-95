import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'faq_faq' })
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'is_published' })
  isPublished: boolean;
}
