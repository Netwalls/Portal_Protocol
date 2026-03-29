import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardClaim extends Document {
  claimer: string;
  txHash: string;
  amountWei: string;
  penaltyIds: string;
  createdAt: Date;
}

const RewardClaimSchema = new Schema<IRewardClaim>({
  claimer:    { type: String, required: true },
  txHash:     { type: String, required: true },
  amountWei:  { type: String, required: true },
  penaltyIds: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const RewardClaim = mongoose.model<IRewardClaim>('RewardClaim', RewardClaimSchema);
