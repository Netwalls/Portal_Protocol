import fs from 'fs';
import path from 'path';

// Try to load the ABI from the portal_hook build artifacts so it's always in sync.
// Looks in env override first, then project-root relative path. This avoids resolving to
// backend/portal_hook (which does not exist in the mono-repo).
const envArtifactPath = process.env.PORTAL_ABI_PATH;
const projectRoot = path.resolve(__dirname, '../../..');
const defaultArtifactPath = path.join(projectRoot, 'portal_hook/out/PortalHook.sol/PortalHook.json');
const candidatePaths = [envArtifactPath, defaultArtifactPath].filter(Boolean) as string[];

let portalABI: any[] = [];
let loadedFrom: string | null = null;

for (const candidate of candidatePaths) {
  if (!fs.existsSync(candidate)) continue;
  try {
    const json = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    portalABI = json.abi || json.output?.abi || [];
    loadedFrom = candidate;
    break;
  } catch (e) {
    console.warn(`Failed to parse PortalHook ABI at ${candidate}:`, e);
  }
}

if (!portalABI.length) {
  console.warn(`Portal ABI not found. Checked: ${candidatePaths.join(', ')}. Using fallback minimal ABI for local/dev usage.`);
  // Minimal fallback ABI to allow basic interactions in dev when contract artifacts are not available.
  portalABI = [
    "function commitIntent(bytes32 commitment, uint40 deadline) payable",
    "function commitCrossChain(bytes32 commitment, uint40 deadline, uint256 destChainId, address destRecipient) payable",
    "event IntentCommitted(bytes32 indexed intentHash, address indexed user, bytes32 commitment, uint8 intentType, uint40 deadline, uint32 nonce, uint256 destChainId, address destRecipient)",
    "event IntentSettled(bytes32 indexed intentHash, address indexed solver, uint256 inputAmount, uint256 outputAmount, uint256 mevCaptured, uint256 userRebate)",
    "function getIntentStatus(bytes32 intentHash) view returns (address user, uint8 intentType, uint8 status, uint256 destChainId, uint40 deadline)",
    "function pendingRewards(address) view returns (uint256)",
    "function claimRewards()",
    "function registerSolver() payable",
    "function solverStake(address) view returns (uint256)"
  ];
} else if (loadedFrom) {
  console.log(`Loaded Portal ABI from ${loadedFrom}`);
}

export { portalABI };
