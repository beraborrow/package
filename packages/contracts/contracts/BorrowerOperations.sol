// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/INECTToken.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/IPOLLENStaking.sol";
import "./Dependencies/BeraBorrowBase.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./Dependencies/IERC20.sol";

contract BorrowerOperations is BeraBorrowBase, Ownable, CheckContract, IBorrowerOperations {
    string constant public NAME = "BorrowerOperations";

    // --- Connected contract declarations ---

    ITroveManager public troveManager;

    address stabilityPoolAddress;

    address gasPoolAddress;

    ICollSurplusPool collSurplusPool;

    IPOLLENStaking public pollenStaking;
    address public pollenStakingAddress;

    INECTToken public nectToken;

    // A doubly linked list of Troves, sorted by their collateral ratios
    ISortedTroves public sortedTroves;

    /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

     struct LocalVariables_adjustTrove {
        uint price;
        uint collChange;
        uint netDebtChange;
        bool isCollIncrease;
        uint debt;
        uint coll;
        uint oldICR;
        uint newICR;
        uint newTCR;
        uint NECTFee;
        uint newDebt;
        uint newColl;
        uint stake;
    }

    struct LocalVariables_openTrove {
        uint price;
        uint NECTFee;
        uint netDebt;
        uint compositeDebt;
        uint ICR;
        uint NICR;
        uint stake;
        uint arrayIndex;
    }

    struct ContractsCache {
        ITroveManager troveManager;
        IActivePool activePool;
        INECTToken nectToken;
    }

    enum BorrowerOperation {
        openTrove,
        closeTrove,
        adjustTrove
    }

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
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, BorrowerOperation operation);
    event NECTBorrowingFeePaid(address indexed _borrower, uint _NECTFee);

    // --- Dependency setters ---

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
    )
        external
        override
        onlyOwner
    {
        // This makes impossible to open a trove with zero withdrawn NECT
        assert(MIN_NET_DEBT > 0);

        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_gasPoolAddress);
        checkContract(_collSurplusPoolAddress);
        checkContract(_priceFeedAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_nectTokenAddress);
        checkContract(_pollenStakingAddress);

        troveManager = ITroveManager(_troveManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        defaultPool = IDefaultPool(_defaultPoolAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        gasPoolAddress = _gasPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        nectToken = INECTToken(_nectTokenAddress);
        pollenStakingAddress = _pollenStakingAddress;
        pollenStaking = IPOLLENStaking(_pollenStakingAddress);

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit NECTTokenAddressChanged(_nectTokenAddress);
        emit POLLENStakingAddressChanged(_pollenStakingAddress);

        _renounceOwnership();
    }

    function getActivePool() external override view returns(IActivePool) {
        return activePool;
    }

    // --- Borrower Trove Operations ---

    function openTrove(uint _maxFeePercentage, uint _NECTAmount, address _upperHint, address _lowerHint, uint _ibgtAmount) external override {
        // burner0621 modified
        IERC20 ibgtToken = IERC20(activePool.iBGTTokenAddress());
        ibgtToken.transferFrom(msg.sender, address(this), _ibgtAmount);
        // ////////////////////

        ContractsCache memory contractsCache = ContractsCache(troveManager, activePool, nectToken);
        LocalVariables_openTrove memory vars;

        vars.price = priceFeed.fetchPrice();
        bool isRecoveryMode = _checkRecoveryMode(vars.price);

        _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);
        _requireTroveisNotActive(contractsCache.troveManager, msg.sender);

        vars.NECTFee;
        vars.netDebt = _NECTAmount;

        if (!isRecoveryMode) {
            vars.NECTFee = _triggerBorrowingFee(contractsCache.troveManager, contractsCache.nectToken, _NECTAmount, _maxFeePercentage);
            vars.netDebt = vars.netDebt.add(vars.NECTFee);
        }
        _requireAtLeastMinNetDebt(vars.netDebt);

        // ICR is based on the composite debt, i.e. the requested NECT amount + NECT borrowing fee + NECT gas comp.
        vars.compositeDebt = _getCompositeDebt(vars.netDebt);
        assert(vars.compositeDebt > 0);
        
        vars.ICR = BeraBorrowMath._computeCR(_ibgtAmount, vars.compositeDebt, vars.price);
        vars.NICR = BeraBorrowMath._computeNominalCR(_ibgtAmount, vars.compositeDebt);

        if (isRecoveryMode) {
            _requireICRisAboveCCR(vars.ICR);
        } else {
            _requireICRisAboveMCR(vars.ICR);
            uint newTCR = _getNewTCRFromTroveChange(_ibgtAmount, true, vars.compositeDebt, true, vars.price);  // bools: coll increase, debt increase
            _requireNewTCRisAboveCCR(newTCR); 
        }

        // Set the trove struct's properties
        contractsCache.troveManager.setTroveStatus(msg.sender, 1);
        contractsCache.troveManager.increaseTroveColl(msg.sender, _ibgtAmount);
        contractsCache.troveManager.increaseTroveDebt(msg.sender, vars.compositeDebt);

        contractsCache.troveManager.updateTroveRewardSnapshots(msg.sender);
        vars.stake = contractsCache.troveManager.updateStakeAndTotalStakes(msg.sender);

        sortedTroves.insert(msg.sender, vars.NICR, _upperHint, _lowerHint);
        vars.arrayIndex = contractsCache.troveManager.addTroveOwnerToArray(msg.sender);
        emit TroveCreated(msg.sender, vars.arrayIndex);

        // Move the iBGT to the Active Pool, and mint the NECTAmount to the borrower
        _activePoolAddColl(contractsCache.activePool, _ibgtAmount);
        _withdrawNECT(contractsCache.activePool, contractsCache.nectToken, msg.sender, _NECTAmount, vars.netDebt);
        // Move the NECT gas compensation to the Gas Pool
        _withdrawNECT(contractsCache.activePool, contractsCache.nectToken, gasPoolAddress, NECT_GAS_COMPENSATION, NECT_GAS_COMPENSATION);

        emit TroveUpdated(msg.sender, vars.compositeDebt, _ibgtAmount, vars.stake, BorrowerOperation.openTrove);
        emit NECTBorrowingFeePaid(msg.sender, vars.NECTFee);
    }

    // Send iBGT as collateral to a trove
    function addColl(address _upperHint, address _lowerHint, uint _ibgtAmount) external override {
        // burner0621 modified
        IERC20 ibgtToken = IERC20(activePool.iBGTTokenAddress());
        ibgtToken.transferFrom(msg.sender, address(this), _ibgtAmount);
        //////////////////////
        _adjustTrove(msg.sender, 0, 0, false, _upperHint, _lowerHint, 0, _ibgtAmount);
    }

    // Send iBGT as collateral to a trove. Called by only the Stability Pool.
    function moveiBGTGainToTrove(address _borrower, address _upperHint, address _lowerHint, uint _ibgtAmount) external override {
        _requireCallerIsStabilityPool();
        // burner0621 modified
        IERC20 ibgtToken = IERC20(activePool.iBGTTokenAddress());
        ibgtToken.transferFrom(msg.sender, address(this), _ibgtAmount);
        // ////////////////////
        _adjustTrove(_borrower, 0, 0, false, _upperHint, _lowerHint, 0, _ibgtAmount);
    }

    // Withdraw iBGT collateral from a trove
    function withdrawColl(uint _collWithdrawal, address _upperHint, address _lowerHint) external override {
        _adjustTrove(msg.sender, _collWithdrawal, 0, false, _upperHint, _lowerHint, 0, 0);
    }

    // Withdraw NECT tokens from a trove: mint new NECT tokens to the owner, and increase the trove's debt accordingly
    function withdrawNECT(uint _maxFeePercentage, uint _NECTAmount, address _upperHint, address _lowerHint) external override {
        _adjustTrove(msg.sender, 0, _NECTAmount, true, _upperHint, _lowerHint, _maxFeePercentage, 0);
    }

    // Repay NECT tokens to a Trove: Burn the repaid NECT tokens, and reduce the trove's debt accordingly
    function repayNECT(uint _NECTAmount, address _upperHint, address _lowerHint) external override {
        _adjustTrove(msg.sender, 0, _NECTAmount, false, _upperHint, _lowerHint, 0, 0);
    }

    function adjustTrove(uint _maxFeePercentage, uint _collWithdrawal, uint _NECTChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint _ibgtAmount) external override {
        // burner0621 modified
        IERC20 ibgtToken = IERC20(activePool.iBGTTokenAddress());
        ibgtToken.transferFrom(msg.sender, address(this), _ibgtAmount);
        // ////////////////////
        _adjustTrove(msg.sender, _collWithdrawal, _NECTChange, _isDebtIncrease, _upperHint, _lowerHint, _maxFeePercentage, _ibgtAmount);
    }

    /*
    * _adjustTrove(): Alongside a debt change, this function can perform either a collateral top-up or a collateral withdrawal. 
    *
    * It therefore expects either a positive msg.value, or a positive _collWithdrawal argument.
    *
    * If both are positive, it will revert.
    */
    function _adjustTrove(address _borrower, uint _collWithdrawal, uint _NECTChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint _maxFeePercentage, uint _ibgtAmount) internal {
        ContractsCache memory contractsCache = ContractsCache(troveManager, activePool, nectToken);
        LocalVariables_adjustTrove memory vars;

        vars.price = priceFeed.fetchPrice();
        bool isRecoveryMode = _checkRecoveryMode(vars.price);

        if (_isDebtIncrease) {
            _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);
            _requireNonZeroDebtChange(_NECTChange);
        }
        _requireSingularCollChange(_collWithdrawal, _ibgtAmount);
        _requireNonZeroAdjustment(_collWithdrawal, _NECTChange, _ibgtAmount);
        _requireTroveisActive(contractsCache.troveManager, _borrower);

        // Confirm the operation is either a borrower adjusting their own trove, or a pure iBGT transfer from the Stability Pool to a trove
        assert(msg.sender == _borrower || (msg.sender == stabilityPoolAddress && _ibgtAmount > 0 && _NECTChange == 0));

        contractsCache.troveManager.applyPendingRewards(_borrower);

        // Get the collChange based on whether or not iBGT was sent in the transaction
        (vars.collChange, vars.isCollIncrease) = _getCollChange(_ibgtAmount, _collWithdrawal);

        vars.netDebtChange = _NECTChange;

        // If the adjustment incorporates a debt increase and system is in Normal Mode, then trigger a borrowing fee
        if (_isDebtIncrease && !isRecoveryMode) { 
            vars.NECTFee = _triggerBorrowingFee(contractsCache.troveManager, contractsCache.nectToken, _NECTChange, _maxFeePercentage);
            vars.netDebtChange = vars.netDebtChange.add(vars.NECTFee); // The raw debt change includes the fee
        }

        vars.debt = contractsCache.troveManager.getTroveDebt(_borrower);
        vars.coll = contractsCache.troveManager.getTroveColl(_borrower);
        
        // Get the trove's old ICR before the adjustment, and what its new ICR will be after the adjustment
        vars.oldICR = BeraBorrowMath._computeCR(vars.coll, vars.debt, vars.price);
        vars.newICR = _getNewICRFromTroveChange(vars.coll, vars.debt, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease, vars.price);
        assert(_collWithdrawal <= vars.coll); 

        // Check the adjustment satisfies all conditions for the current system mode
        _requireValidAdjustmentInCurrentMode(isRecoveryMode, _collWithdrawal, _isDebtIncrease, vars);
            
        // When the adjustment is a debt repayment, check it's a valid amount and that the caller has enough NECT
        if (!_isDebtIncrease && _NECTChange > 0) {
            _requireAtLeastMinNetDebt(_getNetDebt(vars.debt).sub(vars.netDebtChange));
            _requireValidNECTRepayment(vars.debt, vars.netDebtChange);
            _requireSufficientNECTBalance(contractsCache.nectToken, _borrower, vars.netDebtChange);
        }

        (vars.newColl, vars.newDebt) = _updateTroveFromAdjustment(contractsCache.troveManager, _borrower, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease);
        vars.stake = contractsCache.troveManager.updateStakeAndTotalStakes(_borrower);

        // Re-insert trove in to the sorted list
        uint newNICR = _getNewNominalICRFromTroveChange(vars.coll, vars.debt, vars.collChange, vars.isCollIncrease, vars.netDebtChange, _isDebtIncrease);
        sortedTroves.reInsert(_borrower, newNICR, _upperHint, _lowerHint);

        emit TroveUpdated(_borrower, vars.newDebt, vars.newColl, vars.stake, BorrowerOperation.adjustTrove);
        emit NECTBorrowingFeePaid(msg.sender,  vars.NECTFee);

        // Use the unmodified _NECTChange here, as we don't send the fee to the user
        _moveTokensAndiBGTfromAdjustment(
            contractsCache.activePool,
            contractsCache.nectToken,
            msg.sender,
            vars.collChange,
            vars.isCollIncrease,
            _NECTChange,
            _isDebtIncrease,
            vars.netDebtChange
        );
    }

    function closeTrove() external override {
        ITroveManager troveManagerCached = troveManager;
        IActivePool activePoolCached = activePool;
        INECTToken nectTokenCached = nectToken;

        _requireTroveisActive(troveManagerCached, msg.sender);
        uint price = priceFeed.fetchPrice();
        _requireNotInRecoveryMode(price);

        troveManagerCached.applyPendingRewards(msg.sender);

        uint coll = troveManagerCached.getTroveColl(msg.sender);
        uint debt = troveManagerCached.getTroveDebt(msg.sender);

        _requireSufficientNECTBalance(nectTokenCached, msg.sender, debt.sub(NECT_GAS_COMPENSATION));

        uint newTCR = _getNewTCRFromTroveChange(coll, false, debt, false, price);
        _requireNewTCRisAboveCCR(newTCR);

        troveManagerCached.removeStake(msg.sender);
        troveManagerCached.closeTrove(msg.sender);

        emit TroveUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeTrove);

        // Burn the repaid NECT from the user's balance and the gas compensation from the Gas Pool
        _repayNECT(activePoolCached, nectTokenCached, msg.sender, debt.sub(NECT_GAS_COMPENSATION));
        _repayNECT(activePoolCached, nectTokenCached, gasPoolAddress, NECT_GAS_COMPENSATION);

        // Send the collateral back to the user
        activePoolCached.sendiBGT(msg.sender, coll);
    }

    /**
     * Claim remaining collateral from a redemption or from a liquidation with ICR > MCR in Recovery Mode
     */
    function claimCollateral() external override {
        // send iBGT from CollSurplus Pool to owner
        collSurplusPool.claimColl(msg.sender);
    }

    // --- Helper functions ---

    function _triggerBorrowingFee(ITroveManager _troveManager, INECTToken _nectToken, uint _NECTAmount, uint _maxFeePercentage) internal returns (uint) {
        _troveManager.decayBaseRateFromBorrowing(); // decay the baseRate state variable
        uint NECTFee = _troveManager.getBorrowingFee(_NECTAmount);

        _requireUserAcceptsFee(NECTFee, _NECTAmount, _maxFeePercentage);
        
        // Send fee to POLLEN staking contract
        pollenStaking.increaseF_NECT(NECTFee);
        _nectToken.mint(pollenStakingAddress, NECTFee);

        return NECTFee;
    }

    function _getUSDValue(uint _coll, uint _price) internal pure returns (uint) {
        uint usdValue = _price.mul(_coll).div(DECIMAL_PRECISION);

        return usdValue;
    }

    function _getCollChange(
        uint _collReceived,
        uint _requestedCollWithdrawal
    )
        internal
        pure
        returns(uint collChange, bool isCollIncrease)
    {
        if (_collReceived != 0) {
            collChange = _collReceived;
            isCollIncrease = true;
        } else {
            collChange = _requestedCollWithdrawal;
        }
    }

    // Update trove's coll and debt based on whether they increase or decrease
    function _updateTroveFromAdjustment
    (
        ITroveManager _troveManager,
        address _borrower,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease
    )
        internal
        returns (uint, uint)
    {
        uint newColl = (_isCollIncrease) ? _troveManager.increaseTroveColl(_borrower, _collChange)
                                        : _troveManager.decreaseTroveColl(_borrower, _collChange);
        uint newDebt = (_isDebtIncrease) ? _troveManager.increaseTroveDebt(_borrower, _debtChange)
                                        : _troveManager.decreaseTroveDebt(_borrower, _debtChange);

        return (newColl, newDebt);
    }

    function _moveTokensAndiBGTfromAdjustment
    (
        IActivePool _activePool,
        INECTToken _nectToken,
        address _borrower,
        uint _collChange,
        bool _isCollIncrease,
        uint _NECTChange,
        bool _isDebtIncrease,
        uint _netDebtChange
    )
        internal
    {
        if (_isDebtIncrease) {
            _withdrawNECT(_activePool, _nectToken, _borrower, _NECTChange, _netDebtChange);
        } else {
            _repayNECT(_activePool, _nectToken, _borrower, _NECTChange);
        }

        if (_isCollIncrease) {
            _activePoolAddColl(_activePool, _collChange);
        } else {
            _activePool.sendiBGT(_borrower, _collChange);
        }
    }

    // Send iBGT to Active Pool and increase its recorded iBGT balance
    function _activePoolAddColl(IActivePool _activePool, uint _amount) internal {
        // (bool success, ) = address(_activePool).call{value: _amount}("");
        // require(success, "BorrowerOps: Sending iBGT to ActivePool failed");
        
        // burner0621 modified for iBGT
        IERC20 token = IERC20(activePool.iBGTTokenAddress());
        bool success = token.transfer(address(_activePool), _amount);
        require(success, "BorrowerOps: Sending iBGT to ActivePool failed");
        _activePool.receiveiBGT(_amount);
        ////////////////////////////////
    }

    // Issue the specified amount of NECT to _account and increases the total active debt (_netDebtIncrease potentially includes a NECTFee)
    function _withdrawNECT(IActivePool _activePool, INECTToken _nectToken, address _account, uint _NECTAmount, uint _netDebtIncrease) internal {
        _activePool.increaseNECTDebt(_netDebtIncrease);
        _nectToken.mint(_account, _NECTAmount);
    }

    // Burn the specified amount of NECT from _account and decreases the total active debt
    function _repayNECT(IActivePool _activePool, INECTToken _nectToken, address _account, uint _NECT) internal {
        _activePool.decreaseNECTDebt(_NECT);
        _nectToken.burn(_account, _NECT);
    }

    // --- 'Require' wrapper functions ---

    // burner0621 modified add _ibgtAmount parameter instead of msg.value
    function _requireSingularCollChange(uint _collWithdrawal, uint _ibgtAmount) internal view {
        require(_ibgtAmount == 0 || _collWithdrawal == 0, "BorrowerOperations: Cannot withdraw and add coll");
    }

    function _requireCallerIsBorrower(address _borrower) internal view {
        require(msg.sender == _borrower, "BorrowerOps: Caller must be the borrower for a withdrawal");
    }

    // burner0621 modified add _ibgtAmount parameter instead of msg.value
    function _requireNonZeroAdjustment(uint _collWithdrawal, uint _NECTChange, uint _ibgtAmount) internal view {
        require(_ibgtAmount != 0 || _collWithdrawal != 0 || _NECTChange != 0, "BorrowerOps: There must be either a collateral change or a debt change");
    }

    function _requireTroveisActive(ITroveManager _troveManager, address _borrower) internal view {
        uint status = _troveManager.getTroveStatus(_borrower);
        require(status == 1, "BorrowerOps: Trove does not exist or is closed");
    }

    function _requireTroveisNotActive(ITroveManager _troveManager, address _borrower) internal view {
        uint status = _troveManager.getTroveStatus(_borrower);
        require(status != 1, "BorrowerOps: Trove is active");
    }

    function _requireNonZeroDebtChange(uint _NECTChange) internal pure {
        require(_NECTChange > 0, "BorrowerOps: Debt increase requires non-zero debtChange");
    }
   
    function _requireNotInRecoveryMode(uint _price) internal view {
        require(!_checkRecoveryMode(_price), "BorrowerOps: Operation not permitted during Recovery Mode");
    }

    function _requireNoCollWithdrawal(uint _collWithdrawal) internal pure {
        require(_collWithdrawal == 0, "BorrowerOps: Collateral withdrawal not permitted Recovery Mode");
    }

    function _requireValidAdjustmentInCurrentMode 
    (
        bool _isRecoveryMode,
        uint _collWithdrawal,
        bool _isDebtIncrease, 
        LocalVariables_adjustTrove memory _vars
    ) 
        internal 
        view 
    {
        /* 
        *In Recovery Mode, only allow:
        *
        * - Pure collateral top-up
        * - Pure debt repayment
        * - Collateral top-up with debt repayment
        * - A debt increase combined with a collateral top-up which makes the ICR >= 150% and improves the ICR (and by extension improves the TCR).
        *
        * In Normal Mode, ensure:
        *
        * - The new ICR is above MCR
        * - The adjustment won't pull the TCR below CCR
        */
        if (_isRecoveryMode) {
            _requireNoCollWithdrawal(_collWithdrawal);
            if (_isDebtIncrease) {
                _requireICRisAboveCCR(_vars.newICR);
                _requireNewICRisAboveOldICR(_vars.newICR, _vars.oldICR);
            }       
        } else { // if Normal Mode
            _requireICRisAboveMCR(_vars.newICR);
            _vars.newTCR = _getNewTCRFromTroveChange(_vars.collChange, _vars.isCollIncrease, _vars.netDebtChange, _isDebtIncrease, _vars.price);
            _requireNewTCRisAboveCCR(_vars.newTCR);  
        }
    }

    function _requireICRisAboveMCR(uint _newICR) internal pure {
        require(_newICR >= MCR, "BorrowerOps: An operation that would result in ICR < MCR is not permitted");
    }

    function _requireICRisAboveCCR(uint _newICR) internal pure {
        require(_newICR >= CCR, "BorrowerOps: Operation must leave trove with ICR >= CCR");
    }

    function _requireNewICRisAboveOldICR(uint _newICR, uint _oldICR) internal pure {
        require(_newICR >= _oldICR, "BorrowerOps: Cannot decrease your Trove's ICR in Recovery Mode");
    }

    function _requireNewTCRisAboveCCR(uint _newTCR) internal pure {
        require(_newTCR >= CCR, "BorrowerOps: An operation that would result in TCR < CCR is not permitted");
    }

    function _requireAtLeastMinNetDebt(uint _netDebt) internal pure {
        require (_netDebt >= MIN_NET_DEBT, "BorrowerOps: Trove's net debt must be greater than minimum");
    }

    function _requireValidNECTRepayment(uint _currentDebt, uint _debtRepayment) internal pure {
        require(_debtRepayment <= _currentDebt.sub(NECT_GAS_COMPENSATION), "BorrowerOps: Amount repaid must not be larger than the Trove's debt");
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "BorrowerOps: Caller is not Stability Pool");
    }

     function _requireSufficientNECTBalance(INECTToken _nectToken, address _borrower, uint _debtRepayment) internal view {
        require(_nectToken.balanceOf(_borrower) >= _debtRepayment, "BorrowerOps: Caller doesnt have enough NECT to make repayment");
    }

    function _requireValidMaxFeePercentage(uint _maxFeePercentage, bool _isRecoveryMode) internal pure {
        if (_isRecoveryMode) {
            require(_maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must less than or equal to 100%");
        } else {
            require(_maxFeePercentage >= BORROWING_FEE_FLOOR && _maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must be between 0.5% and 100%");
        }
    }

    // --- ICR and TCR getters ---

    // Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
    function _getNewNominalICRFromTroveChange
    (
        uint _coll,
        uint _debt,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease
    )
        pure
        internal
        returns (uint)
    {
        (uint newColl, uint newDebt) = _getNewTroveAmounts(_coll, _debt, _collChange, _isCollIncrease, _debtChange, _isDebtIncrease);

        uint newNICR = BeraBorrowMath._computeNominalCR(newColl, newDebt);
        return newNICR;
    }

    // Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
    function _getNewICRFromTroveChange
    (
        uint _coll,
        uint _debt,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _price
    )
        pure
        internal
        returns (uint)
    {
        (uint newColl, uint newDebt) = _getNewTroveAmounts(_coll, _debt, _collChange, _isCollIncrease, _debtChange, _isDebtIncrease);

        uint newICR = BeraBorrowMath._computeCR(newColl, newDebt, _price);
        return newICR;
    }

    function _getNewTroveAmounts(
        uint _coll,
        uint _debt,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease
    )
        internal
        pure
        returns (uint, uint)
    {
        uint newColl = _coll;
        uint newDebt = _debt;

        newColl = _isCollIncrease ? _coll.add(_collChange) :  _coll.sub(_collChange);
        newDebt = _isDebtIncrease ? _debt.add(_debtChange) : _debt.sub(_debtChange);

        return (newColl, newDebt);
    }

    function _getNewTCRFromTroveChange
    (
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _price
    )
        internal
        view
        returns (uint)
    {
        uint totalColl = getEntireSystemColl();
        uint totalDebt = getEntireSystemDebt();

        totalColl = _isCollIncrease ? totalColl.add(_collChange) : totalColl.sub(_collChange);
        totalDebt = _isDebtIncrease ? totalDebt.add(_debtChange) : totalDebt.sub(_debtChange);

        uint newTCR = BeraBorrowMath._computeCR(totalColl, totalDebt, _price);
        return newTCR;
    }

    function getCompositeDebt(uint _debt) external pure override returns (uint) {
        return _getCompositeDebt(_debt);
    }
}
