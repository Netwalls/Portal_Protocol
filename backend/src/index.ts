// src/index.ts
import 'dotenv/config';
import app from './server';
import { connectMongo } from './db/mongoose';

const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectMongo();
  await import('./services/contract.service');
  app.listen(PORT, () => console.log(`Backend running on :${PORT}`));
}

startServer().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});