<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [SendableEthersBeraBorrow](./lib-ethers.sendableethersberaborrow.md) &gt; [repayNECT](./lib-ethers.sendableethersberaborrow.repaynect.md)

## SendableEthersBeraBorrow.repayNECT() method

Adjust existing Trove by repaying some of its debt.

<b>Signature:</b>

```typescript
repayNECT(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | The amount of NECT to repay. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersBeraBorrowTransaction](./lib-ethers.sentethersberaborrowtransaction.md)<!-- -->&lt;[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;&gt;

## Remarks

Equivalent to:

```typescript
adjustTrove({ repayNECT: amount })

```

