import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class AttackerPenalty {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 42 })
  attacker!: string;

  @Index()
  @Column({ type: 'varchar', length: 66 })
  intentHash!: string;

  @Column({ type: 'varchar', length: 32 })
  penaltyWei!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
