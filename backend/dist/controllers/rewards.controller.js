"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimRewards = exports.getPendingRewards = void 0;
const contract_service_1 = require("../services/contract.service");
const ethers_1 = require("ethers");
const getPendingRewards = async (req, res) => {
    const { address } = req.params;
    if (!address)
        return res.status(400).json({ error: 'address required' });
    try {
        const rewards = await contract_service_1.contractService.portal.pendingRewards(address);
        res.json({
            amountWei: rewards.toString(),
            amountEth: ethers_1.ethers.formatEther(rewards)
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getPendingRewards = getPendingRewards;
const claimRewards = async (req, res) => {
    const { address } = req.body;
    if (!address)
        return res.status(400).json({ error: 'address required' });
    try {
        const tx = await contract_service_1.contractService.portal.claimRewards({ from: address });
        const receipt = await tx.wait();
        res.json({ txHash: tx.hash, status: 'claimed' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.claimRewards = claimRewards;
