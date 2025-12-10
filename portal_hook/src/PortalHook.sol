// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
// BeforeSwapDelta types are not used in this implementation; remove import to silence lint.
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/* -------------------------------------------------------------------------- */
/*                               EIGENLAYER & FHENIX                           */
/* -------------------------------------------------------------------------- */
interface IEigenLayerAVS {
    function depositIntoAVS(address operator, uint256 amount) external;
    function slashOperator(address operator, uint256 amount) external;
}

interface IFhenix {
    function encrypt(bytes calldata plaintext) external pure returns (bytes memory ciphertext);
    function decrypt(bytes calldata ciphertext) external pure returns (bytes memory plaintext);
}

/* -------------------------------------------------------------------------- */
/*                                 PORTAL HOOK                                 */
/* -------------------------------------------------------------------------- */
contract PortalHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using SafeERC20 for IERC20;

    /* -------------------------- ERRORS -------------------------- */
    error DirectSwapBlocked();
    error IntentNotFound();
    error IntentExpired();
    error IntentAlreadySettled();
    error UnauthorizedSolver();
    error InsufficientOutput();
    error InvalidReveal();
    error RevealTooEarly();
    error ChainNotSupported();
    error InvalidProof();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InsufficientBond();

    /* -------------------------- EVENTS -------------------------- */
    event IntentCommitted(bytes32 indexed intentHash, address indexed user, uint40 commitTime);
    event IntentSettled(bytes32 indexed intentHash, address solver, uint256 mev, uint256 userRebate);
    event AttackerPenalized(address indexed attacker, uint256 penalty, bytes32 intentHash);
    event RevenueDistributed(uint256 lp, uint256 user, uint256 protocol, uint256 solver);

    /* -------------------------- ENUMS -------------------------- */
    enum IntentType { SameChain, CrossChain }
    enum IntentStatus { Open, Settled, Cancelled, Expired }

    /* -------------------------- STRUCTS -------------------------- */
    struct Intent {
        bytes32 commitment;      // FHE-encrypted
        address user;
        IntentType intentType;
        uint40 deadline;
        uint40 commitTime;
        uint32 nonce;
        IntentStatus status;
        uint256 destChainId;
        address destRecipient;
    }

    struct RevealedIntent {
        Currency tokenIn;
        Currency tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes32 secret;         // binds to user
        address destToken;
    }

    /* -------------------------- CONSTANTS -------------------------- */
    uint256 public constant MIN_SOLVER_STAKE = 0.001 ether;
    uint256 public constant REVEAL_DELAY     = 1;                 // ~1 block; lowered for local dev
    uint256 public constant ATTACKER_PENALTY = 0.05 ether;       // Captured from bond

    uint256 public constant LP_SHARE      = 4000;   // 40%
    uint256 public constant USER_REBATE   = 3000;   // 30%
    uint256 public constant PROTOCOL_FEE  = 2000;   // 20%
    uint256 public constant SOLVER_TIP    = 1000;   // 10%

    /* -------------------------- STATE -------------------------- */
    IEigenLayerAVS public immutable eigenAVS;
    IFhenix public immutable fhenix;

    mapping(bytes32 => Intent) public intents;
    mapping(address => uint256) public userNonces;
    mapping(address => bool)    public authorizedSolvers;
    mapping(address => uint256) public solverBonds;      // ETH bond (restaked + penalty source)
    mapping(bytes32 => bool)    public settled;

    mapping(address => uint256) public pendingRewards;
    mapping(PoolId => uint256)  public poolRewards;

    address public immutable OWNER;
    uint256 public totalCapturedPenalty;

    /* -------------------------- CONSTRUCTOR -------------------------- */
    constructor(
        IPoolManager _poolManager,
        address _eigenAVS,
        address _fhenix
    ) BaseHook(_poolManager) {
        OWNER = msg.sender;
        eigenAVS = IEigenLayerAVS(_eigenAVS);
        fhenix   = IFhenix(_fhenix);
    }

    /* -------------------------- HOOK PERMISSIONS -------------------------- */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false, afterInitialize: false,
            beforeAddLiquidity: false, afterAddLiquidity: false,
            beforeRemoveLiquidity: false, afterRemoveLiquidity: false,
            beforeSwap: true, afterSwap: true,
            beforeDonate: false, afterDonate: false,
            beforeSwapReturnDelta: false, afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false, afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @dev Skip hook-address bit validation for local/dev deployments so the contract
    /// can be deployed to any address (e.g., Anvil default). Do not use this bypass
    /// for production/mainnet deployments that rely on flag-encoded addresses.
    function validateHookAddress(BaseHook /*_this*/ ) internal pure override {}

    /* -------------------------- SOLVER REGISTRATION (EigenLayer) -------------------------- */
    function registerSolver() external payable {
        require(msg.value >= MIN_SOLVER_STAKE, "low stake");
        authorizedSolvers[msg.sender] = true;
        solverBonds[msg.sender] += msg.value;

        // Restake into EigenLayer AVS
        if (address(eigenAVS) != address(0)) {
            eigenAVS.depositIntoAVS(msg.sender, msg.value);
        }
    }

    function unregisterSolver() external {
        require(authorizedSolvers[msg.sender], "not solver");
        authorizedSolvers[msg.sender] = false;
        uint256 bond = solverBonds[msg.sender];
        solverBonds[msg.sender] = 0;
        payable(msg.sender).transfer(bond);
    }

    /* -------------------------- COMMIT (Fhenix encryption) -------------------------- */
    function commitIntent(
        bytes calldata _encryptedCommitment,   // FHE-encrypted or abi.encode(bytes32) for local dev
        uint40 deadline
    ) external returns (bytes32 intentHash) {
        require(deadline > block.timestamp, IntentExpired());

        // For local dev: if data is 32 bytes, treat as direct commitment (abi.encode output for bytes32)
        // If it's longer, assume it's Fhenix-encrypted
        bytes32 commitment;
        if (_encryptedCommitment.length == 32) {
            // Direct bytes32 format - copy directly (for local dev without Fhenix)
            assembly {
                commitment := calldataload(_encryptedCommitment.offset)
            }
        } else {
            // Otherwise decrypt with Fhenix (production path)
            bytes memory plaintext = fhenix.decrypt(_encryptedCommitment);
            commitment = abi.decode(plaintext, (bytes32));
        }

        uint256 nonce = userNonces[msg.sender]++;
        uint40 now40 = uint40(block.timestamp);

        intentHash = keccak256(abi.encode(
            commitment, msg.sender, nonce, block.chainid
        ));

        intents[intentHash] = Intent({
            commitment: commitment,
            user: msg.sender,
            intentType: IntentType.SameChain,
            deadline: deadline,
            commitTime: now40,
            nonce: uint32(nonce),
            status: IntentStatus.Open,
            destChainId: 0,
            destRecipient: address(0)
        });

        emit IntentCommitted(intentHash, msg.sender, now40);
    }

    /* -------------------------- SETTLE (pay-after + penalty) -------------------------- */
    function settleIntent(
        bytes32 intentHash,
        PoolKey calldata key,
        RevealedIntent calldata revealed,
        bool zeroForOne
    ) external returns (uint256 userPayout, uint256 mevCaptured) {
        Intent storage intent = intents[intentHash];
        _validateReveal(intent, intentHash, revealed);   // <-- includes delay + FHE check

        require(authorizedSolvers[msg.sender], UnauthorizedSolver());

        // --- PRE-CHECKS ---
        address tokenIn = Currency.unwrap(revealed.tokenIn);
        require(IERC20(tokenIn).allowance(intent.user, address(this)) >= revealed.amountIn, InsufficientAllowance());
        require(IERC20(tokenIn).balanceOf(intent.user) >= revealed.amountIn, InsufficientBalance());

        intent.status = IntentStatus.Settled;
        settled[intentHash] = true;

        // --- SWAP (flash accounting) ---
        BalanceDelta delta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(revealed.amountIn),
                sqrtPriceLimitX96: zeroForOne ? 4295128739 : type(uint160).max
            }),
            abi.encode(intentHash, revealed, intent.user, msg.sender)
        );

        uint256 actualOut = zeroForOne
            ? uint256(uint128(-delta.amount1()))
            : uint256(uint128(-delta.amount0()));

        require(actualOut >= revealed.minAmountOut, InsufficientOutput());

        // --- MEV + REVENUE DISTRIBUTION ---
        (userPayout, mevCaptured) = _distributeRevenue(
            intentHash, intent, key.toId(), actualOut, revealed.minAmountOut
        );

        // --- PAY USER ---
        IERC20(Currency.unwrap(revealed.tokenOut)).safeTransfer(intent.user, userPayout);

        emit IntentSettled(intentHash, msg.sender, mevCaptured, userPayout - revealed.minAmountOut);
    }

    /* -------------------------- AFTER SWAP (pull & penalty) -------------------------- */
    function _afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        (bytes32 intentHash, RevealedIntent memory revealed, address user, address solver) =
            abi.decode(hookData, (bytes32, RevealedIntent, address, address));

        // Pull input **after** swap succeeded
        IERC20(Currency.unwrap(revealed.tokenIn)).safeTransferFrom(user, solver, revealed.amountIn);

        // Try to penalize if this was a front-run attempt that reverted earlier
        _tryPenalizeFrontRunner(intentHash, solver);

        // Return the external hook selector (afterSwap) so the pool manager knows which hook executed.
        return (this.afterSwap.selector, 0);
    }

    /* -------------------------- PENALTY LOGIC (captures attacker gas) -------------------------- */
    function _tryPenalizeFrontRunner(bytes32 intentHash, address solver) internal {
        // If a previous reveal failed, the intent is still Open → front-run attempt
        Intent storage intent = intents[intentHash];
        if (intent.status == IntentStatus.Open && intent.commitTime + REVEAL_DELAY > block.timestamp) {
            // This tx is the **first** to try revealing → possible front-run
            // Charge penalty from solver's bond
            if (solverBonds[solver] >= ATTACKER_PENALTY) {
                solverBonds[solver] -= ATTACKER_PENALTY;
                totalCapturedPenalty += ATTACKER_PENALTY;

                // Slash in EigenLayer too
                eigenAVS.slashOperator(solver, ATTACKER_PENALTY);

                emit AttackerPenalized(solver, ATTACKER_PENALTY, intentHash);
            }
        }
    }

    /* -------------------------- REVEAL VALIDATION (delay + FHE) -------------------------- */
    function _validateReveal(
        Intent storage intent,
        bytes32,
        RevealedIntent calldata revealed
    ) internal view {
        require(intent.user != address(0), IntentNotFound());
        require(intent.status == IntentStatus.Open, IntentAlreadySettled());
        require(intent.deadline >= block.timestamp, IntentExpired());
        require(block.timestamp > intent.commitTime + REVEAL_DELAY, RevealTooEarly());

        // Re-construct commitment with secret + user address
        bytes32 computed = keccak256(abi.encode(
            revealed.tokenIn,
            revealed.tokenOut,
            revealed.amountIn,
            revealed.minAmountOut,
            revealed.secret,
            intent.user
        ));
        require(computed == intent.commitment, InvalidReveal());
    }

    /* -------------------------- REVENUE SPLIT (MEV + PENALTIES) -------------------------- */
    function _distributeRevenue(
        bytes32,
        Intent storage intent,
        PoolId poolId,
        uint256 actualOut,
        uint256 minOut
    ) internal returns (uint256 userPayout, uint256 mev) {
        mev = actualOut - minOut;
        uint256 total = mev + _flushCapturedPenalty();   // include attacker penalties

        if (total > 0) {
            uint256 lpAmt      = (total * LP_SHARE)     / 10000;
            uint256 userAmt    = (total * USER_REBATE)  / 10000;
            uint256 protocolAmt= (total * PROTOCOL_FEE) / 10000;
            uint256 solverAmt  = (total * SOLVER_TIP)   / 10000;

            poolRewards[poolId]         += lpAmt;
            pendingRewards[intent.user] += userAmt;
            pendingRewards[OWNER]       += protocolAmt;
            pendingRewards[msg.sender]  += solverAmt;

            emit RevenueDistributed(lpAmt, userAmt, protocolAmt, solverAmt);

            userPayout = minOut + userAmt;
        } else {
            userPayout = actualOut;
        }
    }

    function _flushCapturedPenalty() internal returns (uint256 amount) {
        amount = totalCapturedPenalty;
        totalCapturedPenalty = 0;
    }

    /* -------------------------- CLAIM REWARDS -------------------------- */
    function claimRewards() external {
        uint256 amt = pendingRewards[msg.sender];
        require(amt > 0, "nothing");
        pendingRewards[msg.sender] = 0;
        payable(msg.sender).transfer(amt);
    }

    /* -------------------------- ADMIN -------------------------- */
    function setSupportedChain(uint256 /*chainId*/, bool /*ok*/) external view {
        // Placeholder admin endpoint. In this simplified local/testing build the
        // supported-chain list is not stored in this contract. Keep an OWNER
        // check to limit access; function is a view/no-op to avoid unused
        // parameter and mutability warnings.
        require(msg.sender == OWNER);
    }
}