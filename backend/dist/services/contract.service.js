"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractService = exports.portal = void 0;
// src/services/contract.service.ts
const ethers_1 = require("ethers");
const portal_1 = require("../abi/portal");
const data_source_1 = require("../db/data-source");
const Intent_1 = require("../entities/Intent");
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = process.env.PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider) : undefined;
const portalAddress = process.env.PORTAL_ADDRESS;
if (!portalAddress) {
    console.error('Missing environment variable: PORTAL_ADDRESS. Set PORTAL_ADDRESS to the deployed PortalHook contract address.');
    throw new Error('PORTAL_ADDRESS environment variable is required');
}
exports.portal = new ethers_1.ethers.Contract(portalAddress, portal_1.portalABI, wallet ?? provider);
exports.contractService = {
    async commitIntent(encrypted, deadline) {
        return exports.portal.commitIntent(encrypted, deadline);
    },
    async commitCrossChain(encrypted, deadline, chainId, recipient) {
        // Some contract builds name this method `commitCrossChain`, others `commitCrossChainIntent`.
        // Try both to be resilient to ABI variations.
        try {
            if (exports.portal.commitCrossChain)
                return exports.portal.commitCrossChain(encrypted, deadline, chainId, recipient);
            if (exports.portal.commitCrossChainIntent)
                return exports.portal.commitCrossChainIntent(encrypted, deadline, chainId, recipient);
            throw new Error('commitCrossChain method not found on Portal contract');
        }
        catch (err) {
            throw err;
        }
    },
    extractIntentHash(receipt) {
        for (const log of receipt.logs) {
            try {
                const parsed = exports.portal.interface.parseLog(log);
                if (parsed && parsed.name === 'IntentCommitted')
                    return parsed.args.intentHash;
            }
            catch { }
        }
        throw new Error('IntentCommitted event not found');
    },
    async getIntentStatus(intentHash) {
        return exports.portal.getIntentStatus(intentHash);
    }
};
// Listen for events and persist to DB. This module is imported after DB init in src/index.ts
exports.portal.on('IntentCommitted', async (intentHash, user, intentType, destChainId, deadline, event) => {
    try {
        console.log(`[EVENT] IntentCommitted ${intentHash} by ${user}`);
        if (!data_source_1.AppDataSource.isInitialized) {
            console.warn('DB not initialized yet — skipping IntentCommitted persistence');
            return;
        }
        const repo = data_source_1.AppDataSource.getRepository(Intent_1.Intent);
        // idempotent create: avoid duplicate by intentHash
        const existing = await repo.findOneBy({ intentHash: intentHash.toString() });
        if (existing)
            return;
        const i = repo.create({ intentHash: intentHash.toString(), user: user.toString(), status: 'Open', commitTime: Math.floor(Date.now() / 1000) });
        await repo.save(i);
    }
    catch (err) {
        console.error('Error handling IntentCommitted event', err);
    }
});
exports.portal.on('IntentSettled', async (intentHash, solver, inputAmount, outputAmount, mevCaptured, userRebate, event) => {
    try {
        console.log(`[EVENT] IntentSettled ${intentHash} by solver ${solver}`);
        if (!data_source_1.AppDataSource.isInitialized) {
            console.warn('DB not initialized yet — skipping IntentSettled persistence');
            return;
        }
        const repo = data_source_1.AppDataSource.getRepository(Intent_1.Intent);
        const existing = await repo.findOneBy({ intentHash: intentHash.toString() });
        if (existing) {
            existing.status = 'Settled';
            await repo.save(existing);
        }
    }
    catch (err) {
        console.error('Error handling IntentSettled event', err);
    }
});
