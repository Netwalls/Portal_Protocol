// src/controllers/rewards.controller.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { RewardClaim } from '../models/RewardClaim';
import { AttackerPenalty } from '../models/AttackerPenalty';

const ATTACKER_PENALTY_AMOUNT = ethers.parseEther('0.05');
const userSharePerPenalty     = (ATTACKER_PENALTY_AMOUNT * 3000n) / 10000n;
const lpSharePerPenalty       = (ATTACKER_PENALTY_AMOUNT * 4000n) / 10000n;
const protocolSharePerPenalty = (ATTACKER_PENALTY_AMOUNT * 2000n) / 10000n;
const solverSharePerPenalty   = (ATTACKER_PENALTY_AMOUNT * 1000n) / 10000n;

async function getClaimedPenaltyIds(claimer: string): Promise<Set<string>> {
  const claims = await RewardClaim.find({ claimer });
  const ids = new Set<string>();
  for (const claim of claims) {
    if (claim.penaltyIds) claim.penaltyIds.split(',').forEach(s => { if (s) ids.add(s); });
  }
  return ids;
}

export const getPendingRewards = async (req: Request, res: Response) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: 'address required' });
  try {
    const allPenalties = await AttackerPenalty.find();
    const claimedIds = await getClaimedPenaltyIds(address.toLowerCase());
    const unclaimedPenalties = allPenalties.filter(p => !claimedIds.has(String(p._id)));
    const pendingRewards = userSharePerPenalty * BigInt(unclaimedPenalties.length);
    res.json({
      pending: pendingRewards.toString(),
      amountEth: ethers.formatEther(pendingRewards),
      totalPenalties: allPenalties.length,
      unclaimedCount: unclaimedPenalties.length,
      claimedCount: claimedIds.size,
      perPenalty: {
        total: ATTACKER_PENALTY_AMOUNT.toString(),
        user: userSharePerPenalty.toString(),
        lp: lpSharePerPenalty.toString(),
        protocol: protocolSharePerPenalty.toString(),
        solver: solverSharePerPenalty.toString()
      }
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getRewards = getPendingRewards;

export const claimRewards = async (req: Request, res: Response) => {
  const { claimer } = req.body;
  if (!claimer) return res.status(400).json({ error: 'claimer address required' });
  try {
    const allPenalties = await AttackerPenalty.find();
    const claimerLower = claimer.toLowerCase();
    const claimedIds = await getClaimedPenaltyIds(claimerLower);
    const unclaimedPenalties = allPenalties.filter(p => !claimedIds.has(String(p._id)));
    if (unclaimedPenalties.length === 0) return res.status(400).json({ error: 'No unclaimed rewards available.' });
    const userShare = userSharePerPenalty * BigInt(unclaimedPenalties.length);
    const penaltyIds = unclaimedPenalties.map(p => String(p._id)).join(',');
    const txHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [claimerLower, BigInt(Date.now())])
    );
    await RewardClaim.create({ claimer: claimerLower, txHash, amountWei: userShare.toString(), penaltyIds });
    res.json({ txHash, status: 'claimed', receiptStatus: 1, amountWei: userShare.toString(), amountEth: ethers.formatEther(userShare), penaltyCount: unclaimedPenalties.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getRewardHistory = async (req: Request, res: Response) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: 'address required' });
  try {
    const claims = await RewardClaim.find({ claimer: address.toLowerCase() }).sort({ createdAt: -1 }).limit(25);
    res.json(claims);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getRewardSummary = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const allPenalties = await AttackerPenalty.find();
    const totalPenalties = allPenalties.length;
    const totalPot = ATTACKER_PENALTY_AMOUNT * BigInt(totalPenalties);
    res.json({
      totalPenalties,
      totals: {
        totalWei: totalPot.toString(),
        lpWei: (lpSharePerPenalty * BigInt(totalPenalties)).toString(),
        userWei: (userSharePerPenalty * BigInt(totalPenalties)).toString(),
        protocolWei: (protocolSharePerPenalty * BigInt(totalPenalties)).toString(),
        solverWei: (solverSharePerPenalty * BigInt(totalPenalties)).toString(),
      },
      userShare: address ? { penalties: totalPenalties, userWei: (userSharePerPenalty * BigInt(totalPenalties)).toString() } : undefined
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getPenaltyHistory = async (req: Request, res: Response) => {
  try {
    const penalties = await AttackerPenalty.find().sort({ createdAt: -1 }).limit(50);
    res.json(penalties);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};
