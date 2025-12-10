"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solverService = void 0;
// src/services/solver.service.ts
const contract_service_1 = require("./contract.service");
const schema_prisma_1 = require("../../prisma/schema.prisma");
exports.solverService = {
    async settle(intentHash) {
        const intent = await schema_prisma_1.prisma.intent.findUnique({ where: { intentHash } });
        if (!intent || intent.status !== 'Open')
            return;
        // Wait 1 block
        await new Promise(r => setTimeout(r, 13000));
        // TODO: decrypt + route via 1inch
        const revealed = { /* from decryption */};
        // use commitIntent on contractService because 'portal' property doesn't exist
        const tx = await contract_service_1.contractService.commitIntent(JSON.stringify(revealed), Math.floor(Date.now() / 1000) + 3600);
        await tx.wait();
        await schema_prisma_1.prisma.intent.update({
            where: { intentHash },
            data: { status: 'Settled' }
        });
    }
};
