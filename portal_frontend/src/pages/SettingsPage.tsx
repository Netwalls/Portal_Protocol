import React from 'react';

export default function SettingsPage(): JSX.Element {
  return (
    <div data-view="settings" className="view space-y-6">
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
        <div className="p-5 border-b border-neutral-800/80">
          <h2 className="text-[20px] tracking-tight font-semibold text-neutral-100">Settings</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs text-neutral-400 mb-1">Explorer Base URL</label>
            <input id="explorerUrl" type="text" placeholder="https://etherscan.io" className="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-sm text-neutral-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-neutral-400 mb-1">SSE/WebSocket (future)</label>
            <input disabled type="text" placeholder="wss://..." className="w-full rounded-md bg-neutral-900/30 border border-neutral-800 px-3 py-2 text-sm text-neutral-500" />
          </div>
        </div>
        <div className="px-5 pb-5">
          <button id="saveSettings" className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200">Save</button>
        </div>
      </div>
    </div>
  );
}
