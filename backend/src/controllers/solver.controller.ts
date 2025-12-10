// src/controllers/solver.controller.ts
import { Request, Response } from 'express';
import { portal } from '../services/contract.service';
import { solverService } from '../services/solver.service';
// import { prisma } from '../prisma/client';

export const registerSolver = async (req: Request, res: Response) => {
  try {
    const { stake, solver } = req.body;
    
    console.log('[registerSolver] Request:', { stake, solver });
    
    if (!stake) {
      return res.status(400).json({ error: 'stake (in wei) is required' });
    }

    console.log('[registerSolver] Calling contract.registerSolver with value:', stake);
    
    const tx = await portal.registerSolver({ value: stake });
    console.log('[registerSolver] TX hash:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('[registerSolver] TX confirmed, status:', receipt.status);

    const signerAddress = portal.runner && 'getAddress' in portal.runner 
      ? await (portal.runner as any).getAddress() 
      : 'unknown';
    
    res.json({ 
      txHash: tx.hash, 
      status: 'registered',
      solver: solver || signerAddress
    });
  } catch (err: any) {
    console.error('[registerSolver] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const triggerSettlement = async (req: Request, res: Response) => {
  const { intentHash, revealed, poolKey, zeroForOne } = req.body;
  if (!intentHash) return res.status(400).json({ error: 'intentHash required' });

  try {
    const result = await solverService.settle(intentHash, { revealed, poolKey, zeroForOne });
    res.json({ status: 'settlement submitted', intentHash, ...result });
  } catch (err: any) {
    const message = err?.message || 'Settlement failed';
    res.status(500).json({ error: message });
  }
};

export const getSolverStatus = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const stake = await portal.solverBonds(address);
    // const db = await prisma.solver.findUnique({ where: { address } });
    // res.json({ stake: stake.toString(), registered: !!db });

        res.json({ stake: stake.toString(), registered: stake > 0n });
  } catch (err: any) {
    res.status(404).json({ error: 'Solver not found or not registered' });
  }
};