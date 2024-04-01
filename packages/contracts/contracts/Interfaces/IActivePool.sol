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
    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external;
    function iBGTTokenAddress() external view returns (address);
    ///////////////////////////////
}
