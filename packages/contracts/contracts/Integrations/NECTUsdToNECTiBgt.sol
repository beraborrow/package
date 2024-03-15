// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;


interface IPriceFeed {
    function latestAnswer() external view returns (int256);
}


contract NECTUsdToNECTiBgt is IPriceFeed {
    IPriceFeed public constant NECT_USD = IPriceFeed(0x6E6aEFef55730F7F91a93F20AEEc2ac6e14688B2);
    IPriceFeed public constant iBGT_USD = IPriceFeed(0xa74f9bF5e8c3A4567E56a3735665EB8242A0C2fD);

    constructor() public {}

    function latestAnswer() external view override returns (int256) {
        return (NECT_USD.latestAnswer() * 1 ether) / iBGT_USD.latestAnswer();
    }
}
