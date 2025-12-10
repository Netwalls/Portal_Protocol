import React from 'react';

export default function TopBar() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center">
          <span className="text-neutral-200 font-semibold">P</span>
        </div>
        <span className="text-neutral-200 font-semibold text-[17px]">PORTAL</span>
      </div>

      <div className="flex-1 max-w-3xl mx-auto hidden md:grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Portal Hook Address</label>
          <input type="text" placeholder="0x..." className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm placeholder:text-neutral-500" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Backend URL</label>
          <input type="text" defaultValue="http://localhost:3001" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 px-3 py-2 text-sm">
          <i data-lucide="log-in" className="h-4 w-4"></i>
          Connect
        </button>
      </div>
    </header>
  );
}