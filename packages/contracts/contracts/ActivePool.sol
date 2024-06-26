// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Interfaces/IActivePool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./Dependencies/IERC20.sol";
import "./LPRewards/Dependencies/Address.sol";

// burner0621 modified for iBGT
interface ICDSPPool {
    function receiveiBGT(uint _amount) external;
}
///////////////////////////////

/*
 * The Active Pool holds the iBGT collateral and NECT debt (but not NECT tokens) for all active troves.
 *
 * When a trove is liquidated, it's iBGT and NECT debt are transferred from the Active Pool, to either the
 * Stability Pool, the Default Pool, or both, depending on the liquidation conditions.
 *
 */
contract ActivePool is Ownable, CheckContract, IActivePool {
    using SafeMath for uint256;

    string constant public NAME = "ActivePool";

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public stabilityPoolAddress;
    address public defaultPoolAddress;
    address private _iBGTTokenAddress;
    uint256 internal iBGT;  // deposited ibgt tracker
    uint256 internal NECTDebt;

    // --- Events ---

    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolNECTDebtUpdated(uint _NECTDebt);
    event ActivePooliBGTBalanceUpdated(uint _iBGT);

    // --- Contract setters ---

    function setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _defaultPoolAddress,
        address _ibgtTokenAddress
    )
        external
        onlyOwner
    {
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_ibgtTokenAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        troveManagerAddress = _troveManagerAddress;
        stabilityPoolAddress = _stabilityPoolAddress;
        defaultPoolAddress = _defaultPoolAddress;
        _iBGTTokenAddress = _ibgtTokenAddress;

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);

        _renounceOwnership();
    }

    // --- Getters for public variables. Required by IPool interface ---

    /*
    * Returns the iBGT state variable.
    *
    *Not necessarily equal to the the contract's raw iBGT balance - ibgt can be forcibly sent to contracts.
    */
    function getiBGT() external view override returns (uint) {
        return iBGT;
    }

    function getNECTDebt() external view override returns (uint) {
        return NECTDebt;
    }

    // --- Pool functionality ---

    function sendiBGT(address _account, uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        iBGT = iBGT.sub(_amount);
        emit ActivePooliBGTBalanceUpdated(iBGT);
        emit iBGTSent(_account, _amount);

        // (bool success, ) = _account.call{ value: _amount }("");
        // require(success, "ActivePool: sending iBGT failed");
        // burner0621 modified for iBGT
        IERC20 token = IERC20(_iBGTTokenAddress);
        bool success = token.transfer(_account, _amount);
        require(success, "ActivePool: sending iBGT failed");
        if (Address.isContract(_account)) {
            ICDSPPool(_account).receiveiBGT(_amount);
        }
        ////////////////////////////////
    }

    function increaseNECTDebt(uint _amount) external override {
        _requireCallerIsBOorTroveM();
        NECTDebt  = NECTDebt.add(_amount);
        ActivePoolNECTDebtUpdated(NECTDebt);
    }

    function decreaseNECTDebt(uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        NECTDebt = NECTDebt.sub(_amount);
        ActivePoolNECTDebtUpdated(NECTDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsBorrowerOperationsOrDefaultPool() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
            msg.sender == defaultPoolAddress,
            "ActivePool: Caller is neither BO nor Default Pool");
    }

    function _requireCallerIsBOorTroveMorSP() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
            msg.sender == troveManagerAddress ||
            msg.sender == stabilityPoolAddress,
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager nor StabilityPool");
    }

    function _requireCallerIsBOorTroveM() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
            msg.sender == troveManagerAddress,
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager");
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsBorrowerOperationsOrDefaultPool();
        iBGT = iBGT.add(msg.value);
        emit ActivePooliBGTBalanceUpdated(iBGT);
    }

    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external override {
        _requireCallerIsBorrowerOperationsOrDefaultPool();
        iBGT = iBGT.add(_amount);
        emit ActivePooliBGTBalanceUpdated(iBGT);
    }

    function iBGTTokenAddress() external view override returns (address) {
        return _iBGTTokenAddress;
    }
    ///////////////////////////////
}
