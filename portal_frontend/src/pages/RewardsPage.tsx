import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../components/Layout';

interface ClaimRecord { id: number; txHash: string; amountWei: string; createdAt: string; claimer: string; }
interface Penalty     { id: number; attacker: string; intentHash: string; penaltyWei: string; createdAt: string; }
interface Summary     { totalPenalties: number; totals: any; userShare?: { penalties: number; userWei: string }; }

function weiToEth(wei: string) {
  try { return (Number(BigInt(wei)) / 1e18).toFixed(2); } catch { return '0.00'; }
}
function shortAddr(addr: string) { return addr.slice(0, 8) + '…' + addr.slice(-6); }

export default function RewardsPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [pendingWei, setPendingWei]       = useState('0');
  const [claiming, setClaiming]           = useState(false);
  const [claimedCount, setClaimedCount]   = useState(0);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [lastTxHash, setLastTxHash]       = useState<string | null>(null);
  const [history, setHistory]             = useState<ClaimRecord[]>([]);
  const [penalties, setPenalties]         = useState<Penalty[]>([]);
  const [summary, setSummary]             = useState<Summary | null>(null);
  const [toast, setToast]                 = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = async () => {
    if (!ctx?.backendUrl) return;
    const [rRes, pRes, sRes, hRes] = await Promise.all([
      ctx.account ? fetch(`${ctx.backendUrl}/api/rewards/${ctx.account}`).catch(() => null) : null,
      fetch(`${ctx.backendUrl}/api/rewards/penalties/list`).catch(() => null),
      fetch(`${ctx.backendUrl}/api/rewards/summary${ctx.account ? '/' + ctx.account : ''}`).catch(() => null),
      ctx.account ? fetch(`${ctx.backendUrl}/api/rewards/history/${ctx.account}`).catch(() => null) : null,
    ]);
    if (rRes?.ok) {
      const d = await rRes.json();
      setPendingWei(d.pending ?? '0');
      setClaimedCount(Number(d.claimedCount ?? 0));
      setUnclaimedCount(Number(d.unclaimedCount ?? 0));
    }
    if (pRes?.ok) setPenalties(await pRes.json());
    if (sRes?.ok) setSummary(await sRes.json());
    if (hRes?.ok) setHistory(await hRes.json());
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, [ctx?.account, ctx?.backendUrl]);

  const claimRewards = async () => {
    if (!ctx?.account) { showToast('err', 'Connect your wallet first'); return; }
    setClaiming(true);
    try {
      const res = await fetch(`${ctx.backendUrl}/api/rewards/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimer: ctx.account })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setLastTxHash(data.txHash);
      setPendingWei('0');
      setClaimedCount(c => c + unclaimedCount);
      setUnclaimedCount(0);
      showToast('ok', `Claimed ${weiToEth(pendingWei)} ETH`);
      fetchAll();
    } catch (e: any) {
      showToast('err', e.message);
    } finally {
      setClaiming(false);
    }
  };

  const hasPending = pendingWei !== '0' && pendingWei !== '';

  return (
    <div className="view space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${toast.type === 'ok' ? 'border-emerald-700/50 bg-emerald-950/80 text-emerald-200' : 'border-red-700/50 bg-red-950/80 text-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Hero: pending rewards ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="text-xs text-neutral-500 mb-1">Your Pending Rewards</div>
            <div className={`text-4xl font-bold font-mono tracking-tight ${hasPending ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {weiToEth(pendingWei)} ETH
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {unclaimedCount} attacker{unclaimedCount !== 1 ? 's' : ''} caught · {claimedCount} penalties claimed
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[180px]">
            <button onClick={claimRewards} disabled={claiming || !hasPending}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${hasPending && !claiming ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'}`}>
              {claiming ? 'Claiming…' : hasPending ? `Claim ${weiToEth(pendingWei)} ETH` : 'Nothing to Claim'}
            </button>
            <button onClick={fetchAll} className="w-full rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-sm text-neutral-300 transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {lastTxHash && (
          <div className="border-t border-neutral-800/80 px-6 py-3 text-xs text-neutral-500">
            Last claim tx: <span className="font-mono text-neutral-400">{lastTxHash.slice(0,18)}…{lastTxHash.slice(-10)}</span>
          </div>
        )}
      </div>

      {/* ── Revenue split ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80">
          <h3 className="text-base font-semibold text-neutral-100">Penalty Distribution <span className="text-xs text-neutral-500 font-normal ml-1">per 0.05 ETH caught</span></h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'You (Users)', pct: 30, color: 'text-emerald-400', wei: summary?.totals?.userWei },
            { label: 'Liquidity Providers', pct: 40, color: 'text-blue-400', wei: summary?.totals?.lpWei },
            { label: 'Protocol', pct: 20, color: 'text-purple-400', wei: summary?.totals?.protocolWei },
            { label: 'Solvers', pct: 10, color: 'text-amber-400', wei: summary?.totals?.solverWei },
          ].map(({ label, pct, color, wei }) => (
            <div key={label} className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4">
              <div className={`text-2xl font-bold ${color}`}>{pct}%</div>
              <div className="text-xs text-neutral-400 mt-1">{label}</div>
              {wei && <div className="text-xs font-mono text-neutral-500 mt-1">{weiToEth(wei)} ETH total</div>}
            </div>
          ))}
        </div>
        {summary && (
          <div className="px-5 pb-4 text-xs text-neutral-600">
            {summary.totalPenalties} total penalties · {weiToEth(summary.totals?.totalWei ?? '0')} ETH total penalized
          </div>
        )}
      </div>

      {/* ── Caught attackers ── */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">Caught Attackers <span className="text-xs text-red-400 font-normal ml-1">{penalties.length} total</span></h3>
        </div>
        {penalties.length === 0 ? (
          <div className="p-5 text-sm text-neutral-500">No attackers caught yet — settle an intent to simulate one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800/60">
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Attacker</th>
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Intent</th>
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Slashed</th>
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map(p => (
                  <tr key={p.id} className="border-b border-neutral-800/40 hover:bg-red-950/10 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-red-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"></span>
                      {shortAddr(p.attacker)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-400">{p.intentHash.slice(0,10)}…</td>
                    <td className="px-5 py-3 text-xs font-mono text-red-400">-{weiToEth(p.penaltyWei)} ETH</td>
                    <td className="px-5 py-3 text-xs text-neutral-500">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Claim history ── */}
      {history.length > 0 && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
          <div className="p-5 border-b border-neutral-800/80">
            <h3 className="text-base font-semibold text-neutral-100">Claim History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800/60">
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Amount</th>
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Tx Hash</th>
                  <th className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-neutral-800/40 hover:bg-neutral-900/30">
                    <td className="px-5 py-3 text-xs font-mono text-emerald-400">+{weiToEth(h.amountWei)} ETH</td>
                    <td className="px-5 py-3 text-xs font-mono text-neutral-500">{h.txHash.slice(0,16)}…</td>
                    <td className="px-5 py-3 text-xs text-neutral-500">{new Date(h.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
