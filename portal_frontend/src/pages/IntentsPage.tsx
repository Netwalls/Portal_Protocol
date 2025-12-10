import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/Layout';

interface Intent {
  intentHash: string;
  user: string;
  status: string;
  commitTime: number;
}

export default function IntentsPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const settlementAvailable = true; // backend now accepts settlement payload

  const settleIntent = async (intentHash: string) => {
    setSettling(intentHash);
    try {
      // 1. Fetch payload from backend
      const payloadRes = await fetch(`${ctx?.backendUrl}/api/intent/${intentHash}/decrypt`);
      if (!payloadRes.ok) {
        throw new Error('Failed to fetch settlement payload');
      }
      const { revealed, poolKey, zeroForOne } = await payloadRes.json();

      // 2. Call settle with payload
      const settleRes = await fetch(`${ctx?.backendUrl}/api/solver/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentHash, revealed, poolKey, zeroForOne })
      });

      const data = await settleRes.json();
      if (!settleRes.ok) {
        throw new Error(data?.error || settleRes.statusText);
      }

      // Soft-refresh list after success
      setIntents((prev) => prev.map(i => i.intentHash === intentHash ? { ...i, status: 'Settled' } : i));
    } catch (err: any) {
      console.error('Settlement failed:', err);
      setIntents((prev) => prev.map(i => i.intentHash === intentHash ? { ...i, status: `Error: ${err.message}` as any } : i));
    } finally {
      setSettling(null);
    }
  };

  useEffect(() => {
    if (!ctx?.backendUrl) return;

    const fetchIntents = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${ctx.backendUrl}/api/intent`);
        if (!res.ok) throw new Error(`Failed to fetch intents: ${res.statusText}`);
        const data = await res.json();
        setIntents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch intents:', err);
        setIntents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntents();
    // Refresh every 5 seconds
    const interval = setInterval(fetchIntents, 5000);
    return () => clearInterval(interval);
  }, [ctx?.backendUrl]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateHash = (hash: string) => hash.slice(0, 10) + '...' + hash.slice(-8);

  return (
    <div data-view="intents" className="view space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] tracking-tight font-semibold text-neutral-100">Your Intents</h2>
                <p className="text-neutral-400 text-sm mt-1">Tracked locally and enriched from backend/contract.</p>
                {settlementAvailable && (
                  <p className="text-amber-300 text-xs mt-1">One-click settle: backend auto-fetches payload and settles intent.</p>
                )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Refresh</button>
            <button onClick={() => setIntents([])} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Clear</button>
          </div>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="text-neutral-400 text-center py-8">Loading intents...</div>
          ) : intents.length === 0 ? (
            <div className="text-neutral-500 text-center py-8">No intents found</div>
          ) : (
            <div className="space-y-3">
              {intents.map((intent) => (
                <div key={intent.intentHash} className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 transition cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-mono text-emerald-300 font-semibold">{truncateHash(intent.intentHash)}</p>
                      <p className="text-xs text-neutral-500 mt-1">User: {truncateHash(intent.user)}</p>
                      <p className="text-xs text-neutral-400 mt-1">Committed: {formatTime(intent.commitTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        intent.status === 'Open' ? 'bg-emerald-900/40 text-emerald-200' :
                        intent.status === 'Settled' ? 'bg-blue-900/40 text-blue-200' :
                        'bg-neutral-900/40 text-neutral-200'
                      }`}>
                        {intent.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-800/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(intent.intentHash);
                        setCopied(intent.intentHash);
                        setTimeout(() => setCopied(null), 2000);
                      }}
                      className={`text-xs px-3 py-1.5 rounded transition-all ${
                        copied === intent.intentHash
                          ? 'bg-emerald-700 text-emerald-100'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {copied === intent.intentHash ? '✓ Copied' : 'Copy Hash'}
                    </button>
                    {intent.status === 'Open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!settlementAvailable) {
                            alert('Settlement pipeline not implemented yet in this build.');
                            return;
                          }
                          settleIntent(intent.intentHash);
                        }}
                        disabled={settling === intent.intentHash || !settlementAvailable}
                        className="text-xs px-3 py-1.5 rounded bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 text-emerald-200"
                      >
                        {settling === intent.intentHash ? 'Settling...' : 'Settle Intent'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
