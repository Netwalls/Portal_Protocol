import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGO_URL || process.env.DATABASE_URL;
  if (!uri) throw new Error('MONGO_URL env var is not set');
  await mongoose.connect(uri);
  console.log('DB connected (MongoDB)');
}
