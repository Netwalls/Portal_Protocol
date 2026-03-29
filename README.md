# Portal Protocol

**MEV-resistant intent protocol built on Uniswap V4 Hooks + Fhenix FHE + EigenLayer AVS**

Portal Protocol eliminates frontrunning from DeFi swaps by encrypting swap intents before they touch the chain. Bots watching the mempool see only an opaque ciphertext — not your token pair, not your amount, not your minimum output. The intent is revealed and executed only after the Fhenix FHE delay window closes, making MEV extraction cryptographically impossible.

> **Fhenix Privacy-by-Design Buildathon — Wave 1 Submission**

---

## The Problem

Every unprotected swap on a transparent blockchain is a frontrunning target. MEV bots:

1. Watch the mempool for pending swap transactions
2. Read the exact `tokenIn`, `tokenOut`, `amountIn`, and `minAmountOut`
3. Insert a buy transaction before yours (sandwich attack)
4. Sell immediately after — extracting value directly from your slippage tolerance

This costs DeFi users an estimated **$1B+ annually** and is structural to transparent blockchains.

---

## The Solution

Portal Protocol uses **Fully Homomorphic Encryption** to make swap parameters invisible until execution is irreversible.

```
User                      Fhenix FHE                  Uniswap V4 Pool
  │                           │                               │
  ├─ FHE.encrypt(amountIn)    │                               │
  ├─ commitIntent(ciphertext) │                               │
  │   → stored on-chain       │                               │
  │   (bots see nothing)      │                               │
  │                           │                               │
  │         [REVEAL_DELAY blocks pass]                        │
  │                           │                               │
  ├─ Solver reveals intent ──►│                               │
  │                           ├─ Decrypt + verify commitment  │
  │                           ├─ Validate secret + user addr  │
  │                           └─ Execute swap ───────────────►│
  │                                                           │
  │◄── MEV captured → rebated to user (30%) ─────────────────┘
```

Frontrunners who attempt to sandwich are detected by the hook's `_tryPenalizeFrontRunner` logic. Their EigenLayer bond is slashed and redistributed to users, LPs, and the protocol.

---

## Live Deployment

