import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class Intent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column()
  intentHash!: string;

  @Column()
  user!: string;

  @Column({ default: 'Open' })
  status!: string;

  @Column({ nullable: true })
  txHash?: string;

  @Column({ type: 'bigint', nullable: true })
  commitTime?: number;

  @CreateDateColumn()
  createdAt!: Date;
}

