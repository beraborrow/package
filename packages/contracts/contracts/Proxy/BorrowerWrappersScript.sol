// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/SafeMath.sol";
import "../Dependencies/BeraBorrowMath.sol";
import "../Dependencies/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/IPOLLENStaking.sol";
import "./BorrowerOperationsScript.sol";
import "./iBGTTransferScript.sol";
import "./POLLENStakingScript.sol";
import "../Dependencies/console.sol";


contract BorrowerWrappersScript is BorrowerOperationsScript, iBGTTransferScript, POLLENStakingScript {
    using SafeMath for uint;

    string constant public NAME = "BorrowerWrappersScript";

    ITroveManager immutable troveManager;
    IStabilityPool immutable stabilityPool;
    IPriceFeed immutable priceFeed;
    IERC20 immutable nectToken;
    IERC20 immutable pollenToken;
    IPOLLENStaking immutable pollenStaking;

    constructor(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _pollenStakingAddress
    )
        BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress))
        POLLENStakingScript(_pollenStakingAddress)
        public
    {
        checkContract(_troveManagerAddress);
        ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
        troveManager = troveManagerCached;

        IStabilityPool stabilityPoolCached = troveManagerCached.stabilityPool();
        checkContract(address(stabilityPoolCached));
        stabilityPool = stabilityPoolCached;

        IPriceFeed priceFeedCached = troveManagerCached.priceFeed();
        checkContract(address(priceFeedCached));
        priceFeed = priceFeedCached;

        address nectTokenCached = address(troveManagerCached.nectToken());
        checkContract(nectTokenCached);
        nectToken = IERC20(nectTokenCached);

        address pollenTokenCached = address(troveManagerCached.pollenToken());
        checkContract(pollenTokenCached);
        pollenToken = IERC20(pollenTokenCached);

        IPOLLENStaking pollenStakingCached = troveManagerCached.pollenStaking();
        require(_pollenStakingAddress == address(pollenStakingCached), "BorrowerWrappersScript: Wrong POLLENStaking address");
        pollenStaking = pollenStakingCached;
    }

    function claimCollateralAndOpenTrove(uint _maxFee, uint _NECTAmount, address _upperHint, address _lowerHint) external payable {
        uint balanceBefore = address(this).balance;

        // Claim collateral
        borrowerOperations.claimCollateral();

        uint balanceAfter = address(this).balance;

        // already checked in CollSurplusPool
        assert(balanceAfter > balanceBefore);

        uint totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);

        // Open trove with obtained collateral, plus collateral sent by user
        borrowerOperations.openTrove{ value: totalCollateral }(_maxFee, _NECTAmount, _upperHint, _lowerHint);
    }

    function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint pollenBalanceBefore = pollenToken.balanceOf(address(this));

        // Claim rewards
        stabilityPool.withdrawFromSP(0);

        uint collBalanceAfter = address(this).balance;
        uint pollenBalanceAfter = pollenToken.balanceOf(address(this));
        uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);

        // Add claimed iBGT to trove, get more NECT and stake it into the Stability Pool
        if (claimedCollateral > 0) {
            _requireUserHasTrove(address(this));
            uint NECTAmount = _getNetNECTAmount(claimedCollateral);
            borrowerOperations.adjustTrove{ value: claimedCollateral }(_maxFee, 0, NECTAmount, true, _upperHint, _lowerHint);
            // Provide withdrawn NECT to Stability Pool
            if (NECTAmount > 0) {
                stabilityPool.provideToSP(NECTAmount, address(0));
            }
        }

        // Stake claimed POLLEN
        uint claimedPOLLEN = pollenBalanceAfter.sub(pollenBalanceBefore);
        if (claimedPOLLEN > 0) {
            pollenStaking.stake(claimedPOLLEN);
        }
    }

    function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint nectBalanceBefore = nectToken.balanceOf(address(this));
        uint pollenBalanceBefore = pollenToken.balanceOf(address(this));

        // Claim gains
        pollenStaking.unstake(0);

        uint gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
        uint gainedNECT = nectToken.balanceOf(address(this)).sub(nectBalanceBefore);

        uint netNECTAmount;
        // Top up trove and get more NECT, keeping ICR constant
        if (gainedCollateral > 0) {
            _requireUserHasTrove(address(this));
            netNECTAmount = _getNetNECTAmount(gainedCollateral);
            borrowerOperations.adjustTrove{ value: gainedCollateral }(_maxFee, 0, netNECTAmount, true, _upperHint, _lowerHint);
        }

        uint totalNECT = gainedNECT.add(netNECTAmount);
        if (totalNECT > 0) {
            stabilityPool.provideToSP(totalNECT, address(0));

            // Providing to Stability Pool also triggers POLLEN claim, so stake it if any
            uint pollenBalanceAfter = pollenToken.balanceOf(address(this));
            uint claimedPOLLEN = pollenBalanceAfter.sub(pollenBalanceBefore);
            if (claimedPOLLEN > 0) {
                pollenStaking.stake(claimedPOLLEN);
            }
        }

    }

    function _getNetNECTAmount(uint _collateral) internal returns (uint) {
        uint price = priceFeed.fetchPrice();
        uint ICR = troveManager.getCurrentICR(address(this), price);

        uint NECTAmount = _collateral.mul(price).div(ICR);
        uint borrowingRate = troveManager.getBorrowingRateWithDecay();
        uint netDebt = NECTAmount.mul(BeraBorrowMath.DECIMAL_PRECISION).div(BeraBorrowMath.DECIMAL_PRECISION.add(borrowingRate));

        return netDebt;
    }

    function _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "BorrowerWrappersScript: caller must have an active trove");
    }
}
