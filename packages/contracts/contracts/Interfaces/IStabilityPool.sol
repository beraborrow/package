// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

/*
 * The Stability Pool holds NECT tokens deposited by Stability Pool depositors.
 *
 * When a trove is liquidated, then depending on system conditions, some of its NECT debt gets offset with
 * NECT in the Stability Pool:  that is, the offset debt evaporates, and an equal amount of NECT tokens in the Stability Pool is burned.
 *
 * Thus, a liquidation causes each depositor to receive a NECT loss, in proportion to their deposit as a share of total deposits.
 * They also receive an iBGT gain, as the iBGT collateral of the liquidated trove is distributed among Stability depositors,
 * in the same proportion.
 *
 * When a liquidation occurs, it depletes every deposit by the same fraction: for example, a liquidation that depletes 40%
 * of the total NECT in the Stability Pool, depletes 40% of each deposit.
 *
 * A deposit that has experienced a series of liquidations is termed a "compounded deposit": each liquidation depletes the deposit,
 * multiplying it by some factor in range ]0,1[
 *
 * Please see the implementation spec in the proof document, which closely follows on from the compounded deposit / iBGT gain derivations:
 * https://github.com/beraborrow/beraborrow/blob/master/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 * --- POLLEN ISSUANCE TO STABILITY POOL DEPOSITORS ---
 *
 * An POLLEN issuance event occurs at every deposit operation, and every liquidation.
 *
 * Each deposit is tagged with the address of the front end through which it was made.
 *
 * All deposits earn a share of the issued POLLEN in proportion to the deposit as a share of total deposits. The POLLEN earned
 * by a given deposit, is split between the depositor and the front end through which the deposit was made, based on the front end's kickbackRate.
 *
 * Please see the system Readme for an overview:
 * https://github.com/beraborrow/dev/blob/main/README.md#pollen-issuance-to-stability-providers
 */
interface IStabilityPool {

    // --- Events ---
    
    event StabilityPooliBGTBalanceUpdated(uint _newBalance);
    event StabilityPoolNECTBalanceUpdated(uint _newBalance);

    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolAddressChanged(address _newActivePoolAddress);
    event DefaultPoolAddressChanged(address _newDefaultPoolAddress);
    event NECTTokenAddressChanged(address _newNECTTokenAddress);
    event SortedTrovesAddressChanged(address _newSortedTrovesAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event CommunityIssuanceAddressChanged(address _newCommunityIssuanceAddress);

    event P_Updated(uint _P);
    event S_Updated(uint _S, uint128 _epoch, uint128 _scale);
    event G_Updated(uint _G, uint128 _epoch, uint128 _scale);
    event EpochUpdated(uint128 _currentEpoch);
    event ScaleUpdated(uint128 _currentScale);

    event FrontEndRegistered(address indexed _frontEnd, uint _kickbackRate);
    event FrontEndTagSet(address indexed _depositor, address indexed _frontEnd);

    event DepositSnapshotUpdated(address indexed _depositor, uint _P, uint _S, uint _G);
    event FrontEndSnapshotUpdated(address indexed _frontEnd, uint _P, uint _G);
    event UserDepositChanged(address indexed _depositor, uint _newDeposit);
    event FrontEndStakeChanged(address indexed _frontEnd, uint _newFrontEndStake, address _depositor);

    event iBGTGainWithdrawn(address indexed _depositor, uint _iBGT, uint _NECTLoss);
    event POLLENPaidToDepositor(address indexed _depositor, uint _POLLEN);
    event POLLENPaidToFrontEnd(address indexed _frontEnd, uint _POLLEN);
    event iBGTSent(address _to, uint _amount);

    // --- Functions ---

    /*
     * Called only once on init, to set addresses of other BeraBorrow contracts
     * Callable only by owner, renounces ownership at the end
     */
    function setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _nectTokenAddress,
        address _sortedTrovesAddress,
        address _priceFeedAddress,
        address _communityIssuanceAddress
    ) external;

