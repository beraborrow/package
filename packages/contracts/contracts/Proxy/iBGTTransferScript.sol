// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/IERC20.sol";
import "../Dependencies/console.sol";

// contract iBGTTransferScript is CheckContract {
contract iBGTTransferScript {

    function transferiBGT(address _recipient, uint256 _amount, address _ibgtTokenAddress) external returns (bool) {
        // (bool success, ) = _recipient.call{value: _amount}("");
        // burner0621 modified
        IERC20 token = IERC20(_ibgtTokenAddress);
        bool success = token.transfer(_recipient, _amount);
        ////////////////////////////////
        return success;
    }
}
