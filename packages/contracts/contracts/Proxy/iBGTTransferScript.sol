// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/IERC20.sol";
// import "../Dependencies/CheckContract.sol";

// contract iBGTTransferScript is CheckContract {
contract iBGTTransferScript {

    address private iBGTTokenAddress;

    function setiBGTTokenAddress (address _ibgtTokenAddress) public {
        iBGTTokenAddress = _ibgtTokenAddress;
    }

    function transferiBGT(address _recipient, uint256 _amount) external returns (bool) {
        // (bool success, ) = _recipient.call{value: _amount}("");
        // burner0621 modified
        IERC20 token = IERC20(iBGTTokenAddress);
        bool success = token.transfer(_recipient, _amount);
        ////////////////////////////////
        return success;
    }
}
