import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../components/Layout';
import { ethers } from 'ethers';

export default function SolverPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [result, setResult] = useState<string>('');
  const [intentStatus, setIntentStatus] = useState<any>(null);
  const stakeRef = useRef<HTMLInputElement>(null);
  const intentHashRef = useRef<HTMLInputElement>(null);

  const registerSolver = async () => {
    if (!ctx?.account) {
      alert('Please connect wallet first');
      return;
    }

    const stake = stakeRef.current?.value || '0.1';
    setIsRegistering(true);
    setResult('');

    try {
      const res = await fetch(`${ctx.backendUrl}/api/solver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solver: ctx.account,
          stake: ethers.parseEther(stake).toString()
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || res.statusText);
      }

      const data = await res.json();
      setResult(`✓ Registered as solver!\nTx: ${data.txHash}`);
      alert('Successfully registered as solver!');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setResult(`✗ Error: ${err.message}`);
      alert(`Failed to register: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const fetchIntentStatus = async () => {
    const intentHash = intentHashRef.current?.value?.trim();
    if (!intentHash) {
      alert('Please enter an intent hash');
      return;
    }

    setIsFetching(true);
    setIntentStatus(null);

    try {
      const res = await fetch(`${ctx?.backendUrl}/api/intent/${intentHash}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      
      const data = await res.json();
      setIntentStatus(data);
    } catch (err: any) {
      console.error('Fetch failed:', err);
      setIntentStatus({ error: err.message });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div data-view="solver" className="view space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-[20px] tracking-tight font-semibold text-neutral-100">Solver Dashboard</h2>
          <p className="text-neutral-400 text-sm mt-1">Register as solver and manage settlements from your infra.</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
            <div className="text-neutral-300 font-medium">Register Solver</div>
            <label className="block text-xs text-neutral-400 mb-1">Stake (ETH)</label>
            <input 
              ref={stakeRef}
              type="text" 
              defaultValue="0.005"
              placeholder="e.g. 0.005" 
              className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" 
            />
            <div className="flex items-center gap-2">
              <button 
                onClick={registerSolver}
                disabled={isRegistering}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 px-3 py-2 text-sm text-emerald-200"
              >
                {isRegistering ? 'Registering...' : 'Register Solver'}
              </button>
            </div>
            {result && (
              <div className="text-xs text-neutral-400 mt-2 p-2 bg-neutral-900/50 rounded border border-neutral-800 whitespace-pre-wrap">
                {result}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
            <div className="text-neutral-300 font-medium">Query Intent Status</div>
            <label className="block text-xs text-neutral-400 mb-1">Intent Hash</label>
            <div className="flex gap-2">
              <input 
                ref={intentHashRef}
                type="text" 
                placeholder="0x..." 
                className="flex-1 rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 font-mono" 
              />
              <button 
                onClick={fetchIntentStatus}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 px-3 py-2 text-sm text-neutral-200"
              >
                {isFetching ? 'Loading...' : 'Fetch'}
              </button>
            </div>
            {intentStatus && (
              <pre className="text-xs text-neutral-300 bg-neutral-900/50 border border-neutral-800 rounded-md p-3 overflow-auto max-h-48">
                {JSON.stringify(intentStatus, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