| Contract | Network | Address |
|----------|---------|---------|
| `PortalHook.sol` | Base Sepolia | [`0x84124Cd923b366F7B8411E4dEaC7EACeb936C6F4`](https://sepolia.basescan.org/address/0x84124Cd923b366F7B8411E4dEaC7EACeb936C6F4) |

**What is real on-chain today:**
- `commitIntent()` — MetaMask signs a real Base Sepolia transaction; intent hash verifiable on Basescan
- `registerSolver()` — Solvers post a real ETH bond (min 0.001 ETH) via the contract
- Full FHE commit/reveal/settle + penalty logic written in Solidity and deployed

**What is simulated (Wave 1 scope):**
- Settlement execution — requires Uniswap V4 PoolManager with live liquidity (no V4 pools on Base Sepolia for our token pairs yet)
- Attacker penalty distribution — backend simulates the slash/redistribute flow; EigenLayer AVS wiring is Wave 2

---

## Architecture

Portal Protocol is three layers working together:

### Layer 1 — Smart Contract (`PortalHook.sol`)

A Uniswap V4 hook that wraps every swap through the pool:

- **`beforeSwap`** — blocks any direct swap without a valid intent commitment
- **`afterSwap`** — pulls input tokens from user, runs penalty detection on frontrunners
- **`commitIntent`** — stores FHE-encrypted commitment on-chain
- **`settleIntent`** — authorized solvers reveal + execute after delay window
- **`claimRewards`** — users and LPs pull their MEV rebate + penalty share

Revenue split per settlement:

| Recipient | Share |
|-----------|-------|
| User (MEV rebate) | 30% |
| Liquidity Providers | 40% |
| Protocol | 20% |
| Solver tip | 10% |

### Layer 2 — Backend (Node.js + TypeScript + PostgreSQL)

The off-chain solver and indexer:

- Listens for `IntentCommitted` events from the contract
- Stores intent metadata in PostgreSQL via TypeORM
- Runs the settlement flow after `REVEAL_DELAY` blocks
- Tracks attacker penalties and reward claims
- Exposes REST API for the frontend

### Layer 3 — Frontend (React + TypeScript + Vite)

The user-facing console:

- Connects to MetaMask, detects and switches to Base Sepolia automatically
- Encrypts `amountIn` with Fhenix SDK before sending
- Signs `commitIntent` transactions directly via MetaMask (real on-chain)
- Displays Pool Monitor, Attacker Shame Wall, Rewards, and Solver pages

---

## Smart Contract Deep Dive

### Data Structures

```solidity
struct Intent {
    bytes32 commitment;      // FHE-encrypted swap parameters
    address user;
    IntentType intentType;   // SameChain | CrossChain
    uint40 deadline;
    uint40 commitTime;
    uint32 nonce;
    IntentStatus status;     // Open | Settled | Cancelled | Expired
    uint256 destChainId;
    address destRecipient;
}

struct RevealedIntent {
    Currency tokenIn;
    Currency tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    bytes32 secret;          // binds reveal to original user
    address destToken;
}
```

### Key Functions

#### `commitIntent`

```solidity
function commitIntent(
    bytes calldata _encryptedCommitment,  // Fhenix FHE ciphertext
    uint40 deadline
) external returns (bytes32 intentHash)
```

Stores an FHE-encrypted commitment on-chain. The commitment is `keccak256(tokenIn, tokenOut, amountIn, minAmountOut, secret, user)` — encrypted with the Fhenix public key. No mempool observer can reconstruct swap parameters.

#### `settleIntent`

```solidity
function settleIntent(
    bytes32 intentHash,
    PoolKey calldata key,
    RevealedIntent calldata revealed,
    bool zeroForOne
) external returns (uint256 userPayout, uint256 mevCaptured)
```

Called by an authorized solver after `REVEAL_DELAY` blocks. Validates the reveal against the stored commitment (replay-proof via secret + user binding), executes the swap through Uniswap V4 PoolManager, and distributes MEV revenue.

#### Penalty Logic

```solidity
function _tryPenalizeFrontRunner(bytes32 intentHash, address solver) internal
```

If the hook detects a reveal attempt inside the `REVEAL_DELAY` window, the solver's EigenLayer bond is slashed by `ATTACKER_PENALTY` (0.05 ETH). The penalty pools into `totalCapturedPenalty` and is distributed on the next settlement.

### Events

```solidity
event IntentCommitted(bytes32 indexed intentHash, address indexed user, uint40 commitTime);
event IntentSettled(bytes32 indexed intentHash, address solver, uint256 mev, uint256 userRebate);
event AttackerPenalized(address indexed attacker, uint256 penalty, bytes32 intentHash);
event RevenueDistributed(uint256 lp, uint256 user, uint256 protocol, uint256 solver);
```

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_SOLVER_STAKE` | 0.001 ETH | Minimum bond to register as solver |
| `REVEAL_DELAY` | 1 block | FHE window before settlement is allowed |
| `ATTACKER_PENALTY` | 0.05 ETH | Slashed from frontrunner's bond |
| `LP_SHARE` | 40% | MEV to liquidity providers |
| `USER_REBATE` | 30% | MEV rebated to the protected user |
| `PROTOCOL_FEE` | 20% | Protocol revenue |
| `SOLVER_TIP` | 10% | Solver compensation |

---

## Fhenix Integration

The Fhenix SDK (`fhenixjs`) is integrated in the backend encryption service. When a Fhenix node is reachable, the swap `amountIn` is encrypted as `euint128` using the network's FHE public key. The resulting ciphertext is what gets committed on-chain — only the Fhenix decryption network can reverse it.

```typescript
// backend/src/services/fhenix.service.ts
const fhenixClient = new FhenixClient({ provider }); // Fhenix Nitrogen RPC
const encryptedAmount = await fhenixClient.encrypt_uint128(amountIn);
// → real FHE ciphertext; no plaintext ever reaches the mempool
```

The contract's `commitIntent` accepts the raw ciphertext as `bytes`. In local development (no Fhenix node), it falls back to `keccak256` — the contract detects this by checking byte length and routes accordingly.

**Fhenix target network:** Nitrogen Testnet (`https://api.nitrogen.fhenix.zone`, Chain ID `5432`)

---

## EigenLayer Integration

Solvers must post an ETH bond to register. The bond is restaked into an EigenLayer AVS:

```solidity
function registerSolver() external payable {
    require(msg.value >= MIN_SOLVER_STAKE, "low stake");
    authorizedSolvers[msg.sender] = true;
    solverBonds[msg.sender] += msg.value;
    eigenAVS.depositIntoAVS(msg.sender, msg.value);  // restake
}
```

Frontrunning results in on-chain slashing:

```solidity
eigenAVS.slashOperator(solver, ATTACKER_PENALTY);
```

This creates a real economic cost for MEV attacks — not just a UI flag.

---

## Commit / Reveal / Settle Flow

```
Step 1 — COMMIT (live on Base Sepolia today)
  User inputs:  tokenIn, tokenOut, amountIn, minAmountOut, secret
  Frontend:     FHE.encrypt(amountIn) → ciphertext via Fhenix SDK
  Frontend:     keccak256(tokenIn, tokenOut, amountIn, minAmountOut, secret, user) → commitment
  MetaMask:     signs commitIntent(encryptedCommitment, deadline) → real Base Sepolia tx
  Contract:     stores intent hash → emits IntentCommitted

Step 2 — REVEAL DELAY (enforced by block number)
  REVEAL_DELAY blocks must pass before settlement is allowed
  Any solver attempting to settle early → EigenLayer bond slashed

Step 3 — SETTLE (contract logic written + deployed; execution simulated in Wave 1)
  Solver:    calls settleIntent(intentHash, poolKey, revealedIntent, zeroForOne)
  Contract:  validates commitment re-hash matches stored hash
  Contract:  executes swap through Uniswap V4 PoolManager
  Contract:  captures MEV, distributes to LPs / user / protocol / solver
  Contract:  emits IntentSettled + RevenueDistributed
```

---

## Backend API

**Base URL:** `http://localhost:3001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/intent` | List all intents (newest first) |
| `POST` | `/api/intent/commit` | Submit intent via backend (encrypts + sends tx) |
| `POST` | `/api/intent/record` | Record a MetaMask-signed intent in DB |
| `GET` | `/api/intent/:hash` | Get single intent status (on-chain + DB) |
| `GET` | `/api/intent/:hash/decrypt` | Reveal intent parameters |
| `POST` | `/api/solver/settle` | Trigger settlement for an open intent |
| `GET` | `/api/rewards/summary` | Penalty totals and user reward share |
| `POST` | `/api/rewards/claim` | Claim pending rewards |

---

## Frontend Pages

| Page | Description |
|------|-------------|
| Dashboard | Pool monitor, live stats, attacker shame wall |
| Commit | FHE-encrypt and submit a swap intent via MetaMask |
| Intents | Track open/settled intents, trigger settlement |
| Rewards | View caught attackers, claim MEV rebates |
| Solver | Register/unregister as solver, post bond |
| Settings | Configure Portal Hook address and backend URL |

---

## Technology Stack

**Smart Contracts:**
- Solidity 0.8.26
- Uniswap V4 `BaseHook`, `IPoolManager`, `PoolKey`, `BalanceDelta`
- OpenZeppelin `SafeERC20`, `IERC20`
- Foundry (forge build, forge script)
- EigenLayer AVS interface for solver bond/slash

**Encryption:**
- Fhenix `fhenixjs` SDK — `FhenixClient`, `encrypt_uint128`
- Fhenix Nitrogen Testnet (Chain ID 5432)
- Fallback: `ethers.keccak256` for local dev without a Fhenix node

**Backend:**
- Node.js + TypeScript + Express
- TypeORM + PostgreSQL
- ethers.js v6
- nodemon + ts-node

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS
- ethers.js v6 `BrowserProvider`, `Contract`
- Raw `window.ethereum` (no wagmi — minimal dependencies)

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally
- MetaMask on **Base Sepolia** (Chain ID 84532) — the app auto-prompts to switch
- Foundry (`forge`) for contract work

### Clone

```bash
git clone <repo-url>
cd Portal_Protocol
```

### Smart Contracts

```bash
cd portal_hook
forge build
```

Deploy to Base Sepolia:

```bash
PRIVATE_KEY=0x... forge script script/DeployPortalHook.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast
```

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
Db_URL=postgres://username@localhost:5432/portal_db
PORTAL_ADDRESS=0x84124Cd923b366F7B8411E4dEaC7EACeb936C6F4
RPC_URL=https://sepolia.base.org
PORT=3001
PRIVATE_KEY=0x...
DB_SSL=false
FHENIX_RPC_URL=https://api.nitrogen.fhenix.zone
FHENIX_CHAIN_ID=5432
```

```bash
npm run dev
```

### Frontend

```bash
cd portal_frontend
npm install
```

Create `portal_frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:3001
VITE_PORTAL_ADDRESS=0x84124Cd923b366F7B8411E4dEaC7EACeb936C6F4
```

```bash
npm run dev
```

Open `http://localhost:5173` and connect MetaMask on Base Sepolia.

---

## Project Structure

```
Portal_Protocol/
├── portal_hook/                        # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── PortalHook.sol              # Main hook — commit, settle, penalize, distribute
│   │   ├── IntentRegistry.sol          # Intent storage and lookup helpers
│   │   └── MockSwapper.sol             # Test swapper for local dev
│   ├── script/
│   │   ├── DeployPortalHook.s.sol      # Production deploy script
│   │   ├── DeployTestSetup.s.sol       # Local Anvil full setup
│   │   ├── SetupRealPool.s.sol         # Uniswap V4 pool initialization
│   │   └── SetupTestTokens.s.sol       # Deploy test ERC-20 tokens
│   └── foundry.toml
│
├── backend/                            # Node.js + TypeScript API
│   ├── src/
│   │   ├── index.ts                    # Express entry point
│   │   ├── controllers/
│   │   │   ├── intent.controller.ts    # commitIntent, recordIntent, decryptIntent
│   │   │   ├── solver.controller.ts    # settle endpoint
│   │   │   └── rewards.controller.ts  # summary, claim
│   │   ├── services/
│   │   │   ├── fhenix.service.ts       # FHE encryption via Fhenix SDK
│   │   │   ├── contract.service.ts     # ethers.js contract interaction
│   │   │   └── solver.service.ts       # Settlement + penalty logic
│   │   ├── entities/
│   │   │   ├── Intent.ts               # TypeORM — intent records
│   │   │   ├── AttackerPenalty.ts      # TypeORM — caught frontrunners
│   │   │   └── RewardClaim.ts          # TypeORM — reward claim history
│   │   ├── routes/
│   │   │   ├── intent.routes.ts
│   │   │   ├── solver.routes.ts
│   │   │   └── rewards.routes.ts
│   │   └── db/
│   │       └── data-source.ts          # TypeORM PostgreSQL config
│   └── .env.example
│
└── portal_frontend/                    # React + Vite frontend
    └── src/
        ├── components/
        │   └── Layout.tsx              # App shell, wallet connect, chain detection
        └── pages/
            ├── Dashboard.tsx           # Pool monitor + attacker shame wall
            ├── CommitPage.tsx          # FHE encrypt + MetaMask sign
            ├── IntentsPage.tsx         # Intent tracking + settle trigger
            ├── RewardsPage.tsx         # Penalty display + claim flow
            ├── SolverPage.tsx          # Solver registration + bond
            └── SettingsPage.tsx        # Hook address + backend URL config
```

---

## Security Model

### What is hidden from the mempool

| Data | Visibility |
|------|------------|
| `tokenIn` | Hidden — inside FHE ciphertext |
| `tokenOut` | Hidden — inside FHE ciphertext |
| `amountIn` | Hidden — FHE `euint128` |
| `minAmountOut` | Hidden — inside FHE ciphertext |
| `secret` | Hidden — never revealed on-chain |
| `user address` | Visible (required for gas) |
| `deadline` | Visible (needed for expiry enforcement) |

### What prevents frontrunning

1. **FHE encryption** — swap parameters are ciphertext in the mempool; nothing to copy
2. **REVEAL_DELAY** — settlement blocked until after the commit window; early attempts are penalized
3. **Secret binding** — the reveal must include the original `secret`; a copied commitment cannot be settled by anyone else
4. **EigenLayer slashing** — solvers who frontrun lose their bond; economic cost exceeds any potential gain

### Contract security

- Reveal validation re-hashes all parameters and compares to stored commitment — replay-proof
- `IntentAlreadySettled` guard prevents double-settlement
- `IntentExpired` enforces deadlines
- `UnauthorizedSolver` blocks non-bonded addresses from settling

---

## Roadmap

### Wave 1 — Core Protocol (current)
- [x] `PortalHook.sol` deployed to Base Sepolia
- [x] `commitIntent` live on-chain with real MetaMask signing
- [x] Fhenix FHE SDK integrated (`encrypt_uint128`)
- [x] EigenLayer solver bond + slash logic in contract
- [x] Full frontend — pool monitor, shame wall, rewards, solver pages
- [x] PostgreSQL-backed intent and penalty tracking

### Wave 2 — Full Execution
- [ ] Deploy test ERC-20 tokens on Base Sepolia
- [ ] Create Uniswap V4 pool with test token liquidity
- [ ] Wire `settleIntent` to the live PoolManager
- [ ] Connect to Fhenix Nitrogen testnet for real FHE ciphertext
- [ ] EigenLayer AVS mainnet slash wiring
- [ ] Foundry test suite

### Wave 3 — Production
- [ ] Cross-chain intent support (LayerZero / CCIP)
- [ ] Competitive solver network with open registration
- [ ] Governance for revenue split parameters
- [ ] Mainnet deployment

---

## Built With

- [Fhenix](https://fhenix.io) — Fully Homomorphic Encryption on EVM
- [Uniswap V4](https://docs.uniswap.org/contracts/v4/overview) — Hook-based AMM architecture
- [EigenLayer](https://eigenlayer.xyz) — Restaking and AVS for solver bond/slash
- [Base Sepolia](https://docs.base.org) — Testnet deployment
- [Foundry](https://book.getfoundry.sh) — Smart contract toolchain
- [ethers.js v6](https://docs.ethers.org/v6) — EVM interaction
- [TypeORM](https://typeorm.io) — PostgreSQL ORM
- [React 18](https://react.dev) + [Vite](https://vite.dev) — Frontend

---

## License

MIT
