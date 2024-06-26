// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Dependencies/IERC20.sol";
import "../Dependencies/console.sol";


contract BorrowerOperationsScript is CheckContract {
    IBorrowerOperations immutable borrowerOperations;
    IERC20 immutable iBGTToken;

    constructor(IBorrowerOperations _borrowerOperations, address _ibgtTokenAddress) public {
        checkContract(address(_borrowerOperations));
        borrowerOperations = _borrowerOperations;
        iBGTToken = IERC20(_ibgtTokenAddress);
    }

    function openTrove(uint _maxFee, uint _NECTAmount, address _upperHint, address _lowerHint, uint _ibgtAmount) external {
        // borrowerOperations.openTrove{ value: msg.value }(_maxFee, _NECTAmount, _upperHint, _lowerHint);
        // burner0621 modified
        iBGTToken.transferFrom(msg.sender, address(this), _ibgtAmount);
        iBGTToken.approve(address(borrowerOperations), _ibgtAmount);
        borrowerOperations.openTrove(_maxFee, _NECTAmount, _upperHint, _lowerHint, _ibgtAmount);
        //////////////////////
    }

    function addColl(address _upperHint, address _lowerHint, uint _ibgtAmount) external {
        // borrowerOperations.addColl{ value: msg.value }(_upperHint, _lowerHint);
        // burner0621 modified
        borrowerOperations.addColl(_upperHint, _lowerHint, _ibgtAmount);
        //////////////////////
    }

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawNECT(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawNECT(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayNECT(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayNECT(_amount, _upperHint, _lowerHint);
    }

    function closeTrove() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint, uint _ibgtAmount) external {
        // borrowerOperations.adjustTrove{ value: msg.value }(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint);
        // burner0621 modified
        borrowerOperations.adjustTrove(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint, _ibgtAmount);
        //////////////////////
    }

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}
