"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fhenixService = void 0;
// src/services/fhenix.service.ts
const fhenixjs_1 = require("fhenixjs");
const ethers_1 = require("ethers");
let fhenixClient;
async function getFhenixClient() {
    if (fhenixClient)
        return fhenixClient;
    try {
        // Try to initialize using RPC provider or web3 provider if available
        const providerUrl = process.env.FHENIX_RPC_URL || process.env.RPC_URL;
        const provider = providerUrl ? new ethers_1.ethers.JsonRpcProvider(providerUrl) : undefined;
        fhenixClient = new fhenixjs_1.FhenixClient({ provider, rpcUrl: providerUrl, chainId: Number(process.env.FHENIX_CHAIN_ID || process.env.CHAIN_ID || 69000) });
        return fhenixClient;
    }
    catch (err) {
        console.warn('Fhenix client init failed, falling back to local shim:', err.message);
        fhenixClient = undefined;
        return undefined;
    }
}
exports.fhenixService = {
    async encryptIntent(data) {
        // Pack data (keccak256 hash for commitment)
        const packed = ethers_1.ethers.solidityPacked(['address', 'address', 'uint256', 'uint256', 'bytes32', 'address'], [data.tokenIn, data.tokenOut, data.amountIn, data.minOut, data.secret, data.destToken]);
        const client = await getFhenixClient();
        if (client && typeof client.encrypt_uint128 === 'function') {
            try {
                const encrypted = await client.encrypt_uint128(packed);
                // normalize to Uint8Array if needed
                if (encrypted instanceof Uint8Array)
                    return '0x' + Buffer.from(encrypted).toString('hex');
                if (typeof encrypted === 'string')
                    return encrypted.startsWith('0x') ? encrypted : '0x' + Buffer.from(encrypted).toString('hex');
                if (Array.isArray(encrypted))
                    return '0x' + Buffer.from(Uint8Array.from(encrypted)).toString('hex');
                // last resort: stringify
                return '0x' + Buffer.from(String(encrypted)).toString('hex');
            }
            catch (err) {
                console.warn('Fhenix encrypt failed, falling back to local hash:', err.message);
            }
        }
        // Fallback shim: return keccak256 of packed so we at least return deterministic bytes for local testing.
        const hash = ethers_1.ethers.keccak256(packed);
        return hash;
    }
};
