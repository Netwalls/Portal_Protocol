"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSolverStatus = exports.triggerSettlement = exports.registerSolver = void 0;
const contract_service_1 = require("../services/contract.service");
const solver_service_1 = require("../services/solver.service");
const client_1 = require("../prisma/client");
const registerSolver = async (req, res) => {
    try {
        const { stakeWei } = req.body;
        if (!stakeWei || stakeWei <= 0) {
            return res.status(400).json({ error: 'stakeWei is required and > 0' });
        }
        const portal = contract_service_1.contractService.portal;
        const tx = await portal.registerSolver({ value: stakeWei });
        const receipt = await tx.wait();
        // Optional: store solver stake
        await client_1.prisma.solver.upsert({
            where: { address: req.body.solverAddress || (await portal.runner.getAddress()) },
            update: { stakeWei },
            create: { address: req.body.solverAddress, stakeWei }
        });
        res.json({ txHash: tx.hash, status: 'registered' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.registerSolver = registerSolver;
const triggerSettlement = async (req, res) => {
    const { intentHash } = req.body;
    if (!intentHash)
        return res.status(400).json({ error: 'intentHash required' });
    try {
        await solver_service_1.solverService.settle(intentHash);
        res.json({ status: 'settlement triggered', intentHash });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.triggerSettlement = triggerSettlement;
const getSolverStatus = async (req, res) => {
    const { address } = req.params;
    try {
        const portal = contract_service_1.contractService.portal;
        const stake = await portal.solverStake(address);
        const db = await client_1.prisma.solver.findUnique({ where: { address } });
        res.json({ stake: stake.toString(), registered: !!db });
    }
    catch (err) {
        res.status(404).json({ error: 'Solver not found or not registered' });
    }
};
exports.getSolverStatus = getSolverStatus;
