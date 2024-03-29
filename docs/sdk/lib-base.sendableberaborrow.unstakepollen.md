<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [SendableBeraBorrow](./lib-base.sendableberaborrow.md) &gt; [unstakePOLLEN](./lib-base.sendableberaborrow.unstakepollen.md)

## SendableBeraBorrow.unstakePOLLEN() method

Withdraw POLLEN from staking.

<b>Signature:</b>

```typescript
unstakePOLLEN(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of POLLEN to withdraw. |

<b>Returns:</b>

Promise&lt;[SentBeraBorrowTransaction](./lib-base.sentberaborrowtransaction.md)<!-- -->&lt;S, [BeraBorrowReceipt](./lib-base.beraborrowreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out the POLLEN stake's [collateral gain](./lib-base.pollenstake.collateralgain.md) and [NECT gain](./lib-base.pollenstake.nectgain.md)<!-- -->.

