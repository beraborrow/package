// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/IERC20.sol";


contract NonPayable is CheckContract{
    bool isPayable;

    function setPayable(bool _isPayable) external {
        isPayable = _isPayable;
    }

    // burner0621 modified
    // function forward(address _dest, bytes calldata _data) external payable {
    function forward(address _dest, bytes calldata _data) external {
        // (bool success, bytes memory returnData) = _dest.call{ value: msg.value }(_data);
        // burner0621 modified
        (bool success, bytes memory returnData) = _dest.call(_data);
        //////////////////////
        //console.logBytes(returnData);
        require(success, string(returnData));
    }

    receive() external payable {
        require(isPayable);
    }
}
