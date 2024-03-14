// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../POLLEN/POLLENStaking.sol";


contract POLLENStakingTester is POLLENStaking {
    function requireCallerIsTroveManager() external view {
        _requireCallerIsTroveManager();
    }
}
