// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/INECTToken.sol";

contract NECTTokenCaller {
    INECTToken NECT;

    function setNECT(INECTToken _NECT) external {
        NECT = _NECT;
    }

    function nectMint(address _account, uint _amount) external {
        NECT.mint(_account, _amount);
    }

    function nectBurn(address _account, uint _amount) external {
        NECT.burn(_account, _amount);
    }

    function nectSendToPool(address _sender,  address _poolAddress, uint256 _amount) external {
        NECT.sendToPool(_sender, _poolAddress, _amount);
    }

    function nectReturnFromPool(address _poolAddress, address _receiver, uint256 _amount ) external {
        NECT.returnFromPool(_poolAddress, _receiver, _amount);
    }
}
