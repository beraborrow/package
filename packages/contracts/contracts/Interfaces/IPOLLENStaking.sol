// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface IPOLLENStaking {

    // --- Events --
    
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
    )  external;

    function stake(uint _POLLENamount) external;

    function unstake(uint _POLLENamount) external;

    function increaseF_iBGT(uint _iBGTFee) external; 

    function increaseF_NECT(uint _POLLENFee) external;  

    function getPendingiBGTGain(address _user) external view returns (uint);

    function getPendingNECTGain(address _user) external view returns (uint);
}
