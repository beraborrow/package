<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [PopulatableBeraBorrow](./lib-base.populatableberaborrow.md) &gt; [depositCollateral](./lib-base.populatableberaborrow.depositcollateral.md)

## PopulatableBeraBorrow.depositCollateral() method

Adjust existing Trove by depositing more collateral.

<b>Signature:</b>

```typescript
depositCollateral(amount: Decimalish): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | The amount of collateral to add to the Trove's existing collateral. |

<b>Returns:</b>

Promise&lt;[PopulatedBeraBorrowTransaction](./lib-base.populatedberaborrowtransaction.md)<!-- -->&lt;P, [SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->&lt;S, [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md)<!-- -->&lt;R, [TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;&gt;&gt;&gt;

## Remarks

Equivalent to:

```typescript
adjustTrove({ depositCollateral: amount })

```

