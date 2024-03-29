// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../StabilityPool.sol";

contract StabilityPoolTester is StabilityPool {
    
    // function unprotectedPayable() external payable {
    //     iBGT = iBGT.add(msg.value);
    // }
    // burner0621 modified
    function unprotectedPayable(uint _amount) external {
        iBGT = iBGT.add(_amount);
    }
    //////////////////////

    function setCurrentScale(uint128 _currentScale) external {
        currentScale = _currentScale;
    }

    function setTotalDeposits(uint _totalNECTDeposits) external {
        totalNECTDeposits = _totalNECTDeposits;
    }
}
