// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPool.sol";


interface IDefaultPool is IPool {
    // --- Events ---
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event DefaultPoolNECTDebtUpdated(uint _NECTDebt);
    event DefaultPooliBGTBalanceUpdated(uint _iBGT);

    // --- Functions ---
    function sendiBGTToActivePool(uint _amount) external;

    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external;
    ///////////////////////////////
}
