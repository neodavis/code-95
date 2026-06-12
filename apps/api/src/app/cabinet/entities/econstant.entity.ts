import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_econstant' })
export class EConstant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'date_of_miniinfra', type: 'date', nullable: true })
  dateOfMiniinfra: string | null;

  @Column({ name: 'miniinfra_no', length: 20, default: '' })
  miniinfraNo: string;

  @Column({ name: 'date_of_minjust', type: 'date', nullable: true })
  dateOfMinjust: string | null;

  @Column({ name: 'minjust_no', length: 20, default: '' })
  minjustNo: string;
}
