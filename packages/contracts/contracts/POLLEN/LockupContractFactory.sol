// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Interfaces/ILockupContractFactory.sol";
import "./LockupContract.sol";
import "../Dependencies/console.sol";

/*
* The LockupContractFactory deploys LockupContracts - its main purpose is to keep a registry of valid deployed 
* LockupContracts. 
* 
* This registry is checked by POLLENToken when the BeraBorrow deployer attempts to transfer POLLEN tokens. During the first year 
* since system deployment, the BeraBorrow deployer is only allowed to transfer POLLEN to valid LockupContracts that have been 
* deployed by and recorded in the LockupContractFactory. This ensures the deployer's POLLEN can't be traded or staked in the
* first year, and can only be sent to a verified LockupContract which unlocks at least one year after system deployment.
*
* LockupContracts can of course be deployed directly, but only those deployed through and recorded in the LockupContractFactory 
* will be considered "valid" by POLLENToken. This is a convenient way to verify that the target address is a genuine 
* LockupContract.
*/

contract LockupContractFactory is ILockupContractFactory, Ownable, CheckContract {
    using SafeMath for uint;

    // --- Data ---
    string constant public NAME = "LockupContractFactory";

    uint constant public SECONDS_IN_ONE_YEAR = 31536000;

    address public pollenTokenAddress;
    
    mapping (address => address) public lockupContractToDeployer;

    // --- Events ---

    event POLLENTokenAddressSet(address _pollenTokenAddress);
    event LockupContractDeployedThroughFactory(address _lockupContractAddress, address _beneficiary, uint _unlockTime, address _deployer);

    // --- Functions ---

    function setPOLLENTokenAddress(address _pollenTokenAddress) external override onlyOwner {
        checkContract(_pollenTokenAddress);

        pollenTokenAddress = _pollenTokenAddress;
        emit POLLENTokenAddressSet(_pollenTokenAddress);

        _renounceOwnership();
    }

    function deployLockupContract(address _beneficiary, uint _unlockTime) external override {
        address pollenTokenAddressCached = pollenTokenAddress;
        _requirePOLLENAddressIsSet(pollenTokenAddressCached);
        LockupContract lockupContract = new LockupContract(
                                                        pollenTokenAddressCached,
                                                        _beneficiary, 
                                                        _unlockTime);

        lockupContractToDeployer[address(lockupContract)] = msg.sender;
        emit LockupContractDeployedThroughFactory(address(lockupContract), _beneficiary, _unlockTime, msg.sender);
    }

    function isRegisteredLockup(address _contractAddress) public view override returns (bool) {
        return lockupContractToDeployer[_contractAddress] != address(0);
    }

    // --- 'require'  functions ---
    function _requirePOLLENAddressIsSet(address _pollenTokenAddress) internal pure {
        require(_pollenTokenAddress != address(0), "LCF: POLLEN Address is not set");
    }
}
