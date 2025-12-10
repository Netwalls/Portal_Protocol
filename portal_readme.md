# Portal Protocol — Private Intents, Fair MEV, Real User Rewards

**Portal turns toxic MEV into user rebates.**

Instead of letting searchers and frontrunners steal value from your swaps, Portal forces them to pay a price — and then hands 30% of every caught penalty directly back to you.

Built on the bleeding edge of Ethereum tech:
- Uniswap V4 Hooks
- Fhenix encrypted intents (fully private trades)
- EigenLayer AVS restaking + slashing
- Transparent penalty redistribution

If someone tries to sandwich or frontrun a Portal trade → they lose **0.05 ETH** and you get **0.015 ETH** of it. Simple.

https://github.com/iamtechhunter/portal_protocol

---

## How It Works 

1. You send a swap, but instead of broadcasting it publicly, you encrypt it with Fhenix and commit only a hash on-chain. Nobody can see what you’re trading.
2. Your intent sits safely for a short delay (1–2 blocks).
3. Honest solvers wait, then reveal and execute your trade exactly as you wanted.
4. If a searcher tries to jump in front during the delay → the Uniswap V4 hook catches them, slashes 0.05 ETH from their restaked bond (via EigenLayer), and adds it to the reward pool.
5. Every time an attacker is caught, the 0.05 ETH is automatically split:
   - 40% → Liquidity Providers
   - 30% → You and every other Portal user (claimable)
   - 20% → Protocol treasury
   - 10% → Honest solvers (incentive to stay honest)

More attackers = more money flowing back to real users.

---

## Live Demo (works today on local Anvil)

You can try the entire flow in <5 minutes:

```bash
# 1. Start local chain
anvil

# 2.Backend (in another terminal)
cd backend
cp .env.example .env   # edit RPC_URL if needed
npm install
npm run dev

# 3. Frontend
cd ../portal_frontend
npm install
npm run dev
# → open http://localhost:5173
```

Then just:
1. Connect MetaMask (Anvil accounts have money)
2. Go to “Commit” → create an encrypted intent
3. Go to “Solver” → settle it → watch a fake attacker get caught
4. Go to “Rewards” → see 0.015 ETH ready to claim → click Claim

Refresh the page → everything is still there (PostgreSQL persistence)

---

## What You’ll See on the Rewards Page (the money shot)

```
Your Pending Rewards: 0.045 ETH (3 attackers caught while you slept)

Penalty Distribution (per 0.05 ETH caught)
├─ Liquidity Providers  → 0.02 ETH   (40%)
├─ All Portal Users     → 0.015 ETH  (30%)  ← you claim this
├─ Protocol Treasury    → 0.01 ETH   (20%)
└─ Honest Solvers       → 0.005 ETH  (10%)

Caught Attackers (last 10)
🔴 0x1337...dead   → 0.05 ETH slashed   (2 min ago)
🔴 0xbad0...beef   → 0.05 ETH slashed   (8 min ago)
🔴 0xc0ff...ee42   → 0.05 ETH slashed   (15 min ago)

Your Claim History
Dec 9, 2025 23:11  → +0.015 ETH  (tx: 0xabc…)
Dec 9, 2025 22:45  → +0.030 ETH  (tx: 2 penalties)
```

Yes, the attacker addresses are highlighted in angry red. Feels good.

---

## Tech Stack & Folder Structure

```
portal_protocol/
├── portal_hook/            → Uniswap V4 Hook (Solidity + Forge)
├── backend/                → Node.js + Express + TypeORM + PostgreSQL
└── portal_frontend/        → React 18 + Vite + Tailwind + wagmi
```

### Smart Contract Highlights (`PortalHook.sol`)

- Encrypted intent commitment (Fhenix)
- Solver registration with EigenLayer restaking
- Automatic 0.05 ETH slash on frontrun attempts
- On-chain revenue split constants (40/30/20/10)

### Backend

Tracks every penalty permanently and calculates your exact rebate.  
Every new penalty = free money for every user who hasn’t claimed it yet.

### Frontend

Clean, mobile-friendly UI that actually shows you the money you’re earning from sandwich bots.

---

## Why This Actually Matters

Most “MEV protection” projects just hide your order or auction it privately.  
Portal does the opposite: it baits attackers, catches them with cryptographic proof, slashes their stake, and mails you the profits.

It’s the first system where regular users financially benefit every time a sandwich bot takes the bait.

---

## Current Status (December 2025)

- Full local demo working today
- All three layers (hook ↔ backend ↔ frontend) talking to each other
- Persistence, claiming, history, attacker shame wall — all implemented
- Ready for testnet deployment (Sepolia → Holesky → Mainnet path mapped)

Want to help ship this to mainnet and start farming sandwich bots for real user rebates?

Star ★ the repo, DM @iamtechhunter on Twitter/X, or just fork and start breaking things.

Let’s turn toxic MEV into free money for DeFi users.

— Made with ☕ and righteous anger by TechHunter
``` 