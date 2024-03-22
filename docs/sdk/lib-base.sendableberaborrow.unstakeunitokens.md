<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [SendableBeraBorrow](./lib-base.sendableberaborrow.md) &gt; [unstakeUniTokens](./lib-base.sendableberaborrow.unstakeunitokens.md)

## SendableBeraBorrow.unstakeUniTokens() method

Withdraw Uniswap iBGT/NECT LP tokens from liquidity mining.

<b>Signature:</b>

```typescript
unstakeUniTokens(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of LP tokens to withdraw. |

<b>Returns:</b>

Promise&lt;[SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->&lt;S, [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;
