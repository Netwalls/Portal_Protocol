import React, { useContext, useState } from 'react';
import { AbiCoder, keccak256, BrowserProvider, Contract, toUtf8Bytes } from 'ethers';
import { AppContext } from '../components/Layout';

// Minimal ABI — only what the frontend needs
const PORTAL_ABI = [
  'function commitIntent(bytes _encryptedCommitment, uint40 deadline) returns (bytes32 intentHash)',
  'event IntentCommitted(bytes32 indexed intentHash, address indexed user, uint40 commitTime)',
];

const TOKENS = [
  { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
];

function ethToWei(val: string) {
  try { return (BigInt(Math.round(parseFloat(val) * 1e9)) * BigInt(1e9)).toString(); }
  catch { return '0'; }
}
function weiToEth(wei: string) {
  try { return (Number(BigInt(wei)) / 1e18).toFixed(4); }
  catch { return '0'; }
}

type Step = 'form' | 'committed';

export default function CommitPage(): JSX.Element {
  const ctx = useContext(AppContext);
  const [tokenIn, setTokenIn]   = useState(TOKENS[0].address);
  const [tokenOut, setTokenOut] = useState(TOKENS[1].address);
  const [amountEth, setAmountEth]   = useState('1');
  const [minOutEth, setMinOutEth]   = useState('0.9');
  const [secret, setSecret]         = useState('');
  const [commitment, setCommitment] = useState('');
  const [deadlineMins, setDeadlineMins] = useState(20);
  const [isLoading, setIsLoading]   = useState(false);
  const [step, setStep]             = useState<Step>('form');
  const [result, setResult]         = useState<{ intentHash: string; txHash: string } | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const symbolOf = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.symbol ?? 'Token';

  const generateSecret = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    setSecret('0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''));
    setCommitment('');
  };

  const computeCommitment = () => {
    setError(null);
    if (!secret) { setError('Generate a secret first'); return; }
    if (!ctx?.account) { setError('Connect your wallet first'); return; }
    try {
      const abi = new AbiCoder();
      const encoded = abi.encode(
        ['address','address','uint256','uint256','bytes32','address'],
        [tokenIn, tokenOut, ethToWei(amountEth), ethToWei(minOutEth), secret, ctx.account]
      );
      setCommitment(keccak256(encoded));
    } catch (e: any) { setError(e.message); }
  };

  const submitToBackend = async () => {
    setError(null);
    if (!ctx?.account || !commitment) { setError('Connect wallet and compute commitment first'); return; }
    if (!ctx?.portalAddress) { setError('Portal Hook address not set in header'); return; }

    const w = window as any;
    if (!w.ethereum) { setError('No wallet detected — install MetaMask'); return; }

    setIsLoading(true);
    try {
      // 1. Get signer from MetaMask — triggers wallet popup
      const provider = new BrowserProvider(w.ethereum);
      const signer   = await provider.getSigner();
      const contract = new Contract(ctx.portalAddress, PORTAL_ABI, signer);

      const deadline = Math.floor(Date.now() / 1000) + deadlineMins * 60;

      // 2. Build encrypted commitment bytes (commitment hash as 32-byte payload)
      const encryptedBytes = commitment; // already a 0x-prefixed bytes32 hex string

      // 3. Send tx — MetaMask popup appears here
      const tx = await contract.commitIntent(encryptedBytes, deadline);
      const receipt = await tx.wait();

      // 4. Parse intentHash from IntentCommitted event
      let intentHash = '';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'IntentCommitted') {
            intentHash = parsed.args.intentHash;
            break;
          }
        } catch {}
      }
      if (!intentHash) intentHash = receipt.hash; // fallback

      // 5. Notify backend to record in DB (event listener may also catch it)
      await fetch(`${ctx.backendUrl}/api/intent/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentHash, user: ctx.account, txHash: receipt.hash })
      });

      setResult({ intentHash, txHash: receipt.hash });
      setStep('committed');
    } catch (e: any) {
      // User rejected wallet tx
      if (e?.code === 4001 || e?.message?.includes('rejected')) {
        setError('Transaction rejected in wallet.');
      } else {
        setError(e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setStep('form'); setResult(null); setSecret(''); setCommitment(''); setError(null); };

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'committed' && result) {
    return (
      <div className="view space-y-4 max-w-xl mx-auto pt-6">
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 ring-1 ring-emerald-800/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">✓</div>
            <div>
              <div className="text-neutral-100 font-semibold">Intent Committed</div>
              <div className="text-emerald-400 text-xs mt-0.5">{symbolOf(tokenIn)} → {symbolOf(tokenOut)} · {amountEth} ETH</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg bg-neutral-900/60 border border-neutral-800 p-3">
              <div className="text-xs text-neutral-500 mb-1">Intent Hash</div>
              <div className="text-xs font-mono text-neutral-200 break-all">{result.intentHash}</div>
            </div>
            <div className="rounded-lg bg-neutral-900/60 border border-neutral-800 p-3">
              <div className="text-xs text-neutral-500 mb-1">Tx Hash</div>
              <div className="text-xs font-mono text-neutral-200 break-all">{result.txHash}</div>
            </div>
            <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-3">
              <div className="text-xs text-amber-400 font-semibold mb-1">Save your secret — you'll need it to settle</div>
              <div className="text-xs font-mono text-amber-200 break-all">{secret}</div>
            </div>
          </div>

          <button onClick={reset} className="w-full rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-2.5 text-sm text-neutral-200 transition-colors">
            Commit Another Intent
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="view space-y-4 max-w-2xl mx-auto">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">Commit Intent</h2>
          <p className="text-neutral-400 text-sm mt-0.5">Your swap details are encrypted with Fhenix FHE — nobody sees what you're trading.</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Token pair */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Token In</label>
              <select value={tokenIn} onChange={e => setTokenIn(e.target.value)} className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600">
                {TOKENS.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Token Out</label>
              <select value={tokenOut} onChange={e => setTokenOut(e.target.value)} className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600">
                {TOKENS.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
              </select>
            </div>
          </div>

          {/* Route preview */}
          <div className="rounded-lg bg-neutral-950/40 border border-neutral-800/60 px-4 py-2.5 text-sm text-neutral-300 flex items-center gap-2">
            <span className="text-neutral-500 text-xs">Route</span>
            <span className="font-semibold">{symbolOf(tokenIn)}</span>
            <span className="text-neutral-600">→</span>
            <span className="font-semibold">{symbolOf(tokenOut)}</span>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Amount In</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" value={amountEth} onChange={e => setAmountEth(e.target.value)}
                  className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 pl-3 pr-14 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{symbolOf(tokenIn)}</span>
              </div>
              <div className="text-[11px] text-neutral-600 mt-1">{ethToWei(amountEth)} wei</div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Min Amount Out</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" value={minOutEth} onChange={e => setMinOutEth(e.target.value)}
                  className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 pl-3 pr-14 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{symbolOf(tokenOut)}</span>
              </div>
              <div className="text-[11px] text-neutral-600 mt-1">{ethToWei(minOutEth)} wei</div>
            </div>
          </div>

          {/* Secret */}
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Secret <span className="text-neutral-600">(bytes32 — generated locally, never shared)</span></label>
            <div className="flex gap-2">
              <input type="text" value={secret} readOnly placeholder="Click Generate →"
                className="flex-1 rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2.5 text-xs font-mono text-neutral-300 focus:outline-none" />
              <button onClick={generateSecret} className="rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-2.5 text-sm text-neutral-200 transition-colors whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {/* Deadline */}
          <div className="w-1/2">
            <label className="block text-xs text-neutral-400 mb-1.5">Deadline</label>
            <div className="relative">
              <input type="number" min="1" value={deadlineMins} onChange={e => setDeadlineMins(parseInt(e.target.value))}
                className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 pl-3 pr-16 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">minutes</span>
            </div>
          </div>

          {/* Commitment */}
          {commitment && (
            <div className="rounded-lg bg-neutral-950/40 border border-neutral-800/60 p-3">
              <div className="text-xs text-neutral-500 mb-1">Commitment Hash</div>
              <div className="text-xs font-mono text-emerald-400 break-all">{commitment}</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-950/30 border border-red-800/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={computeCommitment} disabled={!secret}
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 px-4 py-2.5 text-sm text-neutral-200 transition-colors">
              Compute Commitment
            </button>
            <button onClick={submitToBackend} disabled={isLoading || !commitment}
              className="flex-1 rounded-md border border-emerald-700/50 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-40 px-4 py-2.5 text-sm text-emerald-200 font-medium transition-colors">
              {isLoading ? 'Waiting for wallet…' : 'Sign & Submit Intent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
