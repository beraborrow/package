<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [PopulatableBeraBorrow](./lib-base.populatableberaborrow.md)

## PopulatableBeraBorrow interface

Prepare BeraBorrow transactions for sending.

<b>Signature:</b>

```typescript
export interface PopulatableBeraBorrow<R = unknown, S = unknown, P = unknown> extends _PopulatableFrom<SendableBeraBorrow<R, S>, P> 
```
<b>Extends:</b> \_PopulatableFrom&lt;[SendableBeraBorrow](./lib-base.sendableberaborrow.md)<!-- -->&lt;R, S&gt;, P&gt;

## Remarks

The functions return an object implementing [PopulatedBeraBorrowTransaction](./lib-base.populatedberaborrowtransaction.md)<!-- -->, which can be used to send the transaction and get a [SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->.

Implemented by [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md)<!-- -->.

## Methods

|  Method | Description |
|  --- | --- |
|  [adjustTrove(params, maxBorrowingRate)](./lib-base.populatableberaborrow.adjusttrove.md) | Adjust existing Trove by changing its collateral, debt, or both. |
|  [approveUniTokens(allowance)](./lib-base.populatableberaborrow.approveunitokens.md) | Allow the liquidity mining contract to use Uniswap iBGT/NECT LP tokens for [staking](./lib-base.transactableberaborrow.stakeunitokens.md)<!-- -->. |
|  [borrowNECT(amount, maxBorrowingRate)](./lib-base.populatableberaborrow.borrownect.md) | Adjust existing Trove by borrowing more NECT. |
|  [claimCollateralSurplus()](./lib-base.populatableberaborrow.claimcollateralsurplus.md) | Claim leftover collateral after a liquidation or redemption. |
|  [closeTrove()](./lib-base.populatableberaborrow.closetrove.md) | Close existing Trove by repaying all debt and withdrawing all collateral. |
|  [depositCollateral(amount)](./lib-base.populatableberaborrow.depositcollateral.md) | Adjust existing Trove by depositing more collateral. |
|  [depositNECTInStabilityPool(amount, frontendTag)](./lib-base.populatableberaborrow.depositnectinstabilitypool.md) | Make a new Stability Deposit, or top up existing one. |
|  [exitLiquidityMining()](./lib-base.populatableberaborrow.exitliquiditymining.md) | Withdraw all staked LP tokens from liquidity mining and claim reward. |
|  [liquidate(address)](./lib-base.populatableberaborrow.liquidate.md) | Liquidate one or more undercollateralized Troves. |
|  [liquidateUpTo(maximumNumberOfTrovesToLiquidate)](./lib-base.populatableberaborrow.liquidateupto.md) | Liquidate the least collateralized Troves up to a maximum number. |
|  [openTrove(params, maxBorrowingRate)](./lib-base.populatableberaborrow.opentrove.md) | Open a new Trove by depositing collateral and borrowing NECT. |
|  [redeemNECT(amount, maxRedemptionRate)](./lib-base.populatableberaborrow.redeemnect.md) | Redeem NECT to native currency (e.g. iBGT) at face value. |
|  [registerFrontend(kickbackRate)](./lib-base.populatableberaborrow.registerfrontend.md) | Register current wallet address as a BeraBorrow frontend. |
|  [repayNECT(amount)](./lib-base.populatableberaborrow.repaynect.md) | Adjust existing Trove by repaying some of its debt. |
|  [sendNECT(toAddress, amount)](./lib-base.populatableberaborrow.sendnect.md) | Send NECT tokens to an address. |
|  [sendPOLLEN(toAddress, amount)](./lib-base.populatableberaborrow.sendpollen.md) | Send POLLEN tokens to an address. |
|  [stakePOLLEN(amount)](./lib-base.populatableberaborrow.stakepollen.md) | Stake POLLEN to start earning fee revenue or increase existing stake. |
|  [stakeUniTokens(amount)](./lib-base.populatableberaborrow.stakeunitokens.md) | Stake Uniswap iBGT/NECT LP tokens to participate in liquidity mining and earn POLLEN. |
|  [transferCollateralGainToTrove()](./lib-base.populatableberaborrow.transfercollateralgaintotrove.md) | Transfer [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) from Stability Deposit to Trove. |
|  [unstakePOLLEN(amount)](./lib-base.populatableberaborrow.unstakepollen.md) | Withdraw POLLEN from staking. |
|  [unstakeUniTokens(amount)](./lib-base.populatableberaborrow.unstakeunitokens.md) | Withdraw Uniswap iBGT/NECT LP tokens from liquidity mining. |
|  [withdrawCollateral(amount)](./lib-base.populatableberaborrow.withdrawcollateral.md) | Adjust existing Trove by withdrawing some of its collateral. |
|  [withdrawGainsFromStabilityPool()](./lib-base.populatableberaborrow.withdrawgainsfromstabilitypool.md) | Withdraw [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and [POLLEN reward](./lib-base.stabilitydeposit.pollenreward.md) from Stability Deposit. |
|  [withdrawGainsFromStaking()](./lib-base.populatableberaborrow.withdrawgainsfromstaking.md) | Withdraw [collateral gain](./lib-base.pollenstake.collateralgain.md) and [NECT gain](./lib-base.pollenstake.nectgain.md) from POLLEN stake. |
|  [withdrawNECTFromStabilityPool(amount)](./lib-base.populatableberaborrow.withdrawnectfromstabilitypool.md) | Withdraw NECT from Stability Deposit. |
|  [withdrawPOLLENRewardFromLiquidityMining()](./lib-base.populatableberaborrow.withdrawpollenrewardfromliquiditymining.md) | Withdraw POLLEN that has been earned by mining liquidity. |

