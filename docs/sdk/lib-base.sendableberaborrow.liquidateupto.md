<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [SendableBeraBorrow](./lib-base.sendableberaborrow.md) &gt; [liquidateUpTo](./lib-base.sendableberaborrow.liquidateupto.md)

## SendableBeraBorrow.liquidateUpTo() method

Liquidate the least collateralized Troves up to a maximum number.

<b>Signature:</b>

```typescript
liquidateUpTo(maximumNumberOfTrovesToLiquidate: number): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, LiquidationDetails>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maximumNumberOfTrovesToLiquidate | number | Stop after liquidating this many Troves. |

<b>Returns:</b>

Promise&lt;[SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->&lt;S, [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md)<!-- -->&lt;R, [LiquidationDetails](./lib-base.liquidationdetails.md)<!-- -->&gt;&gt;&gt;