    /*
     * Initial checks:
     * - Frontend is registered or zero address
     * - Sender is not a registered frontend
     * - _amount is not zero
     * ---
     * - Triggers a POLLEN issuance, based on time passed since the last issuance. The POLLEN issuance is shared between *all* depositors and front ends
     * - Tags the deposit with the provided front end tag param, if it's a new deposit
     * - Sends depositor's accumulated gains (POLLEN, iBGT) to depositor
     * - Sends the tagged front end's accumulated POLLEN gains to the tagged front end
     * - Increases deposit and tagged front end's stake, and takes new snapshots for each.
     */
    function provideToSP(uint _amount, address _frontEndTag) external;

    /*
     * Initial checks:
     * - _amount is zero or there are no under collateralized troves left in the system
     * - User has a non zero deposit
     * ---
     * - Triggers a POLLEN issuance, based on time passed since the last issuance. The POLLEN issuance is shared between *all* depositors and front ends
     * - Removes the deposit's front end tag if it is a full withdrawal
     * - Sends all depositor's accumulated gains (POLLEN, iBGT) to depositor
     * - Sends the tagged front end's accumulated POLLEN gains to the tagged front end
     * - Decreases deposit and tagged front end's stake, and takes new snapshots for each.
     *
     * If _amount > userDeposit, the user withdraws all of their compounded deposit.
     */
    function withdrawFromSP(uint _amount) external;

    /*
     * Initial checks:
     * - User has a non zero deposit
     * - User has an open trove
     * - User has some iBGT gain
     * ---
     * - Triggers a POLLEN issuance, based on time passed since the last issuance. The POLLEN issuance is shared between *all* depositors and front ends
     * - Sends all depositor's POLLEN gain to  depositor
     * - Sends all tagged front end's POLLEN gain to the tagged front end
     * - Transfers the depositor's entire iBGT gain from the Stability Pool to the caller's trove
     * - Leaves their compounded deposit in the Stability Pool
     * - Updates snapshots for deposit and tagged front end stake
     */
    function withdrawiBGTGainToTrove(address _upperHint, address _lowerHint) external;

    /*
     * Initial checks:
     * - Frontend (sender) not already registered
     * - User (sender) has no deposit
     * - _kickbackRate is in the range [0, 100%]
     * ---
     * Front end makes a one-time selection of kickback rate upon registering
     */
    function registerFrontEnd(uint _kickbackRate) external;

    /*
     * Initial checks:
     * - Caller is TroveManager
     * ---
     * Cancels out the specified debt against the NECT contained in the Stability Pool (as far as possible)
     * and transfers the Trove's iBGT collateral from ActivePool to StabilityPool.
     * Only called by liquidation functions in the TroveManager.
     */
    function offset(uint _debt, uint _coll) external;

    /*
     * Returns the total amount of iBGT held by the pool, accounted in an internal variable instead of `balance`,
     * to exclude edge cases like iBGT received from a self-destruct.
     */
    function getiBGT() external view returns (uint);

    /*
     * Returns NECT held in the pool. Changes when users deposit/withdraw, and when Trove debt is offset.
     */
    function getTotalNECTDeposits() external view returns (uint);

    /*
     * Calculates the iBGT gain earned by the deposit since its last snapshots were taken.
     */
    function getDepositoriBGTGain(address _depositor) external view returns (uint);

    /*
     * Calculate the POLLEN gain earned by a deposit since its last snapshots were taken.
     * If not tagged with a front end, the depositor gets a 100% cut of what their deposit earned.
     * Otherwise, their cut of the deposit's earnings is equal to the kickbackRate, set by the front end through
     * which they made their deposit.
     */
    function getDepositorPOLLENGain(address _depositor) external view returns (uint);

    /*
     * Return the POLLEN gain earned by the front end.
     */
    function getFrontEndPOLLENGain(address _frontEnd) external view returns (uint);

    /*
     * Return the user's compounded deposit.
     */
    function getCompoundedNECTDeposit(address _depositor) external view returns (uint);

    /*
     * Return the front end's compounded stake.
     *
     * The front end's compounded stake is equal to the sum of its depositors' compounded deposits.
     */
    function getCompoundedFrontEndStake(address _frontEnd) external view returns (uint);

    /*
     * Fallback function
     * Only callable by Active Pool, it just accounts for iBGT received
     * receive() external payable;
     */

    // burner0621 modified for iBGT
    function receiveiBGT(uint _amount) external;
    ///////////////////////////////
}
