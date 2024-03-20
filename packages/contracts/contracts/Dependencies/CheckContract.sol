// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;


contract CheckContract {
    address constant public IBGT_ADDRESS = 0x3B22f0466d98bE3040d2c51dE89b0479FDD48910; // berachain 0x61ac8568e1309342F4614b1D664E341A4E10C5b8
    /**
     * Check that the account is an already deployed non-destroyed contract.
     * See: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Address.sol#L12
     */
    function checkContract(address _account) internal view {
        require(_account != address(0), "Account cannot be zero address");

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(_account) }
        require(size > 0, "Account code size cannot be zero");
    }
}
