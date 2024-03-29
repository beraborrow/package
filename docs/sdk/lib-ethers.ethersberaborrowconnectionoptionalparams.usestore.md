<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [EthersBeraBorrowConnectionOptionalParams](./lib-ethers.ethersberaborrowconnectionoptionalparams.md) &gt; [useStore](./lib-ethers.ethersberaborrowconnectionoptionalparams.usestore.md)

## EthersBeraBorrowConnectionOptionalParams.useStore property

Create a [BeraBorrowStore](./lib-base.beraborrowstore.md) and expose it as the `store` property.

<b>Signature:</b>

```typescript
readonly useStore?: EthersBeraBorrowStoreOption;
```

## Remarks

When set to one of the available [options](./lib-ethers.ethersberaborrowstoreoption.md)<!-- -->, [ReadableEthersBeraBorrow.connect()](./lib-ethers.readableethersberaborrow.connect_1.md) will return a [ReadableEthersBeraBorrowWithStore](./lib-ethers.readableethersberaborrowwithstore.md)<!-- -->, while [EthersBeraBorrow.connect()](./lib-ethers.ethersberaborrow.connect_1.md) will return an [EthersBeraBorrowWithStore](./lib-ethers.ethersberaborrowwithstore.md)<!-- -->.

Note that the store won't start monitoring the blockchain until its [start()](./lib-base.beraborrowstore.start.md) function is called.

