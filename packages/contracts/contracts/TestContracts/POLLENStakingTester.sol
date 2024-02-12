// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../pollen/pollenStaking.sol";


contract pollenStakingTester is pollenStaking {
    function requireCallerIsTroveManager() external view {
        _requireCallerIsTroveManager();
    }
}
