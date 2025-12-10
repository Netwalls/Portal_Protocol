// src/services/contract.service.ts
import 'dotenv/config';
import { ethers } from 'ethers';
import { portalABI } from '../abi/portal';
import { AppDataSource } from '../db/data-source';
import { Intent } from '../entities/Intent';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider) : undefined;

const portalAddress = process.env.PORTAL_ADDRESS;
if (!portalAddress) {
  console.error('Missing environment variable: PORTAL_ADDRESS. Set PORTAL_ADDRESS to the deployed PortalHook contract address.');
  throw new Error('PORTAL_ADDRESS environment variable is required');
}

export const portal = new ethers.Contract(portalAddress, portalABI, wallet ?? provider);

async function deriveIntentHashFromTx(receipt: ethers.TransactionReceipt): Promise<string | null> {
  try {
    if (!receipt?.hash) return null;

    const tx = await provider.getTransaction(receipt.hash);
    if (!tx) {
      console.warn('[extractIntentHash] No transaction found for receipt.hash', receipt.hash);
      return null;
    }

    // Decode calldata to recover the commitment we originally sent.
    const parsed = portal.interface.parseTransaction({ data: tx.data, value: tx.value });
    if (!parsed || parsed.name !== 'commitIntent') {
      console.warn(`[extractIntentHash] Parsed tx is not commitIntent (got ${parsed?.name})`);
      return null;
    }

    const encrypted = parsed.args?.[0] as string | undefined;
    if (!encrypted) {
      console.warn('[extractIntentHash] Parsed tx missing encrypted arg');
      return null;
    }

    // Fallback derivation only works when commitment is a raw 32-byte value (local hash path).
    if (ethers.dataLength(encrypted) !== 32) {
      console.warn('[extractIntentHash] Encrypted commitment is not 32 bytes; cannot derive intentHash without event');
      return null;
    }

    const sender = tx.from ?? receipt.from;
    if (!sender) {
      console.warn('[extractIntentHash] Missing sender on tx/receipt; cannot derive intentHash');
      return null;
    }

    // userNonces is incremented in commitIntent, so subtract 1 to get the nonce used in the hash.
    let usedNonce = 0n;
    try {
      const currentNonceRaw = await (portal as any).userNonces(sender);
      const currentNonce = BigInt(currentNonceRaw?.toString?.() ?? currentNonceRaw ?? 0);
      usedNonce = currentNonce > 0n ? currentNonce - 1n : 0n;
    } catch (err) {
      console.warn('[extractIntentHash] Could not read userNonces; defaulting nonce to 0 for derivation:', (err as Error).message);
    }

    const chainId = BigInt((await provider.getNetwork()).chainId);
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256', 'uint256'],
      [encrypted, sender, usedNonce, chainId]
    );

    const intentHash = ethers.keccak256(encoded);
    console.log(`[extractIntentHash] Derived intentHash from calldata: ${intentHash}`);
    return intentHash;
  } catch (err) {
    console.warn('[extractIntentHash] Fallback derivation failed:', (err as Error).message);
    return null;
  }
}

