import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Intent } from '../entities/Intent';
import { RewardClaim } from '../entities/RewardClaim';
import { AttackerPenalty } from '../entities/AttackerPenalty';

// Debug logging
console.log('=== DATABASE CONNECTION DEBUG ===');
console.log('Db_URL exists:', !!process.env.Db_URL);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('Db_URL value:', process.env.Db_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL);
console.log('Using connection string:', process.env.Db_URL || process.env.DATABASE_URL);
console.log('================================');


export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.Db_URL || process.env.DATABASE_URL,
  synchronize: true, // AUTO schema sync — no migrations
  logging: true,
  entities: [Intent, RewardClaim, AttackerPenalty],
  ssl: {
    rejectUnauthorized: false // Railway requires SSL
  }
});