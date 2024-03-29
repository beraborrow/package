<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md)

## lib-base package

## Classes

|  Class | Description |
|  --- | --- |
|  [BeraBorrowStore](./lib-base.beraborrowstore.md) | Abstract base class of BeraBorrow data store implementations. |
|  [Decimal](./lib-base.decimal.md) | Fixed-point decimal bignumber with 18 digits of precision. |
|  [Fees](./lib-base.fees.md) | Calculator for fees. |
|  [POLLENStake](./lib-base.pollenstake.md) | Represents a user's POLLEN stake and accrued gains. |
|  [StabilityDeposit](./lib-base.stabilitydeposit.md) | A Stability Deposit and its accrued gains. |
|  [TransactionFailedError](./lib-base.transactionfailederror.md) | Thrown by [TransactableBeraBorrow](./lib-base.transactableberaborrow.md) functions in case of transaction failure. |
|  [Trove](./lib-base.trove.md) | A combination of collateral and debt. |
|  [TroveWithPendingRedistribution](./lib-base.trovewithpendingredistribution.md) | A Trove in its state after the last direct modification. |
|  [UserTrove](./lib-base.usertrove.md) | A Trove that is associated with a single owner. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [BeraBorrowStoreBaseState](./lib-base.beraborrowstorebasestate.md) | State variables read from the blockchain. |
|  [BeraBorrowStoreDerivedState](./lib-base.beraborrowstorederivedstate.md) | State variables derived from [BeraBorrowStoreBaseState](./lib-base.beraborrowstorebasestate.md)<!-- -->. |
|  [BeraBorrowStoreListenerParams](./lib-base.beraborrowstorelistenerparams.md) | Parameters passed to [BeraBorrowStore](./lib-base.beraborrowstore.md) listeners. |
|  [CollateralGainTransferDetails](./lib-base.collateralgaintransferdetails.md) | Details of a [transferCollateralGainToTrove()](./lib-base.transactableberaborrow.transfercollateralgaintotrove.md) transaction. |
|  [LiquidationDetails](./lib-base.liquidationdetails.md) | Details of a [liquidate()](./lib-base.transactableberaborrow.liquidate.md) or [liquidateUpTo()](./lib-base.transactableberaborrow.liquidateupto.md) transaction. |
|  [PopulatableBeraBorrow](./lib-base.populatableberaborrow.md) | Prepare BeraBorrow transactions for sending. |
|  [PopulatedBeraBorrowTransaction](./lib-base.populatedberaborrowtransaction.md) | A transaction that has been prepared for sending. |
|  [PopulatedRedemption](./lib-base.populatedredemption.md) | A redemption transaction that has been prepared for sending. |
|  [ReadableBeraBorrow](./lib-base.readableberaborrow.md) | Read the state of the BeraBorrow protocol. |
|  [RedemptionDetails](./lib-base.redemptiondetails.md) | Details of a [redeemNECT()](./lib-base.transactableberaborrow.redeemnect.md) transaction. |
|  [SendableBeraBorrow](./lib-base.sendableberaborrow.md) | Send BeraBorrow transactions. |
|  [SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md) | A transaction that has already been sent. |
|  [StabilityDepositChangeDetails](./lib-base.stabilitydepositchangedetails.md) | Details of a [depositNECTInStabilityPool()](./lib-base.transactableberaborrow.depositnectinstabilitypool.md) or [withdrawNECTFromStabilityPool()](./lib-base.transactableberaborrow.withdrawnectfromstabilitypool.md) transaction. |
|  [StabilityPoolGainsWithdrawalDetails](./lib-base.stabilitypoolgainswithdrawaldetails.md) | Details of a [withdrawGainsFromStabilityPool()](./lib-base.transactableberaborrow.withdrawgainsfromstabilitypool.md) transaction. |
|  [TransactableBeraBorrow](./lib-base.transactableberaborrow.md) | Send BeraBorrow transactions and wait for them to succeed. |
|  [TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md) | Details of an [adjustTrove()](./lib-base.transactableberaborrow.adjusttrove.md) transaction. |
|  [TroveClosureDetails](./lib-base.troveclosuredetails.md) | Details of a [closeTrove()](./lib-base.transactableberaborrow.closetrove.md) transaction. |
|  [TroveCreationDetails](./lib-base.trovecreationdetails.md) | Details of an [openTrove()](./lib-base.transactableberaborrow.opentrove.md) transaction. |
|  [TroveListingParams](./lib-base.trovelistingparams.md) | Parameters of the [getTroves()](./lib-base.readableberaborrow.gettroves_1.md) function. |

