<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [TransactableBeraBorrow](./lib-base.transactableberaborrow.md) &gt; [liquidateUpTo](./lib-base.transactableberaborrow.liquidateupto.md)

## TransactableBeraBorrow.liquidateUpTo() method

Liquidate the least collateralized Troves up to a maximum number.

<b>Signature:</b>

```typescript
liquidateUpTo(maximumNumberOfTrovesToLiquidate: number): Promise<LiquidationDetails>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maximumNumberOfTrovesToLiquidate | number | Stop after liquidating this many Troves. |

<b>Returns:</b>

Promise&lt;[LiquidationDetails](./lib-base.liquidationdetails.md)<!-- -->&gt;

## Exceptions

Throws [TransactionFailedError](./lib-base.transactionfailederror.md) in case of transaction failure.

