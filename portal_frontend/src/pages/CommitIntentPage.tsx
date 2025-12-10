import React, { useContext, useRef, useState } from 'react';
import { AppContext } from '../components/Layout';
import { keccak256, AbiCoder, toBeHex, zeroPadValue } from 'ethers';

export default function CommitIntentPage() {
  const ctx = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const tokenInRef = useRef<HTMLInputElement>(null);
  const tokenOutRef = useRef<HTMLInputElement>(null);
  const amountInRef = useRef<HTMLInputElement>(null);
  const minOutRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);

  const handleCommit = async () => {
    if (!ctx?.account) {
      alert('Please connect wallet first');
      return;
    }

    const tokenIn = tokenInRef.current?.value || '';
    const tokenOut = tokenOutRef.current?.value || '';
    const amountIn = amountInRef.current?.value || '0';
    const minOut = minOutRef.current?.value || '0';
    const deadline = deadlineRef.current?.value || '720';

    if (!tokenIn.trim() || !tokenOut.trim()) {
      alert('Please enter token addresses');
      return;
    }

    if (!ctx.account || ctx.account === '0x0' || !ctx.account.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Invalid wallet account');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Generate random secret for commitment
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secret = '0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const payload = {
        tokenIn,
        tokenOut,
        amountIn,
        minOut,
        secret,
        user: ctx.account,
        deadline: Math.floor(Date.now() / 1000) + parseInt(deadline) * 13
      };

      console.log('[CommitIntentPage] Sending payload:', payload);

      // Call backend with full intent parameters
      const res = await fetch(`${ctx.backendUrl}/api/intent/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        console.error('[CommitIntentPage] Backend error:', errorData);
        throw new Error(`Backend error: ${errorData.error || res.statusText}`);
      }
      const data = await res.json();
      console.log('[CommitIntentPage] Success:', data);
      setResult(data);

      // Clear form
      if (tokenInRef.current) tokenInRef.current.value = '';
      if (tokenOutRef.current) tokenOutRef.current.value = '';
      if (amountInRef.current) amountInRef.current.value = '';
      if (minOutRef.current) minOutRef.current.value = '';

      alert(`Intent committed! Hash: ${data.intentHash}`);
    } catch (err: any) {
      console.error('Commit failed:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-xl font-semibold tracking-tight">Commit New Intent</h2>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Token In Address</label>
              <input ref={tokenInRef} type="text" defaultValue="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" placeholder="0x..." className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-xs font-mono" />
              <p className="text-xs text-neutral-500 mt-1">e.g. WETH on mainnet</p>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Token Out Address</label>
              <input ref={tokenOutRef} type="text" defaultValue="0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" placeholder="0x..." className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-xs font-mono" />
              <p className="text-xs text-neutral-500 mt-1">e.g. USDC on mainnet</p>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Amount In (wei)</label>
              <input ref={amountInRef} type="text" defaultValue="1000000000000000000" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-xs font-mono" />
              <p className="text-xs text-neutral-500 mt-1">1 token = 10^18 wei</p>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Minimum Amount Out (wei)</label>
              <input ref={minOutRef} type="text" defaultValue="1000000000000000000" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-xs font-mono" />
              <p className="text-xs text-neutral-500 mt-1">Minimum expected output</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">Deadline (blocks)</label>
            <input ref={deadlineRef} type="number" defaultValue={720} className="w-full max-w-xs rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm" />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button onClick={handleCommit} disabled={isLoading} className="inline-flex items-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm shadow-lg">
              <i data-lucide="lock" className="h-4 w-4"></i>
              {isLoading ? 'Committing...' : 'Commit Intent'}
            </button>
            <button onClick={() => { setResult(null); if (tokenInRef.current) tokenInRef.current.value = ''; }} className="text-neutral-400 hover:text-neutral-200">Clear</button>
          </div>

          {result && (
            <div className="mt-4 p-4 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-sm">
              <p className="font-semibold">✓ Success!</p>
              <p className="text-xs mt-1">Intent Hash: {result.intentHash}</p>
              <p className="text-xs mt-1">Tx: {result.txHash}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}