export const contractService = {
  async commitIntent(encrypted: string, deadline: number, p0: { value: any; }) {
    console.log(`[commitIntent] Calling with encrypted.length=${encrypted.length}, deadline=${deadline}`);

    // Convert hex string to bytes if needed
    const encryptedBytes = encrypted.startsWith('0x') ? encrypted : `0x${encrypted}`;
    console.log(`[commitIntent] Sending tx with encryptedBytes.length=${encryptedBytes.length}`);
    
    const tx = await portal.commitIntent(encryptedBytes, deadline);
    console.log(`[commitIntent] TX hash: ${tx.hash}`);
    return tx;
  },

  async commitCrossChain(encrypted: string, deadline: number, chainId: number, recipient: string) {
    const encryptedBytes = encrypted.startsWith('0x') ? encrypted : `0x${encrypted}`;
    try {
      if ((portal as any).commitCrossChain) return (portal as any).commitCrossChain(encryptedBytes, deadline, chainId, recipient);
      if ((portal as any).commitCrossChainIntent) return (portal as any).commitCrossChainIntent(encryptedBytes, deadline, chainId, recipient);
      throw new Error('commitCrossChain method not found on Portal contract');
    } catch (err) {
      throw err;
    }
  },

  async extractIntentHash(receipt: ethers.TransactionReceipt): Promise<string> {
    console.log(`[extractIntentHash] Receipt status: ${receipt?.status}, logs count: ${receipt?.logs?.length || 0}`);
    
    if (!receipt || !receipt.logs || receipt.logs.length === 0) {
      console.warn('[extractIntentHash] No logs in receipt; attempting fallback derivation');
      const derived = await deriveIntentHashFromTx(receipt);
      if (derived) return derived;
      throw new Error('No logs in receipt');
    }

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      try {
        console.log(`[extractIntentHash] Parsing log ${i}:`, log.topics[0]);
        const parsed = portal.interface.parseLog(log);
        console.log(`[extractIntentHash] Parsed event: ${parsed?.name}`);
        if (parsed && parsed.name === 'IntentCommitted') {
          console.log(`[extractIntentHash] Found IntentCommitted:`, parsed.args.intentHash);
          return parsed.args.intentHash;
        }
      } catch (e) {
        console.log(`[extractIntentHash] Log ${i} parse failed (expected for non-PortalHook events):`, (e as Error).message);
      }
    }
    console.warn('[extractIntentHash] IntentCommitted event not found; attempting fallback derivation');
    const derived = await deriveIntentHashFromTx(receipt);
    if (derived) return derived;
    throw new Error('IntentCommitted event not found in any log');
  },

  async getIntentStatus(intentHash: string) {
    // Contract has a public mapping `intents`; there is no dedicated getter.
    const intent = await (portal as any).intents(intentHash);

    // Destructure to clarify fields returned by the Solidity Intent struct.
    const [
      commitment,
      user,
      intentType,
      deadline,
      commitTime,
      nonce,
      status,
      destChainId,
      destRecipient
    ] = intent;

    // If never set, we expect zero commitment/user/commitTime.
    if (
      commitment === ethers.ZeroHash &&
      user === ethers.ZeroAddress &&
      Number(commitTime) === 0
    ) {
      throw new Error('Intent not found');
    }

    return {
      commitment,
      user,
      intentType: Number(intentType),
      deadline: Number(deadline),
      commitTime: Number(commitTime),
      nonce: Number(nonce),
      status: Number(status), // maps to IntentStatus enum
      destChainId: destChainId?.toString?.() ?? String(destChainId),
      destRecipient
    };
  }
};

// Listen for events and persist to DB. This module is imported after DB init in src/index.ts
portal.on('IntentCommitted', async (intentHash: string, user: string, intentType: any, destChainId: any, deadline: any, event: any) => {
  try {
    console.log(`[EVENT] IntentCommitted ${intentHash} by ${user}`);
    if (!AppDataSource.isInitialized) {
      console.warn('DB not initialized yet — skipping IntentCommitted persistence');
      return;
    }
    const repo = AppDataSource.getRepository(Intent);
    // idempotent create: avoid duplicate by intentHash
    const existing = await repo.findOneBy({ intentHash: intentHash.toString() });
    if (existing) return;
    const userLc = user.toString().toLowerCase();
    const i = repo.create({ intentHash: intentHash.toString(), user: userLc, status: 'Open', commitTime: Math.floor(Date.now() / 1000) });
    await repo.save(i);
  } catch (err) {
    console.error('Error handling IntentCommitted event', err);
  }
});

portal.on('IntentSettled', async (intentHash: string, solver: string, inputAmount: any, outputAmount: any, mevCaptured: any, userRebate: any, event: any) => {
  try {
    console.log(`[EVENT] IntentSettled ${intentHash} by solver ${solver}`);
    if (!AppDataSource.isInitialized) {
      console.warn('DB not initialized yet — skipping IntentSettled persistence');
      return;
    }
    const repo = AppDataSource.getRepository(Intent);
    const existing = await repo.findOneBy({ intentHash: intentHash.toString() });
    if (existing) {
      existing.status = 'Settled';
      await repo.save(existing);
    }
  } catch (err) {
    console.error('Error handling IntentSettled event', err);
  }
});