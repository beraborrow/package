// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IPOLLENStaking.sol";


contract POLLENStakingScript is CheckContract {
    IPOLLENStaking immutable POLLENStaking;

    constructor(address _pollenStakingAddress) public {
        checkContract(_pollenStakingAddress);
        POLLENStaking = IPOLLENStaking(_pollenStakingAddress);
    }

    function stake(uint _POLLENamount) external {
        POLLENStaking.stake(_POLLENamount);
    }
}
