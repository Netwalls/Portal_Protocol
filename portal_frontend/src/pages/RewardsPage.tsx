import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/Layout';

export default function RewardsPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [claiming, setClaiming] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState<string | null>(null);
  const [settledCount, setSettledCount] = useState<number>(0);
  const [claimedCount, setClaimedCount] = useState<number>(0);
  const [unclaimedCount, setUnclaimedCount] = useState<number>(0);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; txHash: string; amountWei: string; createdAt: string; claimer: string }>>([]);
  const [penalties, setPenalties] = useState<Array<{ id: number; attacker: string; intentHash: string; penaltyWei: string; createdAt: string }>>([]);
  const [summary, setSummary] = useState<{ totalPenalties: number; totals: any; userShare?: { penalties: number; userWei: string } } | null>(null);

  const fetchRewards = async () => {
    if (!ctx?.account || !ctx?.backendUrl) {
      console.log('[fetchRewards] Missing account or backendUrl', { account: ctx?.account, backendUrl: ctx?.backendUrl });
      return;
    }
    try {
      const url = `${ctx.backendUrl}/api/rewards/${ctx.account}`;
      console.log('[fetchRewards] URL:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('[fetchRewards] Data:', data);
        setPendingRewards(data.pending || '0');
        setSettledCount(Number(data.totalPenalties || 0));
        setClaimedCount(Number(data.claimedCount || 0));
        setUnclaimedCount(Number(data.unclaimedCount || 0));
      } else {
        console.error('[fetchRewards] HTTP error:', res.status);
      }
    } catch (err) {
      console.error('[fetchRewards] Error:', err);
    }
  };

  const fetchPenalties = async () => {
    if (!ctx?.backendUrl) return;
    try {
      const url = `${ctx.backendUrl}/api/rewards/penalties/list`;
      console.log('[fetchPenalties] URL:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('[fetchPenalties] Data:', data);
        setPenalties(data || []);
      } else {
        console.error('[fetchPenalties] HTTP error:', res.status);
      }
    } catch (err) {
      console.error('[fetchPenalties] Error:', err);
    }
  };

  const fetchSummary = async () => {
    if (!ctx?.backendUrl) return;
    try {
      const addr = ctx.account ? `/${ctx.account}` : '';
      const url = `${ctx.backendUrl}/api/rewards/summary${addr}`;
      console.log('[fetchSummary] URL:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('[fetchSummary] Data:', data);
        setSummary(data);
      } else {
        console.error('[fetchSummary] HTTP error:', res.status);
      }
    } catch (err) {
      console.error('[fetchSummary] Error:', err);
    }
  };

  const fetchHistory = async () => {
    if (!ctx?.account || !ctx?.backendUrl) return;
    try {
      const res = await fetch(`${ctx.backendUrl}/api/rewards/history/${ctx.account}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reward history:', err);
    }
  };

  const claimRewards = async () => {
    if (!ctx?.account) {
      alert('Please connect wallet first');
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch(`${ctx?.backendUrl}/api/rewards/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimer: ctx.account })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }

      setLastClaimTime(new Date().toLocaleString());
      setPendingRewards('0');
      setClaimedCount((prev) => prev + unclaimedCount);
      setUnclaimedCount(0);
      setLastTxHash(data.txHash || null);
    } catch (err: any) {
      console.error('Claim failed:', err);
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchHistory();
    fetchSummary();
    fetchPenalties();
    const interval = setInterval(fetchRewards, 5000);
    return () => clearInterval(interval);
  }, [ctx?.account, ctx?.backendUrl]);

  return (
    <div data-view="rewards" className="view space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-[20px] tracking-tight font-semibold text-neutral-100">Rewards & Claim</h2>
          <p className="text-neutral-400 text-sm mt-1">View pending rewards and claim earnings from settlements and MEV.</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
            <div className="text-neutral-400 text-xs mb-1">Your Pending Rewards</div>
            <div className="text-neutral-100 text-2xl font-semibold">{pendingRewards === '0' ? '0' : (Number(pendingRewards) / 1e18).toFixed(4)} ETH</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
            <div className="text-neutral-400 text-xs mb-1">Status</div>
            <div className="text-neutral-100 text-sm">
              {pendingRewards === '0' ? 'No pending rewards' : 'Ready to claim'}
            </div>
            <div className="text-neutral-500 text-xs mt-1">
              {unclaimedCount} uncaught attackers penalized
            </div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
            <div className="text-neutral-400 text-xs mb-1">Last Claim</div>
            <div className="text-neutral-100 text-sm">{lastClaimTime || 'Never'}</div>
            {lastTxHash && (
              <div className="text-[11px] text-neutral-500 break-all mt-1">{lastTxHash}</div>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRewards}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
            >
              Refresh
            </button>
            <button
              onClick={claimRewards}
              disabled={claiming || pendingRewards === '0'}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 px-3 py-2 text-sm text-emerald-200"
            >
              {claiming ? 'Claiming...' : 'Claim Rewards'}
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            When attackers try to frontrun your intent, they pay a 0.05 ETH penalty. You earn 30% of that penalty. LP 40%, Protocol 20%, Solver 10%.
          </p>
          <div className="text-[11px] text-neutral-600">
            Total penalties caught: {settledCount} · Claimed: {claimedCount} · Unclaimed: {unclaimedCount}
          </div>
        </div>
      </div>

      {summary && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
          <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] tracking-tight font-semibold text-neutral-100">Penalty Distribution</h3>
              <p className="text-neutral-400 text-sm mt-1">Aggregate from all caught attackers.</p>
            </div>
            <button
              onClick={() => { fetchSummary(); fetchRewards(); fetchHistory(); fetchPenalties(); }}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
            >
              Refresh
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
            <SummaryCard label="Total Penalties" value={summary.totals?.totalWei} />
            <SummaryCard label="LP Share" value={summary.totals?.lpWei} />
            <SummaryCard label="Users" value={summary.totals?.userWei} />
            <SummaryCard label="Protocol" value={summary.totals?.protocolWei} />
            <SummaryCard label="Solvers" value={summary.totals?.solverWei} />
          </div>
          {summary.userShare && (
            <div className="px-5 pb-5 text-[12px] text-neutral-500">
              Attackers caught: {summary.userShare.penalties} · Your earned so far: {(Number(summary.userShare.userWei) / 1e18).toFixed(4)} ETH
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] tracking-tight font-semibold text-neutral-100">Caught Attackers</h3>
            <p className="text-neutral-400 text-sm mt-1">Frontrunners penalized for trying to bypass Portal.</p>
          </div>
          <button
            onClick={fetchPenalties}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
          >
            Refresh
          </button>
        </div>
        <div className="p-5 space-y-3">
          {penalties.length === 0 ? (
            <div className="text-neutral-500 text-sm">No attackers caught yet.</div>
          ) : (
            <div className="space-y-2">
              {penalties.map((p) => (
                <div key={p.id} className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-3 ring-1 ring-white/5">
                  <div className="text-neutral-100 text-sm font-medium">Attacker: {p.attacker.slice(0, 10)}...{p.attacker.slice(-8)}</div>
                  <div className="text-[11px] text-red-400 font-semibold">Penalty: {(Number(p.penaltyWei) / 1e18).toFixed(4)} ETH</div>
                  <div className="text-[11px] text-neutral-500 break-all">Intent: {p.intentHash.slice(0, 20)}...</div>
                  <div className="text-[11px] text-neutral-600">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] tracking-tight font-semibold text-neutral-100">Reward Claim History</h3>
            <p className="text-neutral-400 text-sm mt-1">Latest 25 claims for this address.</p>
          </div>
          <button
            onClick={() => { fetchHistory(); fetchRewards(); }}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
          >
            Refresh
          </button>
        </div>
        <div className="p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-neutral-500 text-sm">No claims yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-3 ring-1 ring-white/5">
                  <div className="text-neutral-100 text-sm font-medium">{(Number(h.amountWei) / 1e18).toFixed(4)} ETH</div>
                  <div className="text-[11px] text-neutral-500 break-all">{h.txHash}</div>
                  <div className="text-[11px] text-neutral-600">{new Date(h.createdAt).toLocaleString()}</div>
                  <div className="text-[11px] text-neutral-600">{h.claimer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 ring-1 ring-white/5">
      <div className="text-neutral-400 text-xs mb-1">{label}</div>
      <div className="text-neutral-100 text-lg font-semibold">{value ? (Number(value) / 1e18).toFixed(4) : '0.0000'} ETH</div>
    </div>
  );
}
