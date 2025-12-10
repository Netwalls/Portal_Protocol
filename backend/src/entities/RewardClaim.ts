import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class RewardClaim {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 42 })
  claimer!: string;

  @Column({ type: 'varchar', length: 78 })
  txHash!: string;

  @Column({ type: 'varchar', length: 32 })
  amountWei!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
