const portalHtml = `
  <!-- ... (keep everything you already have until the Dashboard view ends) ... -->

        <!-- Dashboard -->
        <div data-view="dashboard" class="view space-y-6">
          <!-- your existing dashboard content -->
        </div>

        <!-- Commit Intent View -->
        <div data-view="commit" class="view hidden space-y-6">
          <div class="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
            <div class="p-5 border-b border-neutral-800/80">
              <h2 class="text-xl font-semibold tracking-tight text-neutral-100">Commit New Intent</h2>
            </div>
            <div class="p-5 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm text-neutral-300 mb-2">Intent Description</label>
                  <textarea id="intentDesc" rows="4" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600 transition" placeholder="e.g. Swap 10 ETH for USDC on Uniswap within 5 blocks..."></textarea>
                </div>
                <div>
                  <label class="block text-sm text-neutral-300 mb-2">Reward Amount (ETH)</label>
                  <input id="rewardAmount" type="text" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600 transition" placeholder="0.05">
                  <p class="text-xs text-neutral-500 mt-2">Minimum: 0.001 ETH • You will pay this if solved</p>
                </div>
              </div>

              <div>
                <label class="block text-sm text-neutral-300 mb-2">Solver Deadline (blocks)</label>
                <input id="deadlineBlocks" type="number" class="w-full max-w-xs rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 transition" placeholder="720" value="720">
                <p class="text-xs text-neutral-500 mt-1">~5 days on Ethereum mainnet</p>
              </div>

              <div class="flex items-center gap-4 pt-4">
                <button id="submitCommit" class="inline-flex items-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-neutral-200 hover:-translate-y-0.5 transition-all px-6 py-3 text-sm shadow-lg">
                  <i data-lucide="lock" class="h-4 w-4"></i>
                  Commit Intent
                </button>
                <button data-nav="dashboard" class="text-neutral-400 hover:text-neutral-200 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Intents View -->
        <div data-view="intents" class="view hidden space-y-6">
          <div class="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
            <div class="p-5 border-b border-neutral-800/80 flex items-center justify-between">
              <h2 class="text-xl font-semibold tracking-tight text-neutral-100">Your Active Intents</h2>
              <button id="refreshAllIntents" class="inline-flex items-center gap-2 text-sm rounded-md border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900 px-3 py-2">
                <i data-lucide="refresh-ccw" class="h-4 w-4"></i> Refresh
              </button>
            </div>
            <div id="intentsList" class="p-5">
              <!-- Intents will be injected here -->
              <div class="text-neutral-500 text-center py-12">No active intents found</div>
            </div>
          </div>
        </div>

        <!-- Rewards View -->
        <div data-view="rewards" class="view hidden space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="lg:col-span-2 rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
              <div class="p-5 border-b border-neutral-800/80">
                <h2 class="text-xl font-semibold tracking-tight text-neutral-100">Claimable Rewards</h2>
              </div>
              <div id="claimableList" class="p-5 space-y-4">
                <div class="text-neutral-500 text-center py-12">No claimable rewards yet</div>
              </div>
            </div>

            <div class="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
              <div class="p-5 border-b border-neutral-800/80">
                <h3 class="text-lg font-semibold text-neutral-100">Total Earned</h3>
              </div>
              <div class="p-5 space-y-5">
                <div>
                  <div class="text-3xl font-bold text-neutral-100">0.000 ETH</div>
                  <div class="text-sm text-neutral-500">Across all solved intents</div>
                </div>
                <button id="claimAllBtn" disabled class="w-full inline-flex justify-center items-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-medium opacity-50 cursor-not-allowed px-6 py-3 text-sm">
                  <i data-lucide="wallet" class="h-4 w-4"></i>
                  Claim All Rewards
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Solver View -->
        <div data-view="solver" class="view hidden space-y-6">
          <div class="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
            <div class="p-5 border-b border-neutral-800/80">
              <h2 class="text-xl font-semibold tracking-tight text-neutral-100">Solver Configuration</h2>
            </div>
            <div class="p-5 space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-neutral-100 font-medium">Solver Mode</div>
                  <div class="text-sm text-neutral-500">Automatically solve open intents when profitable</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="solverEnabled" class="sr-only peer">
                  <div class="w-11 h-6 bg-neutral-800 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-neutral-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm text-neutral-300 mb-2">Minimum Profit Threshold (ETH)</label>
                  <input id="minProfit" type="text" value="0.002" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600">
                </div>
                <div>
                  <label class="block text-sm text-neutral-300 mb-2">Gas Price Limit (gwei)</label>
                  <input id="gasLimit" type="number" value="150" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600">
                </div>
              </div>

              <div>
                <button id="saveSolverSettings" class="inline-flex items-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-neutral-200 hover:-translate-y-0.5 transition-all px-6 py-3 text-sm">
                  <i data-lucide="save" class="h-4 w-4"></i>
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-emerald-800/40 bg-emerald-900/10 ring-1 ring-emerald-700/20">
            <div class="p-5">
              <div class="flex items-center gap-3">
                <i data-lucide="cpu" class="h-6 w-6 text-emerald-500"></i>
                <div>
                  <div class="font-medium text-neutral-100">Solver Status: <span id="solverStatus" class="text-emerald-400">Inactive</span></div>
                  <div class="text-sm text-neutral-500">Last scanned block: <span id="lastBlock">-</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings View -->
        <div data-view="settings" class="view hidden space-y-6">
          <div class="rounded-xl border border-neutral-800/80 bg-neutral-900/40 ring-1 ring-white/5 shadow-sm shadow-black/20">
            <div class="p-5 border-b border-neutral-800/80">
              <h2 class="text-xl font-semibold tracking-tight text-neutral-100">Settings</h2>
            </div>
            <div class="p-5 space-y-8">
              <div>
                <h3 class="text-lg font-medium text-neutral-100 mb-4">Connection</h3>
                <div class="space-y-4 max-w-2xl">
                  <div>
                    <label class="block text-sm text-neutral-400 mb-1">Backend API URL</label>
                    <input id="settingsBackendUrl" type="text" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100" value="http://localhost:3001">
                  </div>
                  <div>
                    <label class="block text-sm text-neutral-400 mb-1">Portal Hook Contract</label>
                    <input id="settingsPortalAddr" type="text" class="w-full rounded-md bg-neutral-900/70 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 font-mono text-xs" placeholder="0x...">
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-medium text-neutral-100 mb-4">Notifications</h3>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-neutral-300">Intent solved notifications</span>
                    <input type="checkbox" checked class="w-5 h-5 rounded border-neutral-700 text-emerald-600 focus:ring-neutral-600">
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-neutral-300">Reward ready to claim</span>
                    <input type="checkbox" checked class="w-5 h-5 rounded border-neutral-700 text-emerald-600 focus:ring-neutral-600">
                  </label>
                </div>
              </div>

              <div class="pt-4">
                <button id="saveSettings" class="inline-flex items-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-neutral-200 hover:-translate-y-0.5 transition-all px-6 py-3 text-sm">
                  <i data-lucide="check" class="h-4 w-4"></i>
                  Save All Settings
                </button>
              </div>
            </div>
          </div>
        </div>

      </section>

      <!-- Toasts -->
      <div id="toasts" class="fixed bottom-4 right-4 space Fung-y-2 z-50"></div>
    </main>
  </div>
`;