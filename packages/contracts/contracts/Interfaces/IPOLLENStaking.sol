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
    event StakingGainsWithdrawn(address indexed staker, uint NECTGain, uint ETHGain);
    event F_ETHUpdated(uint _F_ETH);
    event F_NECTUpdated(uint _F_NECT);
    event TotalPOLLENStakedUpdated(uint _totalPOLLENStaked);
    event EtherSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_ETH, uint _F_NECT);

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

    function increaseF_ETH(uint _ETHFee) external; 

    function increaseF_NECT(uint _POLLENFee) external;  

    function getPendingETHGain(address _user) external view returns (uint);

    function getPendingNECTGain(address _user) external view returns (uint);
}
