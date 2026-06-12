import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_ecountry' })
export class ECountry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name_ukr', length: 50 })
  nameUkr: string;

  @Column({ name: 'name_eng', length: 50 })
  nameEng: string;
}
