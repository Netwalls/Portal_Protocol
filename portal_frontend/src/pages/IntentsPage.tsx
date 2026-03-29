import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AppContext } from '../components/Layout';

interface Intent {
  intentHash: string;
  user: string;
  status: string;
  commitTime: number;
}

const STATUS_STYLE: Record<string, string> = {
  Open:    'bg-amber-900/40 text-amber-300 border border-amber-800/40',
  Settled: 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/40',
};

export default function IntentsPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [intents, setIntents]     = useState<Intent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settling, setSettling]   = useState<string | null>(null);
  const [settleProgress, setSettleProgress] = useState(0);
  const [copied, setCopied]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const fetchIntents = useCallback(async () => {
    if (!ctx?.backendUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${ctx.backendUrl}/api/intent`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIntents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [ctx?.backendUrl]);

  useEffect(() => {
    fetchIntents();
    const interval = setInterval(fetchIntents, 5000);
    return () => clearInterval(interval);
  }, [fetchIntents]);

  const settleIntent = async (intentHash: string) => {
    setError(null);
    setSettling(intentHash);
    setSettleProgress(0);

    // Animate progress bar over ~15 s (the backend reveal delay)
    const start = Date.now();
    const DELAY_MS = 15000;
    const timer = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / DELAY_MS) * 100, 95);
      setSettleProgress(pct);
    }, 200);

    try {
      const payloadRes = await fetch(`${ctx?.backendUrl}/api/intent/${intentHash}/decrypt`);
      if (!payloadRes.ok) throw new Error('Failed to fetch settlement payload');
      const { revealed, poolKey, zeroForOne } = await payloadRes.json();

      const settleRes = await fetch(`${ctx?.backendUrl}/api/solver/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentHash, revealed, poolKey, zeroForOne })
      });
      const data = await settleRes.json();
      if (!settleRes.ok) throw new Error(data?.error || settleRes.statusText);

      setSettleProgress(100);
      setIntents(prev => prev.map(i => i.intentHash === intentHash ? { ...i, status: 'Settled' } : i));
    } catch (e: any) {
      setError(`Settlement failed: ${e.message}`);
      setIntents(prev => prev.map(i => i.intentHash === intentHash ? { ...i, status: 'Open' } : i));
    } finally {
      clearInterval(timer);
      setTimeout(() => { setSettling(null); setSettleProgress(0); }, 600);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(hash);
    setTimeout(() => setCopied(null), 2000);
  };

  const openCount   = intents.filter(i => i.status === 'Open').length;
  const settledCount = intents.filter(i => i.status === 'Settled').length;

  return (
    <div className="view space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Intent Pool</h2>
            <p className="text-neutral-500 text-xs mt-0.5">
              {intents.length} total · <span className="text-amber-400">{openCount} open</span> · <span className="text-emerald-400">{settledCount} settled</span>
            </p>
          </div>
          <button onClick={fetchIntents} disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 disabled:opacity-50 px-3 py-2 text-sm text-neutral-200 transition-colors">
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-950/30 border border-red-800/40 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 ml-4 text-lg leading-none">×</button>
          </div>
        )}

        <div className="p-5">
          {isLoading && intents.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">Loading intents…</div>
          ) : intents.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">No intents yet — commit one to get started.</div>
          ) : (
            <div className="space-y-2">
              {intents.map(intent => {
                const isSettlingThis = settling === intent.intentHash;
                return (
                  <div key={intent.intentHash}
                    className={`rounded-lg border p-4 transition-colors ${isSettlingThis ? 'border-amber-700/40 bg-amber-950/10' : 'border-neutral-800/50 bg-neutral-900/30 hover:border-neutral-700/50'}`}>

                    {/* Progress bar during settlement */}
                    {isSettlingThis && (
                      <div className="mb-3 h-1 rounded-full bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-200" style={{ width: `${settleProgress}%` }} />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-neutral-200">{intent.intentHash.slice(0, 12)}…{intent.intentHash.slice(-8)}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[intent.status] ?? 'bg-neutral-800 text-neutral-400'}`}>
                            {isSettlingThis ? 'Settling…' : intent.status}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          User: <span className="font-mono">{intent.user.slice(0,8)}…{intent.user.slice(-6)}</span>
                          <span className="mx-2 text-neutral-700">·</span>
                          {new Date(intent.commitTime * 1000).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => copyHash(intent.intentHash)}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${copied === intent.intentHash ? 'border-emerald-700 bg-emerald-900/40 text-emerald-300' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}>
                          {copied === intent.intentHash ? '✓ Copied' : 'Copy'}
                        </button>
                        {intent.status === 'Open' && (
                          <button onClick={() => settleIntent(intent.intentHash)} disabled={!!settling}
                            className="text-xs px-3 py-1.5 rounded-md border border-emerald-700/50 bg-emerald-900/30 hover:bg-emerald-900/50 disabled:opacity-40 text-emerald-300 transition-colors">
                            {isSettlingThis ? `${Math.round(settleProgress)}%` : 'Settle'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
