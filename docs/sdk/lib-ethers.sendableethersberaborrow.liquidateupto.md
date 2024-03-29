<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [SendableEthersBeraBorrow](./lib-ethers.sendableethersberaborrow.md) &gt; [liquidateUpTo](./lib-ethers.sendableethersberaborrow.liquidateupto.md)

## SendableEthersBeraBorrow.liquidateUpTo() method

Liquidate the least collateralized Troves up to a maximum number.

<b>Signature:</b>

```typescript
liquidateUpTo(maximumNumberOfTrovesToLiquidate: number, overrides?: EthersTransactionOverrides): Promise<SentEthersBeraBorrowTransaction<LiquidationDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maximumNumberOfTrovesToLiquidate | number | Stop after liquidating this many Troves. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersBeraBorrowTransaction](./lib-ethers.sentethersberaborrowtransaction.md)<!-- -->&lt;[LiquidationDetails](./lib-base.liquidationdetails.md)<!-- -->&gt;&gt;

