<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [PopulatableBeraBorrow](./lib-base.populatableberaborrow.md) &gt; [stakeUniTokens](./lib-base.populatableberaborrow.stakeunitokens.md)

## PopulatableBeraBorrow.stakeUniTokens() method

Stake Uniswap iBGT/NECT LP tokens to participate in liquidity mining and earn POLLEN.

<b>Signature:</b>

```typescript
stakeUniTokens(amount: Decimalish): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of LP tokens to add to new or existing stake. |

<b>Returns:</b>

Promise&lt;[PopulatedBeraBorrowTransaction](./lib-base.populatedberaborrowtransaction.md)<!-- -->&lt;P, [SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->&lt;S, [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;&gt;

