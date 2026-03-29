import mongoose, { Schema, Document } from 'mongoose';

export interface IAttackerPenalty extends Document {
  attacker: string;
  intentHash: string;
  penaltyWei: string;
  createdAt: Date;
}

const AttackerPenaltySchema = new Schema<IAttackerPenalty>({
  attacker:   { type: String, required: true },
  intentHash: { type: String, required: true },
  penaltyWei: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const AttackerPenalty = mongoose.model<IAttackerPenalty>('AttackerPenalty', AttackerPenaltySchema);
