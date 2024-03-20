// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Interfaces/IDefaultPool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import './Interfaces/IActivePool.sol';
import "./Dependencies/IERC20.sol";

/*
 * The Default Pool holds the iBGT and NECT debt (but not NECT tokens) from liquidations that have been redistributed
 * to active troves but not yet "applied", i.e. not yet recorded on a recipient active trove's struct.
 *
 * When a trove makes an operation that applies its pending iBGT and NECT debt, its pending iBGT and NECT debt is moved
 * from the Default Pool to the Active Pool.
 */
contract DefaultPool is Ownable, CheckContract, IDefaultPool {
    using SafeMath for uint256;

    string constant public NAME = "DefaultPool";

    address public troveManagerAddress;
    address public activePoolAddress;
    uint256 internal iBGT;  // deposited iBGT tracker
    uint256 internal NECTDebt;  // debt

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event DefaultPoolNECTDebtUpdated(uint _NECTDebt);
    event DefaultPooliBGTBalanceUpdated(uint _iBGT);

    // --- Dependency setters ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress
    )
        external
        onlyOwner
    {
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);

        troveManagerAddress = _troveManagerAddress;
        activePoolAddress = _activePoolAddress;

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);

        _renounceOwnership();
    }

    // --- Getters for public variables. Required by IPool interface ---

    /*
    * Returns the iBGT state variable.
    *
    * Not necessarily equal to the the contract's raw iBGT balance - ibgt can be forcibly sent to contracts.
    */
    function getiBGT() external view override returns (uint) {
        return iBGT;
    }

    function getNECTDebt() external view override returns (uint) {
        return NECTDebt;
    }

    // --- Pool functionality ---

    function sendiBGTToActivePool(uint _amount) external override {
        _requireCallerIsTroveManager();
        address activePool = activePoolAddress; // cache to save an SLOAD
        iBGT = iBGT.sub(_amount);
        emit DefaultPooliBGTBalanceUpdated(iBGT);
        emit iBGTSent(activePool, _amount);

        // (bool success, ) = activePool.call{ value: _amount }("");
        // require(success, "DefaultPool: sending iBGT failed");
        // burner0621 modified for iBGT
        IERC20 token = IERC20(IBGT_ADDRESS);
        bool success = token.transfer(activePool, _amount);
        require(success, "DefaultPool: sending iBGT failed");
        IActivePool(activePool).receiveiBGT(_amount);
        ////////////////////////////////
    }

    function increaseNECTDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        NECTDebt = NECTDebt.add(_amount);
        emit DefaultPoolNECTDebtUpdated(NECTDebt);
    }

    function decreaseNECTDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        NECTDebt = NECTDebt.sub(_amount);
        emit DefaultPoolNECTDebtUpdated(NECTDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "DefaultPool: Caller is not the ActivePool");
    }

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "DefaultPool: Caller is not the TroveManager");
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsActivePool();
        iBGT = iBGT.add(msg.value);
        emit DefaultPooliBGTBalanceUpdated(iBGT);
    }

    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external override {
        _requireCallerIsActivePool();
        iBGT = iBGT.add(_amount);
        emit DefaultPooliBGTBalanceUpdated(iBGT);
    }
    ///////////////////////////////
}
