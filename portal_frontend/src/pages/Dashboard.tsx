import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/Layout';

interface Intent {
  id: number;
  intentHash: string;
  user: string;
  status: 'Open' | 'Settled' | 'Cancelled' | 'Expired';
  commitTime: number;
}

export default function Dashboard(): JSX.Element {
  const ctx = useContext(AppContext);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [rewards, setRewards] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!ctx?.account || !ctx?.backendUrl) return;
    setLoading(true);
    try {
      const [intentsRes, rewardsRes] = await Promise.all([
        fetch(`${ctx.backendUrl}/api/intent`).catch(() => null),
        fetch(`${ctx.backendUrl}/api/rewards/${ctx.account}`).catch(() => null)
      ]);

      if (intentsRes?.ok) {
        const data = await intentsRes.json();
        setIntents(Array.isArray(data) ? data.slice(0, 6) : []);
      }

      if (rewardsRes?.ok) {
        const data = await rewardsRes.json();
        setRewards(data.rewards || '0');
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [ctx?.account, ctx?.backendUrl]);

  return (
    <div className="view space-y-6" data-view="dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
            <h2 className="text-lg md:text-[20px] tracking-tight font-semibold text-neutral-100">Overview</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
              <div className="text-neutral-400 text-xs mb-1">Connected</div>
              <div className="text-neutral-200 text-base">{ctx?.account ? '✓ Yes' : 'No'}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
              <div className="text-neutral-400 text-xs mb-1">Pending Rewards</div>
              <div className="text-neutral-200 text-base">{rewards} ETH</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
              <div className="text-neutral-400 text-xs mb-1">Open Intents</div>
              <div className="text-neutral-200 text-base">{intents.filter(i => i.status === 'Open').length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-neutral-800/80">
            <h2 className="text-lg md:text-[20px] tracking-tight font-semibold text-neutral-100">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">Commit Intent</button>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">View Intents</button>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 hover:-translate-y-0.5 transition-all px-3 py-2.5 text-sm text-neutral-200">Rewards & Claim</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <h3 className="text-lg tracking-tight font-semibold text-neutral-100">Recent Intents</h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 ring-1 ring-white/5 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50">
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {intents.length === 0 ? (
            <div className="col-span-full text-neutral-500 text-center py-8">No intents yet</div>
          ) : (
            intents.map(intent => (
              <div key={intent.id} className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
                <div className="text-xs text-neutral-400 mb-2">Intent Hash</div>
                <div className="text-xs font-mono text-neutral-200 truncate">{intent.intentHash.slice(0, 16)}...</div>
                <div className="text-xs text-neutral-400 mt-2">Status</div>
                <div className={`text-xs font-semibold ${intent.status === 'Open' ? 'text-amber-400' : intent.status === 'Settled' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {intent.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
