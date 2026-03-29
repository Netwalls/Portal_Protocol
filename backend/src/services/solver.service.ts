// src/services/solver.service.ts
import { portal } from './contract.service';
import { AppDataSource } from '../db/data-source';
import { Intent } from '../entities/Intent';
import { AttackerPenalty } from '../entities/AttackerPenalty';
import { ethers } from 'ethers';

const ATTACKER_PENALTY = ethers.parseEther('0.05');

export const solverService = {
  async settle(intentHash: string, payload?: any) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const repo = AppDataSource.getRepository(Intent);
    const intent = await repo.findOne({ where: { intentHash } });
    if (!intent) throw new Error('Intent not found');
    if (intent.status !== 'Open') throw new Error('Intent is not open');

    // Wait for REVEAL_DELAY blocks to pass (1 block on Anvil ≈ 12 seconds)
    console.log('[settle] Waiting 15s for REVEAL_DELAY to pass...');
    await new Promise(r => setTimeout(r, 15000));

    const { revealed } = payload || {};

    // Simulate attacker penalty: ~40% chance of catching a frontrunner (realistic demo)
    const hasAttacker = Math.random() < 0.4;
    let mockAttackerAddress = ethers.ZeroAddress;
    if (hasAttacker) {
      mockAttackerAddress = ethers.Wallet.createRandom().address;
      const penaltyRepo = AppDataSource.getRepository(AttackerPenalty);
      const penalty = penaltyRepo.create({
        attacker: mockAttackerAddress,
        intentHash,
        penaltyWei: ATTACKER_PENALTY.toString()
      });
      await penaltyRepo.save(penalty);
      console.log(`🚨 [settle] ATTACKER CAUGHT! Address: ${mockAttackerAddress}`);
      console.log(`💰 [settle] Penalty: ${ethers.formatEther(ATTACKER_PENALTY)} ETH`);
    } else {
      console.log(`✅ [settle] Clean settlement — no frontrun detected`);
    }

    // Generate settlement tx hash
    const mockTxHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256'],
        [intentHash, mockAttackerAddress, BigInt(Date.now())]
      )
    );
    console.log('[settle] Settlement tx:', mockTxHash);

    // Calculate MEV (10% of input as captured MEV)
    const mevCaptured = revealed ? (BigInt(revealed.amountIn) * 10n) / 100n : 0n;
    
    await repo.update({ intentHash }, { status: 'Settled' });

    return { 
      txHash: mockTxHash, 
      receiptStatus: 1,
      mevCaptured: mevCaptured.toString(),
      userRebate: revealed ? ((mevCaptured * 3n) / 10n).toString() : '0',
      attackerPenalty: hasAttacker ? ATTACKER_PENALTY.toString() : '0'
    };
  }
};