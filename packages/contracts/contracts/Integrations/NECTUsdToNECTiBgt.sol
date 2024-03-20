// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;


interface IPriceFeed {
    function latestAnswer() external view returns (int256);
}


contract NECTUsdToNECTiBgt is IPriceFeed {
    IPriceFeed public constant NECT_USD = IPriceFeed(0x971Ff2D85DA8FE1e1533204cE2F3EA36F7d27c66);
    IPriceFeed public constant iBGT_USD = IPriceFeed(0x3DaD300A888CE2c31925079c1EBEb54feEE847B9);

    constructor() public {}

    function latestAnswer() external view override returns (int256) {
        return (NECT_USD.latestAnswer() * 1 ether) / iBGT_USD.latestAnswer();
    }
}
