import React, { useState, useEffect, useRef } from 'react';
import Dashboard from '../pages/Dashboard';
import CommitPage from '../pages/CommitPage';
import IntentsPage from '../pages/IntentsPage';
import RewardsPage from '../pages/RewardsPage';
import SolverPage from '../pages/SolverPage';
import SettingsPage from '../pages/SettingsPage';

const NAV_ITEMS = ['dashboard','commit','intents','rewards','solver','settings'] as const;
type NavKey = typeof NAV_ITEMS[number];

interface AppContext {
  backendUrl: string;
  portalAddress: string;
  account: string | null;
  chainName: string;
  setBackendUrl: (url: string) => void;
  setPortalAddress: (addr: string) => void;
  setAccount: (addr: string | null) => void;
  setChainName: (name: string) => void;
  navigate: (page: NavKey) => void;
}

export const AppContext = React.createContext<AppContext | null>(null);

export default function Layout(): JSX.Element {
  const REQUIRED_CHAIN = '0x14a34'; // Base Sepolia (84532)

  const [view, setView] = useState<NavKey>('dashboard');
  const [chainId, setChainId] = useState<string>('');
  const [backendUrl, setBackendUrl] = useState(
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  );
  const [portalAddress, setPortalAddress] = useState(
    import.meta.env.VITE_PORTAL_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  );
  const [account, setAccount] = useState<string | null>(null);
  const [chainName, setChainName] = useState('—');
  const portalAddressInputRef = useRef<HTMLInputElement>(null);
  const backendUrlInputRef = useRef<HTMLInputElement>(null);
  const connectBtnRef = useRef<HTMLButtonElement>(null);
  const accountPillRef = useRef<HTMLDivElement>(null);
  const accountAddrRef = useRef<HTMLSpanElement>(null);
  const chainBadgeRef = useRef<HTMLDivElement>(null);
  const chainNameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (portalAddressInputRef.current) portalAddressInputRef.current.value = portalAddress;
    if (backendUrlInputRef.current) backendUrlInputRef.current.value = backendUrl;
    if (chainNameRef.current) chainNameRef.current.textContent = chainName;
  }, [portalAddress, backendUrl, chainName]);

  // Detect chain on mount and listen for changes even before wallet connect
  useEffect(() => {
    const w: any = window;
    if (!w.ethereum) return;
    detectChain(w).then(setChainName);
    const handler = () => detectChain(w).then(setChainName);
    w.ethereum.on('chainChanged', handler);
    return () => w.ethereum.removeListener('chainChanged', handler);
  }, []);

  useEffect(() => {
    if (account) {
      if (accountPillRef.current) accountPillRef.current.classList.remove('hidden');
      if (connectBtnRef.current) connectBtnRef.current.textContent = 'Disconnect';
      if (accountAddrRef.current) accountAddrRef.current.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
    } else {
      if (accountPillRef.current) accountPillRef.current.classList.add('hidden');
      if (connectBtnRef.current) connectBtnRef.current.textContent = 'Connect';
    }
  }, [account]);

  const sanitizeBackendUrl = (url: string) => {
    const trimmed = url.trim();
    // Avoid accidental double "/api" in requests; also drop trailing slash.
    const noApi = trimmed.replace(/\/api\/?$/i, '');
    return noApi.endsWith('/') ? noApi.slice(0, -1) : noApi;
  };

  const CHAIN_NAMES: Record<string, string> = {
    '0x1':     'Ethereum',
    '0x5':     'Goerli',
    '0xaa36a7':'Sepolia',
    '0x14a34': 'Base Sepolia',  // 84532
    '0x2105':  'Base',
    '0xa4b1':  'Arbitrum One',
    '0x66eee': 'Arbitrum Sepolia',
    '0x7a69':  'Anvil (31337)',
    '0x539':   'Anvil (1337)',
    '0x138b':  'Mantle Sepolia',
    '0x1388':  'Mantle',
    '0x89':    'Polygon',
    '0x13882': 'Polygon Amoy',
    '0xa':     'Optimism',
    '0xaa37dc':'Optimism Sepolia',
  };

  const detectChain = async (w: any) => {
    try {
      const chainId = await w.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);
      return CHAIN_NAMES[chainId.toLowerCase()] || `Chain ${parseInt(chainId, 16)}`;
    } catch { return 'Unknown'; }
  };

  const switchToBaseSepolia = async () => {
    const w: any = window;
    if (!w.ethereum) return;
    try {
      await w.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN }],
      });
    } catch (err: any) {
      // Chain not added yet — add it
      if (err.code === 4902) {
        await w.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: REQUIRED_CHAIN,
            chainName: 'Base Sepolia',
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          }],
        });
      }
    }
  };

  const handleConnect = async () => {
    if (account) {
      setAccount(null);
      setChainName('—');
      return;
    }
    try {
      const w: any = window;
      if (!w.ethereum) { alert('MetaMask or compatible wallet not found'); return; }
      const accounts = await w.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setChainName(await detectChain(w));

      // Update chain name if user switches network
      w.ethereum.on('chainChanged', async () => setChainName(await detectChain(w)));
      w.ethereum.on('accountsChanged', (accs: string[]) => setAccount(accs[0] ?? null));
    } catch (err: any) {
      console.error('Connect failed:', err);
    }
  };

  function renderView() {
    switch(view) {
      case 'dashboard': return <Dashboard />;
      case 'commit': return <CommitPage />;
      case 'intents': return <IntentsPage />;
      case 'rewards': return <RewardsPage />;
      case 'solver': return <SolverPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  }

  return (
    <AppContext.Provider value={{ backendUrl, portalAddress, account, chainName, setBackendUrl, setPortalAddress, setAccount, setChainName, navigate: setView }}>
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col border-r border-neutral-800/80 bg-neutral-950/80 ring-1 ring-white/5 px-0">
          <div className="px-6 py-5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center shadow-sm shadow-black/20">
              <span className="text-neutral-200 font-semibold tracking-tight text-lg">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-100 font-semibold tracking-tight text-[18px]">PORTAL</span>
              <span className="text-neutral-400 text-xs">Intent Hook Console</span>
            </div>
          </div>
          <div className="px-3 py-2">
            <nav className="space-y-1">
              {NAV_ITEMS.map(k => (
                <button key={k} onClick={() => setView(k)} data-nav={k} className={`nav-btn w-full flex items-center gap-3 px-3 py-2 rounded-md text-neutral-300 hover:text-neutral-100 hover:bg-neutral-900 transition-all outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-700 ${view===k? 'bg-neutral-900 text-neutral-100 ring-1 ring-white/5':''}`}>
                  <span className="text-sm">{k[0].toUpperCase()+k.slice(1)}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-auto px-6 py-5 border-t border-neutral-800/80">
            <div className="text-xs text-neutral-500">v0.1 • Experimental</div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center shadow-sm shadow-black/20">
                <span className="text-neutral-200 font-semibold tracking-tight text-base">P</span>
              </div>
              <span className="text-neutral-200 font-semibold tracking-tight text-[17px]">PORTAL</span>
            </div>

            <div className="hidden md:flex items-center gap-3 w-full max-w-3xl">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Portal Hook Address</label>
                  <input ref={portalAddressInputRef} onChange={(e) => setPortalAddress(e.target.value)} type="text" placeholder="0x..." className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Backend URL</label>
                  <input
                    ref={backendUrlInputRef}
                    onChange={(e) => setBackendUrl(sanitizeBackendUrl(e.target.value))}
                    type="text"
                    placeholder="http://localhost:3001"
                    className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <div ref={chainBadgeRef} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${chainId && chainId.toLowerCase() !== REQUIRED_CHAIN ? 'border-red-800/60 bg-red-950/30' : 'border-neutral-800 bg-neutral-900/60'}`}>
                  <span ref={chainNameRef} className={`text-sm ${chainId && chainId.toLowerCase() !== REQUIRED_CHAIN ? 'text-red-400' : 'text-neutral-300'}`}>-</span>
                </div>
                {chainId && chainId.toLowerCase() !== REQUIRED_CHAIN && (
                  <button onClick={switchToBaseSepolia} className="rounded-md border border-amber-700/50 bg-amber-900/30 hover:bg-amber-900/50 px-3 py-2 text-xs text-amber-300 transition-colors whitespace-nowrap">
                    Switch to Base Sepolia
                  </button>
                )}
              </div>
              <button ref={connectBtnRef} onClick={handleConnect} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200">Connect</button>
              <div ref={accountPillRef} className="hidden items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/90"></div>
                <span ref={accountAddrRef} className="text-sm text-neutral-200">-</span>
              </div>
            </div>
          </header>

          <section id="content" className="flex-1 p-4 lg:p-6">
            {renderView()}
          </section>
        </main>
      </div>
    </AppContext.Provider>
  );
}
