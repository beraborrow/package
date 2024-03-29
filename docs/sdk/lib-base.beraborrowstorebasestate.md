<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [BeraBorrowStoreBaseState](./lib-base.beraborrowstorebasestate.md)

## BeraBorrowStoreBaseState interface

State variables read from the blockchain.

<b>Signature:</b>

```typescript
export interface BeraBorrowStoreBaseState 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [accountBalance](./lib-base.beraborrowstorebasestate.accountbalance.md) | [Decimal](./lib-base.decimal.md) | User's native currency balance (e.g. iBGT). |
|  [collateralSurplusBalance](./lib-base.beraborrowstorebasestate.collateralsurplusbalance.md) | [Decimal](./lib-base.decimal.md) | Amount of leftover collateral available for withdrawal to the user. |
|  [frontend](./lib-base.beraborrowstorebasestate.frontend.md) | [FrontendStatus](./lib-base.frontendstatus.md) | Status of currently used frontend. |
|  [liquidityMiningPOLLENReward](./lib-base.beraborrowstorebasestate.liquidityminingpollenreward.md) | [Decimal](./lib-base.decimal.md) | Amount of POLLEN the user has earned through mining liquidity. |
|  [liquidityMiningStake](./lib-base.beraborrowstorebasestate.liquidityminingstake.md) | [Decimal](./lib-base.decimal.md) | Amount of Uniswap iBGT/NECT LP tokens the user has staked in liquidity mining. |
|  [nectBalance](./lib-base.beraborrowstorebasestate.nectbalance.md) | [Decimal](./lib-base.decimal.md) | User's NECT token balance. |
|  [nectInStabilityPool](./lib-base.beraborrowstorebasestate.nectinstabilitypool.md) | [Decimal](./lib-base.decimal.md) | Total amount of NECT currently deposited in the Stability Pool. |
|  [numberOfTroves](./lib-base.beraborrowstorebasestate.numberoftroves.md) | number | Number of Troves that are currently open. |
|  [ownFrontend](./lib-base.beraborrowstorebasestate.ownfrontend.md) | [FrontendStatus](./lib-base.frontendstatus.md) | Status of user's own frontend. |
|  [pollenBalance](./lib-base.beraborrowstorebasestate.pollenbalance.md) | [Decimal](./lib-base.decimal.md) | User's POLLEN token balance. |
|  [pollenStake](./lib-base.beraborrowstorebasestate.pollenstake.md) | [POLLENStake](./lib-base.pollenstake.md) | User's POLLEN stake. |
|  [price](./lib-base.beraborrowstorebasestate.price.md) | [Decimal](./lib-base.decimal.md) | Current price of the native currency (e.g. iBGT) in USD. |
|  [remainingLiquidityMiningPOLLENReward](./lib-base.beraborrowstorebasestate.remainingliquidityminingpollenreward.md) | [Decimal](./lib-base.decimal.md) | Remaining POLLEN that will be collectively rewarded to liquidity miners. |
|  [remainingStabilityPoolPOLLENReward](./lib-base.beraborrowstorebasestate.remainingstabilitypoolpollenreward.md) | [Decimal](./lib-base.decimal.md) | Remaining POLLEN that will be collectively rewarded to stability depositors. |
|  [stabilityDeposit](./lib-base.beraborrowstorebasestate.stabilitydeposit.md) | [StabilityDeposit](./lib-base.stabilitydeposit.md) | User's stability deposit. |
|  [total](./lib-base.beraborrowstorebasestate.total.md) | [Trove](./lib-base.trove.md) | Total collateral and debt in the BeraBorrow system. |
|  [totalRedistributed](./lib-base.beraborrowstorebasestate.totalredistributed.md) | [Trove](./lib-base.trove.md) | Total collateral and debt per stake that has been liquidated through redistribution. |
|  [totalStakedPOLLEN](./lib-base.beraborrowstorebasestate.totalstakedpollen.md) | [Decimal](./lib-base.decimal.md) | Total amount of POLLEN currently staked. |
|  [totalStakedUniTokens](./lib-base.beraborrowstorebasestate.totalstakedunitokens.md) | [Decimal](./lib-base.decimal.md) | Total amount of Uniswap iBGT/NECT LP tokens currently staked in liquidity mining. |
|  [troveBeforeRedistribution](./lib-base.beraborrowstorebasestate.trovebeforeredistribution.md) | [TroveWithPendingRedistribution](./lib-base.trovewithpendingredistribution.md) | User's Trove in its state after the last direct modification. |
|  [uniTokenAllowance](./lib-base.beraborrowstorebasestate.unitokenallowance.md) | [Decimal](./lib-base.decimal.md) | The liquidity mining contract's allowance of user's Uniswap iBGT/NECT LP tokens. |
|  [uniTokenBalance](./lib-base.beraborrowstorebasestate.unitokenbalance.md) | [Decimal](./lib-base.decimal.md) | User's Uniswap iBGT/NECT LP token balance. |

