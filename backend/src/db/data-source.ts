import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Intent } from '../entities/Intent';
import { RewardClaim } from '../entities/RewardClaim';
import { AttackerPenalty } from '../entities/AttackerPenalty';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.Db_URL || process.env.DATABASE_URL,
  synchronize: true, // AUTO schema sync — no migrations
  logging: false,
  entities: [Intent, RewardClaim, AttackerPenalty],
});