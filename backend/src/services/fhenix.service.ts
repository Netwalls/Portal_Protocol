// src/services/fhenix.service.ts
import { FhenixClient } from 'fhenixjs';
import { ethers } from 'ethers';

let fhenixClient: any | undefined;

async function getFhenixClient(): Promise<any | undefined> {
  if (fhenixClient) return fhenixClient;
  try {
    // Try to initialize using RPC provider or web3 provider if available
    const providerUrl = process.env.FHENIX_RPC_URL || process.env.RPC_URL;
    const provider = providerUrl ? new ethers.JsonRpcProvider(providerUrl) : undefined;
    fhenixClient = new FhenixClient({ provider, rpcUrl: providerUrl, chainId: Number(process.env.FHENIX_CHAIN_ID || process.env.CHAIN_ID || 69000) } as any);
    return fhenixClient;
  } catch (err) {
    console.warn('Fhenix client init failed, falling back to local shim:', (err as Error).message);
    fhenixClient = undefined;
    return undefined;
  }
}

export const fhenixService = {
  async encryptIntent(data: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minOut: string;
    secret: string;
    destToken: string;
  }) {
    console.log('[fhenixService.encryptIntent] Input data:', {
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amountIn,
      minOut: data.minOut,
      secret: data.secret,
      destToken: data.destToken
    });

    // Validate all addresses before packing
    if (!data.tokenIn || !ethers.isAddress(data.tokenIn)) {
      throw new Error(`Invalid or missing tokenIn address: ${data.tokenIn}`);
    }
    if (!data.tokenOut || !ethers.isAddress(data.tokenOut)) {
      throw new Error(`Invalid or missing tokenOut address: ${data.tokenOut}`);
    }
    if (!data.destToken || !ethers.isAddress(data.destToken)) {
      throw new Error(`Invalid or missing destToken address: ${data.destToken}`);
    }

    // Normalize addresses to checksummed format
    const tokenIn = ethers.getAddress(data.tokenIn);
    const tokenOut = ethers.getAddress(data.tokenOut);
    const destToken = ethers.getAddress(data.destToken);

    console.log('[fhenixService.encryptIntent] Normalized addresses:', {
      tokenIn,
      tokenOut,
      destToken
    });

    // Validate numeric values
    try {
      const amountInBig = BigInt(data.amountIn);
      const minOutBig = BigInt(data.minOut);
      console.log('[fhenixService.encryptIntent] Valid numeric values:', {
        amountIn: amountInBig.toString(),
        minOut: minOutBig.toString()
      });
    } catch (e) {
      throw new Error(`Invalid numeric values: amountIn=${data.amountIn}, minOut=${data.minOut}. Error: ${(e as Error).message}`);
    }

    // Pack data (keccak256 hash for commitment)
    console.log('[fhenixService.encryptIntent] Packing data for solidityPacked...');
    const packed = ethers.solidityPacked(
      ['address', 'address', 'uint256', 'uint256', 'bytes32', 'address'],
      [tokenIn, tokenOut, data.amountIn, data.minOut, data.secret, destToken]
    );

    console.log('[fhenixService.encryptIntent] Packed successfully:', packed.substring(0, 50) + '...');

    const client = await getFhenixClient();
    if (client && typeof client.encrypt_uint128 === 'function') {
      try {
        const encrypted = await client.encrypt_uint128(packed);
        // normalize to Uint8Array if needed
        if (encrypted instanceof Uint8Array) return '0x' + Buffer.from(encrypted).toString('hex');
        if (typeof encrypted === 'string') return encrypted.startsWith('0x') ? encrypted : '0x' + Buffer.from(encrypted).toString('hex');
        if (Array.isArray(encrypted)) return '0x' + Buffer.from(Uint8Array.from(encrypted as number[])).toString('hex');
        // last resort: stringify
        return '0x' + Buffer.from(String(encrypted)).toString('hex');
      } catch (err) {
        console.warn('Fhenix encrypt failed, falling back to local hash:', (err as Error).message);
      }
    }

    // Fallback shim: return keccak256 of packed so we at least return deterministic bytes for local testing.
    const hash = ethers.keccak256(packed);
    return hash;
  }
};