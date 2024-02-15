// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPool.sol";


interface IActivePool is IPool {
    // --- Events ---
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolNECTDebtUpdated(uint _NECTDebt);
    event ActivePooliBGTBalanceUpdated(uint _iBGT);

    // --- Functions ---
    function sendiBGT(address _account, uint _amount) external;
}
