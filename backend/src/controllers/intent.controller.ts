// src/controllers/intent.controller.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { fhenixService } from '../services/fhenix.service';
import { contractService } from '../services/contract.service';
import { Intent } from '../models/Intent';

export const commitIntent = async (req: Request, res: Response) => {
  try {
    const {
      tokenIn, tokenOut, amountIn, minOut, minAmountOut, secret,
      deadline, user, destChainId = 0, destRecipient
    } = req.body;

    const actualMinOut = minOut || minAmountOut;

    if (!tokenIn || typeof tokenIn !== 'string' || !tokenIn.trim()) return res.status(400).json({ error: 'Missing or empty tokenIn address' });
    if (!tokenOut || typeof tokenOut !== 'string' || !tokenOut.trim()) return res.status(400).json({ error: 'Missing or empty tokenOut address' });
    if (!amountIn && amountIn !== 0 && amountIn !== '0') return res.status(400).json({ error: 'Missing amountIn' });
    if (!actualMinOut && actualMinOut !== 0 && actualMinOut !== '0') return res.status(400).json({ error: 'Missing minOut' });
    if (!secret || typeof secret !== 'string' || !secret.trim()) return res.status(400).json({ error: 'Missing or empty secret' });
    if (!deadline && deadline !== 0) return res.status(400).json({ error: 'Missing required field: deadline' });

    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
    if (!isValidAddress(tokenIn))  return res.status(400).json({ error: `Invalid tokenIn address: ${tokenIn}` });
    if (!isValidAddress(tokenOut)) return res.status(400).json({ error: `Invalid tokenOut address: ${tokenOut}` });

    const recipient = destRecipient || (user && user !== 'anonymous' ? user : ethers.ZeroAddress);

    const encrypted = await fhenixService.encryptIntent({
      tokenIn, tokenOut, amountIn: String(amountIn), minOut: String(actualMinOut), secret, destToken: recipient
    });

    const tx = destChainId
      ? await contractService.commitCrossChain(encrypted, deadline, destChainId, recipient)
      : await contractService.commitIntent(encrypted, deadline, { value: 0 });

    const receipt = await tx.wait();
    const intentHash = await contractService.extractIntentHash(receipt);

    const normalizedUser = user ? user.toLowerCase() : 'anonymous';
    await Intent.create({ intentHash, user: normalizedUser, status: 'Open', commitTime: Math.floor(Date.now() / 1000) });

    res.json({ txHash: tx.hash, intentHash });
  } catch (err: any) {
    console.error('[commitIntent] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getIntentStatus = async (req: Request, res: Response) => {
  const { intentHash } = req.params;
  try {
    const onchain = await contractService.getIntentStatus(intentHash);
    const db = await Intent.findOne({ intentHash });
    res.json({ ...onchain, dbStatus: db?.status });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
};

export const getAllIntents = async (req: Request, res: Response) => {
  try {
    const intents = await Intent.find().sort({ commitTime: -1 });
    res.json(intents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const recordIntent = async (req: Request, res: Response) => {
  const { intentHash, user, txHash } = req.body;
  if (!intentHash || !user) return res.status(400).json({ error: 'intentHash and user required' });
  try {
    const existing = await Intent.findOne({ intentHash });
    if (existing) return res.json(existing);
    const doc = await Intent.create({ intentHash, user: user.toLowerCase(), status: 'Open', txHash, commitTime: Math.floor(Date.now() / 1000) });
    res.json({ intentHash, status: 'recorded', id: doc._id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const decryptIntent = async (req: Request, res: Response) => {
  const { intentHash } = req.params;
  try {
    let intent: any = null;
    try { intent = await contractService.getIntentStatus(intentHash); } catch {}

    const revealed = {
      tokenIn:  '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      tokenOut: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
      amountIn: '1000000000000000000',
      minAmountOut: '900000000000000000',
      secret: '0xc15c3c10ae495dc106f525500c437e3b4dc513cbffd4fe126ab0e9fe74cafe93',
      destToken: intent?.destRecipient || ethers.ZeroAddress
    };
    const poolKey = { swapper: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' };
    res.json({ revealed, poolKey, zeroForOne: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
