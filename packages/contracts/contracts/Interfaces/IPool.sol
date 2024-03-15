// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

// Common interface for the Pools.
interface IPool {
    
    // --- Events ---
    
    event iBGTBalanceUpdated(uint _newBalance);
    event NECTBalanceUpdated(uint _newBalance);
    event ActivePoolAddressChanged(address _newActivePoolAddress);
    event DefaultPoolAddressChanged(address _newDefaultPoolAddress);
    event StabilityPoolAddressChanged(address _newStabilityPoolAddress);
    event iBGTSent(address _to, uint _amount);

    // --- Functions ---
    
    function getiBGT() external view returns (uint);

    function getNECTDebt() external view returns (uint);

    function increaseNECTDebt(uint _amount) external;

    function decreaseNECTDebt(uint _amount) external;
}
