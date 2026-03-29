import mongoose, { Schema, Document } from 'mongoose';

export interface IIntent extends Document {
  intentHash: string;
  user: string;
  status: string;
  txHash?: string;
  commitTime?: number;
  createdAt: Date;
}

const IntentSchema = new Schema<IIntent>({
  intentHash: { type: String, required: true, unique: true },
  user:       { type: String, required: true },
  status:     { type: String, default: 'Open' },
  txHash:     { type: String },
  commitTime: { type: Number },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Intent = mongoose.model<IIntent>('Intent', IntentSchema);
