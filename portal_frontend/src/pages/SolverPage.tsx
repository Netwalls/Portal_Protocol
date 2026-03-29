import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../components/Layout';
import { ethers } from 'ethers';

type ToastType = 'ok' | 'err';

export default function SolverPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isFetching, setIsFetching]       = useState(false);
  const [registerResult, setRegisterResult] = useState<{ txHash: string; solver: string } | null>(null);
  const [intentStatus, setIntentStatus]   = useState<any>(null);
  const [toast, setToast]                 = useState<{ type: ToastType; msg: string } | null>(null);
  const stakeRef      = useRef<HTMLInputElement>(null);
  const intentHashRef = useRef<HTMLInputElement>(null);

  const showToast = (type: ToastType, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const registerSolver = async () => {
    if (!ctx?.account) { showToast('err', 'Connect your wallet first'); return; }
    const stake = stakeRef.current?.value || '0.005';
    setIsRegistering(true);
    setRegisterResult(null);
    try {
      const res = await fetch(`${ctx.backendUrl}/api/solver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solver: ctx.account, stake: ethers.parseEther(stake).toString() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setRegisterResult(data);
      showToast('ok', `Registered as solver with ${stake} ETH stake`);
    } catch (e: any) {
      showToast('err', e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const fetchIntentStatus = async () => {
    const hash = intentHashRef.current?.value?.trim();
    if (!hash) { showToast('err', 'Enter an intent hash'); return; }
    setIsFetching(true);
    setIntentStatus(null);
    try {
      const res = await fetch(`${ctx?.backendUrl}/api/intent/${hash}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIntentStatus(await res.json());
    } catch (e: any) {
      setIntentStatus({ error: e.message });
    } finally {
      setIsFetching(false);
    }
  };

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Open',      color: 'text-amber-400' },
    1: { label: 'Settled',   color: 'text-emerald-400' },
    2: { label: 'Cancelled', color: 'text-neutral-400' },
    3: { label: 'Expired',   color: 'text-red-400' },
  };

  return (
    <div className="view space-y-5 max-w-3xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.type === 'ok' ? 'border-emerald-700/50 bg-emerald-950/80 text-emerald-200' : 'border-red-700/50 bg-red-950/80 text-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Register solver ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Register as Solver</h2>
          <p className="text-neutral-500 text-xs mt-0.5">Stake ETH to participate in intent settlement and earn 10% of every caught penalty.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="w-48">
            <label className="block text-xs text-neutral-400 mb-1.5">Stake amount</label>
            <div className="relative">
              <input ref={stakeRef} type="number" step="0.001" min="0.001" defaultValue="0.005"
                className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 pl-3 pr-12 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">ETH</span>
            </div>
          </div>

          <button onClick={registerSolver} disabled={isRegistering}
            className="rounded-lg border border-emerald-700/50 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 px-5 py-2.5 text-sm text-emerald-200 font-medium transition-colors">
            {isRegistering ? 'Registering…' : 'Register Solver'}
          </button>

          {registerResult && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4 space-y-2">
              <div className="text-xs text-emerald-400 font-semibold">✓ Registered successfully</div>
              <div className="text-xs text-neutral-500">Solver: <span className="font-mono text-neutral-300">{registerResult.solver}</span></div>
              <div className="text-xs text-neutral-500">Tx: <span className="font-mono text-neutral-400">{registerResult.txHash?.slice(0,18)}…</span></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Query intent ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Query Intent</h2>
          <p className="text-neutral-500 text-xs mt-0.5">Look up on-chain + DB status for any intent hash.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input ref={intentHashRef} type="text" placeholder="0x…intent hash"
              className="flex-1 rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2.5 text-sm font-mono text-neutral-100 focus:outline-none focus:border-neutral-600" />
            <button onClick={fetchIntentStatus} disabled={isFetching}
              className="rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-4 py-2.5 text-sm text-neutral-200 transition-colors whitespace-nowrap">
              {isFetching ? 'Loading…' : 'Fetch Status'}
            </button>
          </div>

          {intentStatus && !intentStatus.error && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">On-chain status</span>
                <span className={`text-sm font-semibold ${STATUS_MAP[intentStatus.status]?.color ?? 'text-neutral-300'}`}>
                  {STATUS_MAP[intentStatus.status]?.label ?? `Status ${intentStatus.status}`}
                </span>
              </div>
              {intentStatus.dbStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">DB status</span>
                  <span className="text-xs text-neutral-300">{intentStatus.dbStatus}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">User</span>
                <span className="text-xs font-mono text-neutral-300">{intentStatus.user?.slice(0,10)}…{intentStatus.user?.slice(-6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Deadline</span>
                <span className="text-xs text-neutral-300">{intentStatus.deadline ? new Date(intentStatus.deadline * 1000).toLocaleString() : '—'}</span>
              </div>
            </div>
          )}

          {intentStatus?.error && (
            <div className="rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {intentStatus.error}
            </div>
          )}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 p-5">
        <h3 className="text-sm font-semibold text-neutral-300 mb-3">How the solver flow works</h3>
        <ol className="space-y-2 text-xs text-neutral-500 list-none">
          {[
            'User commits an encrypted intent — nobody can see the trade.',
            'Portal waits 1–2 blocks. Any frontrun attempt triggers EigenLayer slashing.',
            'Solver fetches the decrypted payload and calls settle.',
            'Hook executes the trade, catches any attackers, splits the penalty.',
            'Solver earns 10% of every caught penalty as a reward.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-5 w-5 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 shrink-0">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
