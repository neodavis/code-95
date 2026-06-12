import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_ecarrytype' })
export class ECarryType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'name_spk', length: 200, default: '' })
  nameSpk: string;
}
