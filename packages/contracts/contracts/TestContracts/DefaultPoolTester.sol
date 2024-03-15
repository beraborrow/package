// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../DefaultPool.sol";

contract DefaultPoolTester is DefaultPool {
    
    function unprotectedIncreaseNECTDebt(uint _amount) external {
        NECTDebt  = NECTDebt.add(_amount);
    }

    function unprotectedPayable() external payable {
        iBGT = iBGT.add(msg.value);
    }
}
