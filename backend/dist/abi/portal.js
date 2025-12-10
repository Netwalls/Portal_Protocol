"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalABI = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Try to load the ABI from the portal_hook build artifacts so it's always in sync.
// Fallback: export an empty ABI and log a warning so the app still starts.
const artifactPath = path_1.default.resolve(__dirname, '../../portal_hook/out/PortalHook.sol/PortalHook.json');
let portalABI = [];
exports.portalABI = portalABI;
if (fs_1.default.existsSync(artifactPath)) {
    try {
        const json = JSON.parse(fs_1.default.readFileSync(artifactPath, 'utf8'));
        exports.portalABI = portalABI = json.abi || json.output?.abi || [];
    }
    catch (e) {
        console.warn('Failed to parse PortalHook.json ABI:', e);
    }
}
else {
    console.warn(`Portal ABI not found at ${artifactPath}. Using fallback minimal ABI for local/dev usage.`);
    // Minimal fallback ABI to allow basic interactions in dev when contract artifacts are not available.
    exports.portalABI = portalABI = [
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
}
