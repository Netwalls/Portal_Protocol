import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/Layout';

interface Intent {
  id: number;
  intentHash: string;
  user: string;
  status: 'Open' | 'Settled' | 'Cancelled' | 'Expired';
  commitTime: number;
}

interface Penalty {
  id: number;
  attacker: string;
  intentHash: string;
  penaltyWei: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  Open: 'text-amber-400',
  Settled: 'text-emerald-400',
  Cancelled: 'text-neutral-500',
  Expired: 'text-neutral-500',
};

function shortHash(h: string) {
  return h.slice(0, 10) + '...' + h.slice(-6);
}

function formatEth(wei: string) {
  const val = Number(BigInt(wei)) / 1e18;
  return val.toFixed(4) + ' ETH';
}

export default function Dashboard(): JSX.Element {
  const ctx = useContext(AppContext);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!ctx?.backendUrl) return;
    setLoading(true);
    try {
      const [intentsRes, penaltiesRes, rewardsRes] = await Promise.all([
        fetch(`${ctx.backendUrl}/api/intent`).catch(() => null),
        fetch(`${ctx.backendUrl}/api/rewards/penalties/list`).catch(() => null),
        ctx.account ? fetch(`${ctx.backendUrl}/api/rewards/${ctx.account}`).catch(() => null) : Promise.resolve(null),
      ]);

      if (intentsRes?.ok) {
        const data = await intentsRes.json();
        setIntents(Array.isArray(data) ? data : []);
      }
      if (penaltiesRes?.ok) {
        const data = await penaltiesRes.json();
        setPenalties(Array.isArray(data) ? data : []);
      }
      if (rewardsRes?.ok) {
        const data = await rewardsRes.json();
        setPendingRewards(data.amountEth || '0');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [ctx?.account, ctx?.backendUrl]);

  // Build a map of intentHash → penalty for quick lookup
  const penaltyByHash = new Map<string, Penalty>();
  penalties.forEach(p => penaltyByHash.set(p.intentHash.toLowerCase(), p));

  const openIntents = intents.filter(i => i.status === 'Open');
  const attackedIntents = intents.filter(i => penaltyByHash.has(i.intentHash.toLowerCase()));

  return (
    <div className="view space-y-6" data-view="dashboard">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Overview</h2>
            <button onClick={fetchData} disabled={loading} className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-1">Connected</div>
              <div className="text-neutral-200 text-base">{ctx?.account ? '✓ Yes' : 'No'}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-1">Pending Rewards</div>
              <div className="text-emerald-400 text-base font-mono">{pendingRewards} ETH</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-1">Open Intents</div>
              <div className="text-amber-400 text-base">{openIntents.length}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className="text-neutral-400 text-xs mb-1">Attackers Caught</div>
              <div className="text-red-400 text-base">{penalties.length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-neutral-800/80">
            <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <button onClick={() => ctx?.navigate('commit')} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">Commit Intent</button>
            <button onClick={() => ctx?.navigate('intents')} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">View Intents</button>
            <button onClick={() => ctx?.navigate('rewards')} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">Rewards & Claim</button>
          </div>
        </div>
      </div>

      {/* ── Pool Monitor ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-100 tracking-tight">Pool Monitor</h3>
            <p className="text-xs text-neutral-500 mt-0.5">All intents — attackers flagged in red</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800/60">
                <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Intent Hash</th>
                <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">User</th>
                <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Status</th>
                <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Attacker</th>
                <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Penalty</th>
              </tr>
            </thead>
            <tbody>
              {intents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">No intents yet</td>
                </tr>
              ) : (
                intents.map(intent => {
                  const penalty = penaltyByHash.get(intent.intentHash.toLowerCase());
                  return (
                    <tr key={intent.id} className={`border-b border-neutral-800/40 transition-colors ${penalty ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-neutral-900/30'}`}>
                      <td className="px-5 py-3 font-mono text-xs text-neutral-300">{shortHash(intent.intentHash)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-neutral-400">{shortHash(intent.user)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold ${STATUS_COLOR[intent.status] ?? 'text-neutral-400'}`}>
                          {intent.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {penalty ? (
                          <span className="inline-flex items-center gap-1.5 text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"></span>
                            {shortHash(penalty.attacker)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {penalty ? (
                          <span className="text-red-400 font-mono">-{formatEth(penalty.penaltyWei)}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Shame wall ── */}
      {penalties.length > 0 && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/10 ring-1 ring-red-900/20 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-red-900/30">
            <h3 className="text-lg font-semibold text-red-300 tracking-tight">Attacker Shame Wall</h3>
            <p className="text-xs text-red-400/60 mt-0.5">Every address below paid 0.05 ETH and funded your rewards</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {penalties.map(p => (
              <div key={p.id} className="rounded-lg border border-red-900/30 bg-red-950/20 p-4 flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-xs text-red-300 font-mono truncate">{p.attacker}</div>
                  <div className="text-xs text-neutral-500 mt-1">Intent: {shortHash(p.intentHash)}</div>
                  <div className="text-xs text-red-400 font-mono mt-1">Slashed: {formatEth(p.penaltyWei)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
