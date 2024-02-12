// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../POLLEN/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainPOLLEN(uint _amount) external {
        pollenToken.transfer(msg.sender, _amount);
    }

    function getCumulativeIssuanceFraction() external view returns (uint) {
       return _getCumulativeIssuanceFraction();
    }

    function unprotectedIssuePOLLEN() external returns (uint) {
        // No checks on caller address
       
        uint latestTotalPOLLENIssued = POLLENSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalPOLLENIssued.sub(totalPOLLENIssued);
      
        totalPOLLENIssued = latestTotalPOLLENIssued;
        return issuance;
    }
}
