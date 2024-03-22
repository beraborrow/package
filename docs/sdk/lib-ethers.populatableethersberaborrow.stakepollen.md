<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md) &gt; [stakePOLLEN](./lib-ethers.populatableethersberaborrow.stakepollen.md)

## PopulatableEthersBeraBorrow.stakePOLLEN() method

Stake POLLEN to start earning fee revenue or increase existing stake.

<b>Signature:</b>

```typescript
stakePOLLEN(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersBeraBorrowTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | Amount of POLLEN to add to new or existing stake. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersBeraBorrowTransaction](./lib-ethers.populatedethersberaborrowtransaction.md)<!-- -->&lt;void&gt;&gt;

## Remarks

As a side-effect, the transaction will also pay out an existing POLLEN stake's [collateral gain](./lib-base.pollenstake.collateralgain.md) and [NECT gain](./lib-base.pollenstake.nectgain.md)<!-- -->.
