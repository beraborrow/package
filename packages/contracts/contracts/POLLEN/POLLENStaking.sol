// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/BaseMath.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/console.sol";
import "../Interfaces/IPOLLENToken.sol";
import "../Interfaces/IPOLLENStaking.sol";
import "../Interfaces/IActivePool.sol";
import "../Dependencies/BeraBorrowMath.sol";
import "../Interfaces/INECTToken.sol";
import "../Dependencies/IERC20.sol";

contract POLLENStaking is IPOLLENStaking, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Data ---
    string constant public NAME = "POLLENStaking";

    mapping( address => uint) public stakes;
    uint public totalPOLLENStaked;

    uint public F_iBGT;  // Running sum of iBGT fees per-POLLEN-staked
    uint public F_NECT; // Running sum of POLLEN fees per-POLLEN-staked

    // User snapshots of F_iBGT and F_NECT, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots; 

    struct Snapshot {
        uint F_iBGT_Snapshot;
        uint F_NECT_Snapshot;
    }
    
    IPOLLENToken public pollenToken;
    INECTToken public nectToken;

    address public troveManagerAddress;
    address public borrowerOperationsAddress;
    address public activePoolAddress;

    // --- Events ---

    event POLLENTokenAddressSet(address _pollenTokenAddress);
    event NECTTokenAddressSet(address _nectTokenAddress);
    event TroveManagerAddressSet(address _troveManager);
    event BorrowerOperationsAddressSet(address _borrowerOperationsAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint NECTGain, uint iBGTGain);
    event F_iBGTUpdated(uint _F_iBGT);
    event F_NECTUpdated(uint _F_NECT);
    event TotalPOLLENStakedUpdated(uint _totalPOLLENStaked);
    event iBGTSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_iBGT, uint _F_NECT);

    // --- Functions ---

    function setAddresses
    (
        address _pollenTokenAddress,
        address _nectTokenAddress,
        address _troveManagerAddress, 
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_pollenTokenAddress);
        checkContract(_nectTokenAddress);
        checkContract(_troveManagerAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);

        pollenToken = IPOLLENToken(_pollenTokenAddress);
        nectToken = INECTToken(_nectTokenAddress);
        troveManagerAddress = _troveManagerAddress;
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePoolAddress = _activePoolAddress;

        emit POLLENTokenAddressSet(_pollenTokenAddress);
        emit POLLENTokenAddressSet(_nectTokenAddress);
        emit TroveManagerAddressSet(_troveManagerAddress);
        emit BorrowerOperationsAddressSet(_borrowerOperationsAddress);
        emit ActivePoolAddressSet(_activePoolAddress);

        _renounceOwnership();
    }

    // If caller has a pre-existing stake, send any accumulated iBGT and NECT gains to them. 
    function stake(uint _POLLENamount) external override {
        _requireNonZeroAmount(_POLLENamount);

        uint currentStake = stakes[msg.sender];

        uint iBGTGain;
        uint NECTGain;
        // Grab any accumulated iBGT and NECT gains from the current stake
        if (currentStake != 0) {
            iBGTGain = _getPendingiBGTGain(msg.sender);
            NECTGain = _getPendingNECTGain(msg.sender);
        }
    
       _updateUserSnapshots(msg.sender);

        uint newStake = currentStake.add(_POLLENamount);

        // Increase user’s stake and total POLLEN staked
        stakes[msg.sender] = newStake;
        totalPOLLENStaked = totalPOLLENStaked.add(_POLLENamount);
        emit TotalPOLLENStakedUpdated(totalPOLLENStaked);

        // Transfer POLLEN from caller to this contract
        pollenToken.sendToPOLLENStaking(msg.sender, _POLLENamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, NECTGain, iBGTGain);

         // Send accumulated NECT and iBGT gains to the caller
        if (currentStake != 0) {
            nectToken.transfer(msg.sender, NECTGain);
            _sendiBGTGainToUser(iBGTGain);
        }
    }

    // Unstake the POLLEN and send the it back to the caller, along with their accumulated NECT & iBGT gains. 
    // If requested amount > stake, send their entire stake.
    function unstake(uint _POLLENamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated iBGT and NECT gains from the current stake
        uint iBGTGain = _getPendingiBGTGain(msg.sender);
        uint NECTGain = _getPendingNECTGain(msg.sender);
        
        _updateUserSnapshots(msg.sender);

        if (_POLLENamount > 0) {
            uint POLLENToWithdraw = BeraBorrowMath._min(_POLLENamount, currentStake);

            uint newStake = currentStake.sub(POLLENToWithdraw);

            // Decrease user's stake and total POLLEN staked
            stakes[msg.sender] = newStake;
            totalPOLLENStaked = totalPOLLENStaked.sub(POLLENToWithdraw);
            emit TotalPOLLENStakedUpdated(totalPOLLENStaked);

            // Transfer unstaked POLLEN to user
            pollenToken.transfer(msg.sender, POLLENToWithdraw);

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, NECTGain, iBGTGain);

        // Send accumulated NECT and iBGT gains to the caller
        nectToken.transfer(msg.sender, NECTGain);
        _sendiBGTGainToUser(iBGTGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by BeraBorrow core contracts ---

    function increaseF_iBGT(uint _iBGTFee) external override {
        _requireCallerIsTroveManager();
        uint iBGTFeePerPOLLENStaked;
     
        if (totalPOLLENStaked > 0) {iBGTFeePerPOLLENStaked = _iBGTFee.mul(DECIMAL_PRECISION).div(totalPOLLENStaked);}

        F_iBGT = F_iBGT.add(iBGTFeePerPOLLENStaked); 
        emit F_iBGTUpdated(F_iBGT);
    }

    function increaseF_NECT(uint _NECTFee) external override {
        _requireCallerIsBorrowerOperations();
        uint NECTFeePerPOLLENStaked;
        
        if (totalPOLLENStaked > 0) {NECTFeePerPOLLENStaked = _NECTFee.mul(DECIMAL_PRECISION).div(totalPOLLENStaked);}
        
        F_NECT = F_NECT.add(NECTFeePerPOLLENStaked);
        emit F_NECTUpdated(F_NECT);
    }

    // --- Pending reward functions ---

    function getPendingiBGTGain(address _user) external view override returns (uint) {
        return _getPendingiBGTGain(_user);
    }

    function _getPendingiBGTGain(address _user) internal view returns (uint) {
        uint F_iBGT_Snapshot = snapshots[_user].F_iBGT_Snapshot;
        uint iBGTGain = stakes[_user].mul(F_iBGT.sub(F_iBGT_Snapshot)).div(DECIMAL_PRECISION);
        return iBGTGain;
    }

    function getPendingNECTGain(address _user) external view override returns (uint) {
        return _getPendingNECTGain(_user);
    }

    function _getPendingNECTGain(address _user) internal view returns (uint) {
        uint F_NECT_Snapshot = snapshots[_user].F_NECT_Snapshot;
        uint NECTGain = stakes[_user].mul(F_NECT.sub(F_NECT_Snapshot)).div(DECIMAL_PRECISION);
        return NECTGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
        snapshots[_user].F_iBGT_Snapshot = F_iBGT;
        snapshots[_user].F_NECT_Snapshot = F_NECT;
        emit StakerSnapshotsUpdated(_user, F_iBGT, F_NECT);
    }

    function _sendiBGTGainToUser(uint iBGTGain) internal {
        emit iBGTSent(msg.sender, iBGTGain);
        // (bool success, ) = msg.sender.call{value: iBGTGain}("");
        // require(success, "POLLENStaking: Failed to send accumulated iBGTGain");
        // burner0621 modified for iBGT
        IERC20 token = IERC20(IActivePool(activePoolAddress).iBGTTokenAddress());
        bool success = token.transfer(msg.sender, iBGTGain);
        require(success, "POLLENStaking: Failed to send accumulated iBGTGain");
        ////////////////////////////////
    }

    // --- 'require' functions ---

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "POLLENStaking: caller is not TroveM");
    }

    function _requireCallerIsBorrowerOperations() internal view {
        require(msg.sender == borrowerOperationsAddress, "POLLENStaking: caller is not BorrowerOps");
    }

     function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "POLLENStaking: caller is not ActivePool");
    }

    function _requireUserHasStake(uint currentStake) internal pure {  
        require(currentStake > 0, 'POLLENStaking: User must have a non-zero stake');  
    }

    function _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount > 0, 'POLLENStaking: Amount must be non-zero');
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }

    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external override {
        _requireCallerIsActivePool();
    }
    ///////////////////////////////
}
