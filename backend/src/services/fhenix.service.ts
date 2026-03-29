// src/services/fhenix.service.ts
import { FhenixClient } from 'fhenixjs';
import { ethers } from 'ethers';

let fhenixClient: FhenixClient | undefined;

async function getFhenixClient(): Promise<FhenixClient | undefined> {
  if (fhenixClient) return fhenixClient;
  try {
    const rpcUrl = process.env.FHENIX_RPC_URL;
    if (!rpcUrl) throw new Error('FHENIX_RPC_URL not set');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Verify the node is reachable before creating client
    await provider.getBlockNumber();

    fhenixClient = new FhenixClient({ provider } as any);
    console.log('[fhenixService] Connected to Fhenix Helium:', rpcUrl);
    return fhenixClient;
  } catch (err) {
    console.warn('[fhenixService] Fhenix client init failed, using keccak256 fallback:', (err as Error).message);
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
    // Validate and normalize addresses — lowercase first so ethers v6 accepts non-EIP55 mixed case
    const toAddr = (raw: string, label: string) => {
      try { return ethers.getAddress(raw.toLowerCase()); }
      catch { throw new Error(`Invalid ${label}: ${raw}`); }
    };
    const tokenIn   = toAddr(data.tokenIn,   'tokenIn');
    const tokenOut  = toAddr(data.tokenOut,  'tokenOut');
    const destToken = toAddr(data.destToken, 'destToken');
    const amountIn = BigInt(data.amountIn);
    const minOut   = BigInt(data.minOut);

    // Pack the full intent for commitment (used in fallback + as the on-chain commitment base)
    const packed = ethers.solidityPacked(
      ['address', 'address', 'uint256', 'uint256', 'bytes32', 'address'],
      [tokenIn, tokenOut, data.amountIn, data.minOut, data.secret, destToken]
    );

    // Try real Fhenix FHE encryption
    const client = await getFhenixClient();
    if (client) {
      try {
        // Encrypt amountIn — the MEV-sensitive value — as FHE uint128
        // This is what prevents frontrunners from knowing the swap size
        const encryptedAmount = await client.encrypt_uint128(amountIn);

        // Pack: FHE ciphertext (encrypted amountIn) + plaintext minOut + token addresses + secret hash
        // The encrypted amount is what gets committed on-chain; only the Fhenix network can decrypt it
        const cipherBytes = '0x' + Buffer.from(encryptedAmount.data).toString('hex');

        // Append remaining intent fields as ABI-encoded suffix so the contract can read them
        const suffix = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256', 'bytes32', 'address'],
          [tokenIn, tokenOut, minOut, data.secret, destToken]
        );

        const commitment = cipherBytes + suffix.slice(2); // strip 0x from suffix
        console.log('[fhenixService] Real FHE encryption applied. Ciphertext length:', encryptedAmount.data.length, 'bytes');
        return commitment;
      } catch (err) {
        console.warn('[fhenixService] encrypt_uint128 failed, falling back:', (err as Error).message);
      }
    }

    // Fallback: keccak256 of packed intent (deterministic, used for local/testing)
    console.warn('[fhenixService] Using keccak256 fallback (not real FHE)');
    return ethers.keccak256(packed);
  }
};
