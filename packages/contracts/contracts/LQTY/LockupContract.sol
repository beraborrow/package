// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/SafeMath.sol";
import "../Interfaces/IPOLLENToken.sol";

/*
* The lockup contract architecture utilizes a single LockupContract, with an unlockTime. The unlockTime is passed as an argument 
* to the LockupContract's constructor. The contract's balance can be withdrawn by the beneficiary when block.timestamp > unlockTime. 
* At construction, the contract checks that unlockTime is at least one year later than the BeraBorrow system's deployment time. 

* Within the first year from deployment, the deployer of the POLLENToken (BeraBorrow AG's address) may transfer POLLEN only to valid 
* LockupContracts, and no other addresses (this is enforced in POLLENToken.sol's transfer() function).
* 
* The above two restrictions ensure that until one year after system deployment, POLLEN tokens originating from BeraBorrow AG cannot 
* enter circulating supply and cannot be staked to earn system revenue.
*/
contract LockupContract {
    using SafeMath for uint;

    // --- Data ---
    string constant public NAME = "LockupContract";

    uint constant public SECONDS_IN_ONE_YEAR = 31536000; 

    address public immutable beneficiary;

    IPOLLENToken public pollenToken;

    // Unlock time is the Unix point in time at which the beneficiary can withdraw.
    uint public unlockTime;

    // --- Events ---

    event LockupContractCreated(address _beneficiary, uint _unlockTime);
    event LockupContractEmptied(uint _POLLENwithdrawal);

    // --- Functions ---

    constructor 
    (
        address _pollenTokenAddress, 
        address _beneficiary, 
        uint _unlockTime
    )
        public 
    {
        pollenToken = IPOLLENToken(_pollenTokenAddress);

        /*
        * Set the unlock time to a chosen instant in the future, as long as it is at least 1 year after
        * the system was deployed 
        */
        _requireUnlockTimeIsAtLeastOneYearAfterSystemDeployment(_unlockTime);
        unlockTime = _unlockTime;
        
        beneficiary =  _beneficiary;
        emit LockupContractCreated(_beneficiary, _unlockTime);
    }

    function withdrawPOLLEN() external {
        _requireCallerIsBeneficiary();
        _requireLockupDurationHasPassed();

        IPOLLENToken pollenTokenCached = pollenToken;
        uint POLLENBalance = pollenTokenCached.balanceOf(address(this));
        pollenTokenCached.transfer(beneficiary, POLLENBalance);
        emit LockupContractEmptied(POLLENBalance);
    }

    // --- 'require' functions ---

    function _requireCallerIsBeneficiary() internal view {
        require(msg.sender == beneficiary, "LockupContract: caller is not the beneficiary");
    }

    function _requireLockupDurationHasPassed() internal view {
        require(block.timestamp >= unlockTime, "LockupContract: The lockup duration must have passed");
    }

    function _requireUnlockTimeIsAtLeastOneYearAfterSystemDeployment(uint _unlockTime) internal view {
        uint systemDeploymentTime = pollenToken.getDeploymentStartTime();
        require(_unlockTime >= systemDeploymentTime.add(SECONDS_IN_ONE_YEAR), "LockupContract: unlock time must be at least one year after system deployment");
    }
}
