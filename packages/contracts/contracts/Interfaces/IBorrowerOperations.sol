// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IActivePool.sol";

// Common interface for the Trove Manager.
interface IBorrowerOperations {

    // --- Events ---

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event PriceFeedAddressChanged(address  _newPriceFeedAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event NECTTokenAddressChanged(address _nectTokenAddress);
    event POLLENStakingAddressChanged(address _pollenStakingAddress);

    event TroveCreated(address indexed _borrower, uint arrayIndex);
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, uint8 operation);
    event NECTBorrowingFeePaid(address indexed _borrower, uint _NECTFee);

    // --- Functions ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _nectTokenAddress,
        address _pollenStakingAddress
    ) external;

    function openTrove(uint _maxFee, uint _NECTAmount, address _upperHint, address _lowerHint, uint _ibgtAmount) external;

    function addColl(address _upperHint, address _lowerHint, uint _ibgtAmount) external;

    function moveiBGTGainToTrove(address _user, address _upperHint, address _lowerHint, uint _ibgtAmount) external;

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external;

    function withdrawNECT(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external;

    function repayNECT(uint _amount, address _upperHint, address _lowerHint) external;

    function closeTrove() external;

    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint, uint _ibgtAmount) external;

    function claimCollateral() external;

    function getCompositeDebt(uint _debt) external pure returns (uint);

    // burner0621 modified
    function getActivePool() external view returns(IActivePool);
}