## Variables

|  Variable | Description |
|  --- | --- |
|  [CRITICAL\_COLLATERAL\_RATIO](./lib-base.critical_collateral_ratio.md) | Total collateral ratio below which recovery mode is triggered. |
|  [MAXIMUM\_BORROWING\_RATE](./lib-base.maximum_borrowing_rate.md) | Value that the [borrowing rate](./lib-base.fees.borrowingrate.md) will never exceed. |
|  [MINIMUM\_BORROWING\_RATE](./lib-base.minimum_borrowing_rate.md) | Value that the [borrowing rate](./lib-base.fees.borrowingrate.md) will never decay below. |
|  [MINIMUM\_COLLATERAL\_RATIO](./lib-base.minimum_collateral_ratio.md) | Collateral ratio below which a Trove can be liquidated in normal mode. |
|  [MINIMUM\_REDEMPTION\_RATE](./lib-base.minimum_redemption_rate.md) | Value that the [redemption rate](./lib-base.fees.redemptionrate.md) will never decay below. |
|  [NECT\_LIQUIDATION\_RESERVE](./lib-base.nect_liquidation_reserve.md) | Amount of NECT that's reserved for compensating the liquidator of a Trove. |
|  [NECT\_MINIMUM\_DEBT](./lib-base.nect_minimum_debt.md) | A Trove must always have at least this much debt. |
|  [NECT\_MINIMUM\_NET\_DEBT](./lib-base.nect_minimum_net_debt.md) | A Trove must always have at least this much debt on top of the [liquidation reserve](./lib-base.nect_liquidation_reserve.md)<!-- -->. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md) | One of either a [PendingReceipt](./lib-base.pendingreceipt.md)<!-- -->, a [FailedReceipt](./lib-base.failedreceipt.md) or a [SuccessfulReceipt](./lib-base.successfulreceipt.md)<!-- -->. |
|  [BeraBorrowStoreState](./lib-base.beraborrowstorestate.md) | Type of [BeraBorrowStore](./lib-base.beraborrowstore.md)<!-- -->'s [state](./lib-base.beraborrowstore.state.md)<!-- -->. |
|  [Decimalish](./lib-base.decimalish.md) | Types that can be converted into a Decimal. |
|  [FailedReceipt](./lib-base.failedreceipt.md) | Indicates that the transaction has been mined, but it failed. |
|  [FrontendStatus](./lib-base.frontendstatus.md) | Represents whether an address has been registered as a BeraBorrow frontend. |
|  [MinedReceipt](./lib-base.minedreceipt.md) | Either a [FailedReceipt](./lib-base.failedreceipt.md) or a [SuccessfulReceipt](./lib-base.successfulreceipt.md)<!-- -->. |
|  [PendingReceipt](./lib-base.pendingreceipt.md) | Indicates that the transaction hasn't been mined yet. |
|  [POLLENStakeChange](./lib-base.pollenstakechange.md) | Represents the change between two states of an POLLEN Stake. |
|  [StabilityDepositChange](./lib-base.stabilitydepositchange.md) | Represents the change between two Stability Deposit states. |
|  [SuccessfulReceipt](./lib-base.successfulreceipt.md) | Indicates that the transaction has succeeded. |
|  [TroveAdjustmentParams](./lib-base.troveadjustmentparams.md) | Parameters of an [adjustTrove()](./lib-base.transactableberaborrow.adjusttrove.md) transaction. |
|  [TroveChange](./lib-base.trovechange.md) | Represents the change between two Trove states. |
|  [TroveClosureParams](./lib-base.troveclosureparams.md) | Parameters of a [closeTrove()](./lib-base.transactableberaborrow.closetrove.md) transaction. |
|  [TroveCreationError](./lib-base.trovecreationerror.md) | Describes why a Trove could not be created. |
|  [TroveCreationParams](./lib-base.trovecreationparams.md) | Parameters of an [openTrove()](./lib-base.transactableberaborrow.opentrove.md) transaction. |
|  [UserTroveStatus](./lib-base.usertrovestatus.md) | Represents whether a UserTrove is open or not, or why it was closed. |

