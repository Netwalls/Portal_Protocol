// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IntentRegistry
/// @notice A registry to track the unique hash and status of signed user intents.
contract IntentRegistry {
    enum IntentStatus {
        Unsubmitted, // Default state (0)
        Submitted,   // Intent has been recorded (1)
        Settled      // Intent has been successfully executed (2)
    }

    // Maps a unique intent hash to its current status.
    mapping(bytes32 => IntentStatus) public intentStatus;

    /// @notice Records a new user intent, changing its status from default to Submitted.
    /// @param _intentHash The unique hash of the signed intent.
    function recordIntent(bytes32 _intentHash) external {
        // Only allow recording if it hasn't been seen yet (default 0)
        require(intentStatus[_intentHash] == IntentStatus.Unsubmitted, "Intent already known");
        intentStatus[_intentHash] = IntentStatus.Submitted;
    }

    /// @notice Marks a recorded intent as Settled (executed).
    /// @param _intentHash The unique hash of the executed intent.
    function executeIntent(bytes32 _intentHash) external {
        // Only allow execution if it was previously submitted.
        require(intentStatus[_intentHash] == IntentStatus.Submitted, "Intent not submitted or already settled");
        intentStatus[_intentHash] = IntentStatus.Settled;
    }
}
