// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event POLLENTokenAddressSet(address _pollenTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event TotalPOLLENIssuedUpdated(uint _totalPOLLENIssued);

    // --- Functions ---

    function setAddresses(address _pollenTokenAddress, address _stabilityPoolAddress) external;

    function issuePOLLEN() external returns (uint);

    function sendPOLLEN(address _account, uint _POLLENamount) external;
}
