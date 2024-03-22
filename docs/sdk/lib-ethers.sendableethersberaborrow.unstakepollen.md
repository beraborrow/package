<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [SendableEthersBeraBorrow](./lib-ethers.sendableethersberaborrow.md) &gt; [unstakePOLLEN](./lib-ethers.sendableethersberaborrow.unstakepollen.md)

## SendableEthersBeraBorrow.unstakePOLLEN() method

Withdraw POLLEN from staking.

<b>Signature:</b>

```typescript
unstakePOLLEN(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersBeraBorrowTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of POLLEN to withdraw. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersBeraBorrowTransaction](./lib-ethers.sentethersberaborrowtransaction.md)<!-- -->&lt;void&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out the POLLEN stake's [collateral gain](./lib-base.pollenstake.collateralgain.md) and [NECT gain](./lib-base.pollenstake.nectgain.md)<!-- -->.
