"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntentStatus = exports.commitIntent = void 0;
const fhenix_service_1 = require("../services/fhenix.service");
const contract_service_1 = require("../services/contract.service");
const data_source_1 = require("../db/data-source");
const Intent_1 = require("../entities/Intent");
const repo = data_source_1.AppDataSource.getRepository(Intent_1.Intent);
const commitIntent = async (req, res) => {
    try {
        const { tokenIn, tokenOut, amountIn, minOut, secret, deadline, destChainId = 0, destRecipient = '0x0000000000000000000000000000000000000000' } = req.body;
        // 1. Encrypt with Fhenix
        const encrypted = await fhenix_service_1.fhenixService.encryptIntent({
            tokenIn, tokenOut, amountIn, minOut, secret, destToken: destRecipient
        });
        // 2. Send to contract
        const tx = destChainId
            ? await contract_service_1.contractService.commitCrossChain(encrypted, deadline, destChainId, destRecipient)
            : await contract_service_1.contractService.commitIntent(encrypted, deadline);
        const receipt = await tx.wait();
        // 3. Extract intentHash
        const intentHash = contract_service_1.contractService.extractIntentHash(receipt);
        // 4. Save to DB
        const i = repo.create({ intentHash, user: req.body.user || 'anonymous', status: 'Open', commitTime: Math.floor(Date.now() / 1000) });
        await repo.save(i);
        res.json({ txHash: tx.hash, intentHash });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.commitIntent = commitIntent;
const getIntentStatus = async (req, res) => {
    const { intentHash } = req.params;
    try {
        const onchain = await contract_service_1.contractService.getIntentStatus(intentHash);
        const db = await repo.findOneBy({ intentHash });
        res.json({ ...onchain, dbStatus: db?.status });
    }
    catch (err) {
        res.status(404).json({ error: 'Not found' });
    }
};
exports.getIntentStatus = getIntentStatus;
