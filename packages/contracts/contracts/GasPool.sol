// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;


/**
 * The purpose of this contract is to hold NECT tokens for gas compensation:
 * https://github.com/beraborrow/dev#gas-compensation
 * When a borrower opens a trove, an additional 50 NECT debt is issued,
 * and 50 NECT is minted and sent to this contract.
 * When a borrower closes their active trove, this gas compensation is refunded:
 * 50 NECT is burned from the this contract's balance, and the corresponding
 * 50 NECT debt on the trove is cancelled.
 * See this issue for more context: https://github.com/beraborrow/dev/issues/186
 */
contract GasPool {
    // do nothing, as the core contracts have permission to send to and burn from this address
}
