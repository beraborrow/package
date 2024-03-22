<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md) &gt; [withdrawNECTFromStabilityPool](./lib-ethers.populatableethersberaborrow.withdrawnectfromstabilitypool.md)

## PopulatableEthersBeraBorrow.withdrawNECTFromStabilityPool() method

Withdraw NECT from Stability Deposit.

<b>Signature:</b>

```typescript
withdrawNECTFromStabilityPool(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersBeraBorrowTransaction<StabilityDepositChangeDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of NECT to withdraw. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersBeraBorrowTransaction](./lib-ethers.populatedethersberaborrowtransaction.md)<!-- -->&lt;[StabilityDepositChangeDetails](./lib-base.stabilitydepositchangedetails.md)<!-- -->&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out the Stability Deposit's [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and [POLLEN reward](./lib-base.stabilitydeposit.pollenreward.md)<!-- -->.
