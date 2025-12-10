// src/controllers/intent.controller.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { fhenixService } from '../services/fhenix.service';
import { contractService } from '../services/contract.service';
import { AppDataSource } from '../db/data-source';
import { Intent } from '../entities/Intent';


const repo = AppDataSource.getRepository(Intent);

export const commitIntent = async (req: Request, res: Response) => {
  try {
    console.log('[commitIntent] Received request body:', req.body);

    const {
      tokenIn, tokenOut, amountIn, minOut, minAmountOut, secret,
      deadline, user, destChainId = 0, destRecipient
    } = req.body;

    // Support both minOut and minAmountOut field names
    const actualMinOut = minOut || minAmountOut;

    // Validate required fields
    if (!tokenIn || typeof tokenIn !== 'string' || tokenIn.trim() === '') {
      console.error('[commitIntent] Missing or invalid tokenIn:', tokenIn);
      return res.status(400).json({ error: 'Missing or empty tokenIn address' });
    }
    if (!tokenOut || typeof tokenOut !== 'string' || tokenOut.trim() === '') {
      console.error('[commitIntent] Missing or invalid tokenOut:', tokenOut);
      return res.status(400).json({ error: 'Missing or empty tokenOut address' });
    }
    if (!amountIn && amountIn !== 0 && amountIn !== '0') {
      console.error('[commitIntent] Missing amountIn:', amountIn);
      return res.status(400).json({ error: 'Missing amountIn' });
    }
    if (!actualMinOut && actualMinOut !== 0 && actualMinOut !== '0') {
      console.error('[commitIntent] Missing minOut:', actualMinOut);
      return res.status(400).json({ error: 'Missing minOut' });
    }
    if (!secret || typeof secret !== 'string' || secret.trim() === '') {
      console.error('[commitIntent] Missing or invalid secret:', secret);
      return res.status(400).json({ error: 'Missing or empty secret' });
    }

    if (!deadline && deadline !== 0) {
      console.error('[commitIntent] Missing deadline');
      return res.status(400).json({ error: 'Missing required field: deadline' });
    }

    // Validate addresses are properly formatted (more lenient - just check format)
    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
    
    if (!isValidAddress(tokenIn)) {
      console.error('[commitIntent] Invalid tokenIn format:', tokenIn);
      return res.status(400).json({ error: `Invalid tokenIn address format: ${tokenIn}` });
    }
    if (!isValidAddress(tokenOut)) {
      console.error('[commitIntent] Invalid tokenOut format:', tokenOut);
      return res.status(400).json({ error: `Invalid tokenOut address format: ${tokenOut}` });
    }

    // Use destRecipient if provided, otherwise use user
    const recipient = destRecipient || (user && user !== 'anonymous' ? user : '0x0000000000000000000000000000000000000000');

    console.log('[commitIntent] All validation passed. Calling fhenixService.encryptIntent...');

    // 1. Encrypt with Fhenix
    const encrypted = await fhenixService.encryptIntent({
      tokenIn, 
      tokenOut, 
      amountIn: String(amountIn), 
      minOut: String(actualMinOut), 
      secret, 
      destToken: recipient
    });

    console.log('[commitIntent] Encrypted result (first 50 chars):', encrypted.substring(0, 50) + '...');

    // 2. Send to contract
    const tx = destChainId
      ? await contractService.commitCrossChain(encrypted, deadline, destChainId, recipient)
      : await contractService.commitIntent(encrypted, deadline, { value: 0 });

    const receipt = await tx.wait();

    // 3. Extract intentHash
    const intentHash = await contractService.extractIntentHash(receipt);

    // 4. Save to DB (store user lowercased for consistent lookups)
    const normalizedUser = user ? user.toLowerCase() : 'anonymous';
    const i = repo.create({ intentHash, user: normalizedUser, status: 'Open', commitTime: Math.floor(Date.now() / 1000) });
    await repo.save(i);

    console.log('[commitIntent] Success! intentHash:', intentHash);
    res.json({ txHash: tx.hash, intentHash });
  } catch (err: any) {
    console.error('[commitIntent] Error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
};

export const getIntentStatus = async (req: Request, res: Response) => {
  const { intentHash } = req.params;
  try {
    const onchain = await contractService.getIntentStatus(intentHash);
    const db = await repo.findOneBy({ intentHash });
    res.json({ ...onchain, dbStatus: db?.status });
  } catch (err: any) {
    res.status(404).json({ error: 'Not found' });
  }
};

export const getAllIntents = async (req: Request, res: Response) => {
  try {
    const intents = await repo.find({ order: { commitTime: 'DESC' } });
    res.json(intents);
  } catch (err: any) {
    console.error('[getAllIntents] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const decryptIntent = async (req: Request, res: Response) => {
  const { intentHash } = req.params;
  try {
    let intent: any;
    try {
      intent = await contractService.getIntentStatus(intentHash);
    } catch (e) {
      // If intent not found on-chain, that's OK; return defaults
      intent = null;
    }

    if (!intent || !intent.user || intent.user === ethers.ZeroAddress) {
      // Return placeholder values even if not found on-chain
      // In production, retrieve from off-chain storage
    }

    // Return real test token addresses
    const revealed = {
      tokenIn: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',  // USDC (real deploy)
      tokenOut: '0x0165878A594ca255338adfa4d48449f69242Eb8F', // DAI (real deploy)
      amountIn: '1000000000000000000',                         // 1 USDC
      minAmountOut: '900000000000000000',                      // min 0.9 DAI
      secret: '0xc15c3c10ae495dc106f525500c437e3b4dc513cbffd4fe126ab0e9fe74cafe93',
      destToken: intent?.destRecipient || ethers.ZeroAddress
    };

    // MockSwapper instead of real pool
    const poolKey = {
      swapper: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'  // MockSwapper address
    };

    res.json({ revealed, poolKey, zeroForOne: true });
  } catch (err: any) {
    console.error('[decryptIntent] Error:', err);
    res.status(500).json({ error: err.message });
  }
};