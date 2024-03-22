<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md) &gt; [repayNECT](./lib-ethers.populatableethersberaborrow.repaynect.md)

## PopulatableEthersBeraBorrow.repayNECT() method

Adjust existing Trove by repaying some of its debt.

<b>Signature:</b>

```typescript
repayNECT(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersBeraBorrowTransaction<TroveAdjustmentDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | The amount of NECT to repay. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersBeraBorrowTransaction](./lib-ethers.populatedethersberaborrowtransaction.md)<!-- -->&lt;[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;&gt;

## Remarks

Equivalent to:

```typescript
adjustTrove({ repayNECT: amount })

```
