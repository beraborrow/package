<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md) &gt; [registerFrontend](./lib-ethers.populatableethersberaborrow.registerfrontend.md)

## PopulatableEthersBeraBorrow.registerFrontend() method

Register current wallet address as a BeraBorrow frontend.

<b>Signature:</b>

```typescript
registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersBeraBorrowTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  kickbackRate | [Decimalish](./lib-base.decimalish.md) | The portion of POLLEN rewards to pass onto users of the frontend (between 0 and 1). |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersBeraBorrowTransaction](./lib-ethers.populatedethersberaborrowtransaction.md)<!-- -->&lt;void&gt;&gt;
