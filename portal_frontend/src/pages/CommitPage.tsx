import React, { useContext, useState } from 'react';
import { AbiCoder, keccak256 } from 'ethers';
import { AppContext } from '../components/Layout';

// Hardcoded token list with addresses
const TOKENS = [
  { name: 'ETH', symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
  { name: 'USDC', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { name: 'USDT', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { name: 'DAI', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { name: 'WETH', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
];

export default function CommitPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [tokenIn, setTokenIn] = useState(TOKENS[0].address);
  const [tokenOut, setTokenOut] = useState(TOKENS[1].address);
  const [amountIn, setAmountIn] = useState('1000000000000000000');
  const [minAmountOut, setMinAmountOut] = useState('900000000000000000');
  const [secret, setSecret] = useState('');
  const [commitment, setCommitment] = useState('');
  const [deadlineMins, setDeadlineMins] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generateSecret = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const sec = '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    setSecret(sec);
  };

  const computeCommitment = async () => {
    if (!secret) {
      alert('Generate secret first');
      return;
    }
    if (!ctx?.account) {
      alert('Please connect wallet first');
      return;
    }
    try {
      const deadline = Math.floor(Date.now() / 1000) + deadlineMins * 60;
      const abi = new AbiCoder();
      const encoded = abi.encode(
        ['address', 'address', 'uint256', 'uint256', 'bytes32', 'address'],
        [tokenIn, tokenOut, amountIn, minAmountOut, secret, ctx.account]
      );
      const hash = keccak256(encoded);
      setCommitment(hash);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const submitToBackend = async () => {
    if (!ctx?.account || !commitment) {
      alert('Connect wallet and compute commitment first');
      return;
    }
    setIsLoading(true);
    try {
      const deadline = Math.floor(Date.now() / 1000) + deadlineMins * 60;
      // Send raw params and secret so backend can encrypt with Fhenix
      const res = await fetch(`${ctx.backendUrl}/api/intent/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amountIn,
          minAmountOut,
          secret,
          deadline,
          user: ctx.account
        })
      });
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      const data = await res.json();
      setResult(data);
      alert(`✓ Success!\n\nIntent Hash: ${data.intentHash}\nTx: ${data.txHash}`);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenName = (addr: string) => {
    return TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.symbol || 'Token';
  };

  return (
    <div data-view="commit" className="view space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-[20px] tracking-tight font-semibold text-neutral-100">Commit Intent</h2>
          <p className="text-neutral-400 text-sm mt-1">Generate and submit a commitment. Keep the secret private.</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Token In</label>
                <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100">
                  {TOKENS.map(t => (
                    <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Token Out</label>
                <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100">
                  {TOKENS.map(t => (
                    <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Amount In (wei)</label>
                <input type="text" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} placeholder="e.g. 1000000000000000000" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Min Amount Out (wei)</label>
                <input type="text" value={minAmountOut} onChange={(e) => setMinAmountOut(e.target.value)} placeholder="e.g. 990000000000000000" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Secret (bytes32)</label>
              <div className="flex gap-2">
                <input type="text" value={secret} placeholder="0x..." className="flex-1 rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" readOnly />
                <button onClick={generateSecret} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Generate</button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Stored locally only. Do not share.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Deadline (minutes)</label>
                <input type="number" min="1" value={deadlineMins} onChange={(e) => setDeadlineMins(parseInt(e.target.value))} className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" />
              </div>
            </div>

            <button onClick={computeCommitment} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200">Compute Commitment</button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-2">Commitment Hash</div>
              <div className="break-all text-xs text-emerald-400 font-mono">{commitment || '-'}</div>
            </div>
            
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-2">Swap Route</div>
              <div className="text-sm text-neutral-100">{getTokenName(tokenIn)} → {getTokenName(tokenOut)}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={submitToBackend} disabled={isLoading || !commitment} className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 px-3 py-2.5 text-sm text-emerald-200 font-medium">
                {isLoading ? 'Submitting...' : 'Submit to Backend'}
              </button>
            </div>

            {result && (
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 p-3">
                <div className="text-xs text-emerald-300 font-semibold mb-2">✓ Committed!</div>
                <div className="text-xs font-mono text-neutral-300 break-all">{result.intentHash}</div>
                <div className="text-xs text-amber-300 mt-2 font-semibold">⚠️ Save your secret:</div>
                <div className="text-xs font-mono text-amber-200 break-all mt-1">{secret}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
