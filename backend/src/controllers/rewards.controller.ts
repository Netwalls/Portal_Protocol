// src/controllers/rewards.controller.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { AppDataSource } from '../db/data-source';
import { Intent } from '../entities/Intent';
import { RewardClaim } from '../entities/RewardClaim';
import { AttackerPenalty } from '../entities/AttackerPenalty';

// Track which penalties each user has claimed
const claimedPenaltiesByUser: Record<string, Set<number>> = {};

// Reward split from penalties
const ATTACKER_PENALTY_AMOUNT = ethers.parseEther('0.05');
const LP_BP = 4000;
const USER_BP = 3000;
const PROTOCOL_BP = 2000;
const SOLVER_BP = 1000;

const userSharePerPenalty = (ATTACKER_PENALTY_AMOUNT * BigInt(USER_BP)) / 10000n;
const lpSharePerPenalty = (ATTACKER_PENALTY_AMOUNT * BigInt(LP_BP)) / 10000n;
const protocolSharePerPenalty = (ATTACKER_PENALTY_AMOUNT * BigInt(PROTOCOL_BP)) / 10000n;
const solverSharePerPenalty = (ATTACKER_PENALTY_AMOUNT * BigInt(SOLVER_BP)) / 10000n;

export const getPendingRewards = async (req: Request, res: Response) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: 'address required' });

  try {
    const penaltyRepo = AppDataSource.getRepository(AttackerPenalty);
    
    console.log(`[getPendingRewards] Fetching for user: ${address}`);
    
    // Get all penalties
    const allPenalties = await penaltyRepo.find();
    console.log(`[getPendingRewards] Found ${allPenalties.length} total penalties in DB`);
    
    const userAddressLower = address.toLowerCase();
    if (!claimedPenaltiesByUser[userAddressLower]) {
      claimedPenaltiesByUser[userAddressLower] = new Set();
    }
    
    // Get penalties this user hasn't claimed yet
    const unclaimedPenalties = allPenalties.filter(p => !claimedPenaltiesByUser[userAddressLower].has(p.id));
    
    // User earns 30% of each unclaimed penalty
    const pendingRewards = userSharePerPenalty * BigInt(unclaimedPenalties.length);
    const totalUserShare = userSharePerPenalty * BigInt(allPenalties.length);

    console.log(`[getPendingRewards] User ${address.slice(0, 8)}... | Total penalties: ${allPenalties.length} | Unclaimed: ${unclaimedPenalties.length} | Pending: ${ethers.formatEther(pendingRewards)}`);

    res.json({
      pending: pendingRewards.toString(),
      amountEth: ethers.formatEther(pendingRewards),
      totalPenalties: allPenalties.length,
      totalUserShare: totalUserShare.toString(),
      totalUserShareEth: ethers.formatEther(totalUserShare),
      unclaimedCount: unclaimedPenalties.length,
      claimedCount: claimedPenaltiesByUser[userAddressLower].size,
      perPenalty: {
        total: ATTACKER_PENALTY_AMOUNT.toString(),
        user: userSharePerPenalty.toString(),
        lp: lpSharePerPenalty.toString(),
        protocol: protocolSharePerPenalty.toString(),
        solver: solverSharePerPenalty.toString()
      }
    });
  } catch (err: any) {
    console.error('[getPendingRewards] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Alias for frontend compatibility (/api/rewards/:address)
export const getRewards = getPendingRewards;

export const claimRewards = async (req: Request, res: Response) => {
  const { claimer } = req.body;
  console.log('[claimRewards] Received claimer:', claimer);
  if (!claimer) return res.status(400).json({ error: 'claimer address required' });

  try {
    const penaltyRepo = AppDataSource.getRepository(AttackerPenalty);
    const claimRepo = AppDataSource.getRepository(RewardClaim);
    
    // Get all penalties
    const allPenalties = await penaltyRepo.find();
    
    const claimerLower = claimer.toLowerCase();
    console.log('[claimRewards] Claimer (lowercase):', claimerLower);
    if (!claimedPenaltiesByUser[claimerLower]) {
      claimedPenaltiesByUser[claimerLower] = new Set();
    }
    
    // Get unclaimed penalties for this user
    const unclaimedPenalties = allPenalties.filter(p => !claimedPenaltiesByUser[claimerLower].has(p.id));
    
    if (unclaimedPenalties.length === 0) {
      return res.status(400).json({ error: 'No unclaimed rewards available.' });
    }

    // User gets 30% of unclaimed penalties
    const userShare = userSharePerPenalty * BigInt(unclaimedPenalties.length);
    const amountWei = userShare.toString();

    const mockTxHash = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');
    console.log(`[claimRewards] User ${claimerLower} claiming ${ethers.formatEther(userShare)} ETH for ${unclaimedPenalties.length} penalties`);
    
    // Simulate claim delay
    await new Promise(r => setTimeout(r, 2000));

    const claim = claimRepo.create({ claimer: claimerLower, txHash: mockTxHash, amountWei });
    console.log('[claimRewards] Saving claim with claimer:', claimerLower);
    const savedClaim = await claimRepo.save(claim);
    console.log('[claimRewards] Saved claim:', savedClaim);
    
    // Mark these penalties as claimed by this user
    unclaimedPenalties.forEach(p => claimedPenaltiesByUser[claimerLower].add(p.id));

    res.json({ 
      txHash: mockTxHash, 
      status: 'claimed', 
      receiptStatus: 1, 
      amountWei, 
      amountEth: ethers.formatEther(userShare),
      penaltyCount: unclaimedPenalties.length 
    });
  } catch (err: any) {
    console.error('[claimRewards] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getRewardHistory = async (req: Request, res: Response) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: 'address required' });
  try {
    const repo = AppDataSource.getRepository(RewardClaim);
    const claims = await repo.find({ where: { claimer: address.toLowerCase() }, order: { createdAt: 'DESC' }, take: 25 });
    res.json(claims);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getRewardSummary = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const penaltyRepo = AppDataSource.getRepository(AttackerPenalty);
    const allPenalties = await penaltyRepo.find();
    const totalPenalties = allPenalties.length;

    const totalPot = ATTACKER_PENALTY_AMOUNT * BigInt(totalPenalties);
    const totals = {
      totalWei: totalPot.toString(),
      lpWei: (lpSharePerPenalty * BigInt(totalPenalties)).toString(),
      userWei: (userSharePerPenalty * BigInt(totalPenalties)).toString(),
      protocolWei: (protocolSharePerPenalty * BigInt(totalPenalties)).toString(),
      solverWei: (solverSharePerPenalty * BigInt(totalPenalties)).toString(),
    };

    const userShare = address
      ? {
          penalties: allPenalties.length,
          userWei: (userSharePerPenalty * BigInt(allPenalties.length)).toString(),
        }
      : undefined;

    res.json({ totalPenalties, totals, userShare });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPenaltyHistory = async (req: Request, res: Response) => {
  try {
    const penaltyRepo = AppDataSource.getRepository(AttackerPenalty);
    const penalties = await penaltyRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    res.json(penalties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};