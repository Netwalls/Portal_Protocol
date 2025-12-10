import React from 'react';

type Page = 'dashboard' | 'commit' | 'intents' | 'rewards' | 'solver' | 'settings';
const navItems = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
  { id: 'commit', icon: 'lock', label: 'Commit Intent' },
  { id: 'intents', icon: 'list', label: 'Intents' },
  { id: 'rewards', icon: 'wallet', label: 'Rewards' },
  { id: 'solver', icon: 'cpu', label: 'Solver' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
] as const;

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Sidebar({ currentPage, onNavigate }: Props) {
  return (
    <aside className="hidden lg:flex w-72 flex-col border-r border-neutral-800/80 bg-neutral-950/80">
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center shadow-sm">
          <span className="text-neutral-200 font-semibold text-lg">P</span>
        </div>
        <div>
          <div className="text-neutral-100 font-semibold text-[18px] tracking-tight">PORTAL</div>
          <div className="text-neutral-400 text-xs">Intent Hook Console</div>
        </div>
      </div>

      <nav className="px-3 py-2 space-y-1 flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
              currentPage === item.id
                ? 'bg-neutral-900/70 text-neutral-100 border border-neutral-700'
                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-900/50 border border-transparent'
            }`}
          >
            <i data-lucide={item.icon} className="h-4 w-4"></i>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-neutral-800/80 text-xs text-neutral-500">
        v0.1 • Experimental
      </div>
    </aside>
  );
}