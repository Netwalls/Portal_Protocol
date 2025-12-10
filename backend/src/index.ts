// src/index.ts
import 'dotenv/config';
import app from './server';
import { AppDataSource } from './db/data-source';

// NOTE: we import the contract listener after DB initialization below so
// event handlers can safely persist events. Do not import contract.service here.

const PORT = process.env.PORT || 3001;

async function startServer() {
  await AppDataSource.initialize();
  console.log('DB connected (TypeORM)');

  // Import contract service after DB is ready so event handlers can use the DB
  // (dynamic import used to avoid top-level ordering issues)
  await import('./services/contract.service');

  app.listen(PORT, () => {
    console.log(`Backend running on :${PORT}`);
  });
}
startServer().catch((err) => {
  console.error('DB failed to init', err);
  process.exit(1);
});