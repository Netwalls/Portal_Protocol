// src/services/solver.service.ts
import { portal } from './contract.service';
import { Intent } from '../models/Intent';
import { AttackerPenalty } from '../models/AttackerPenalty';
import { ethers } from 'ethers';

const ATTACKER_PENALTY = ethers.parseEther('0.05');

export const solverService = {
  async settle(intentHash: string, payload?: any) {
    const intent = await Intent.findOne({ intentHash });
    if (!intent) throw new Error('Intent not found');
    if (intent.status !== 'Open') throw new Error('Intent is not open');

    console.log('[settle] Waiting 15s for REVEAL_DELAY to pass...');
    await new Promise(r => setTimeout(r, 15000));

    const { revealed } = payload || {};

    const hasAttacker = Math.random() < 0.4;
    let mockAttackerAddress = ethers.ZeroAddress;
    if (hasAttacker) {
      mockAttackerAddress = ethers.Wallet.createRandom().address;
      await AttackerPenalty.create({ attacker: mockAttackerAddress, intentHash, penaltyWei: ATTACKER_PENALTY.toString() });
      console.log(`🚨 [settle] ATTACKER CAUGHT! Address: ${mockAttackerAddress}`);
      console.log(`💰 [settle] Penalty: ${ethers.formatEther(ATTACKER_PENALTY)} ETH`);
    } else {
      console.log(`✅ [settle] Clean settlement — no frontrun detected`);
    }

    const mockTxHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256'],
        [intentHash, mockAttackerAddress, BigInt(Date.now())]
      )
    );
    console.log('[settle] Settlement tx:', mockTxHash);

    const mevCaptured = revealed ? (BigInt(revealed.amountIn) * 10n) / 100n : 0n;
    await Intent.updateOne({ intentHash }, { status: 'Settled' });

    return {
      txHash: mockTxHash,
      receiptStatus: 1,
      mevCaptured: mevCaptured.toString(),
      userRebate: revealed ? ((mevCaptured * 3n) / 10n).toString() : '0',
      attackerPenalty: hasAttacker ? ATTACKER_PENALTY.toString() : '0'
    };
  }
};