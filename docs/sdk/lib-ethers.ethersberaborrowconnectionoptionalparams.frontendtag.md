<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [EthersBeraBorrowConnectionOptionalParams](./lib-ethers.ethersberaborrowconnectionoptionalparams.md) &gt; [frontendTag](./lib-ethers.ethersberaborrowconnectionoptionalparams.frontendtag.md)

## EthersBeraBorrowConnectionOptionalParams.frontendTag property

Address that will receive POLLEN rewards from newly created Stability Deposits by default.

<b>Signature:</b>

```typescript
readonly frontendTag?: string;
```

## Remarks

For example [depositNECTInStabilityPool(amount, frontendTag?)](./lib-ethers.ethersberaborrow.depositnectinstabilitypool.md) will tag newly made Stability Deposits with this address when its `frontendTag` parameter is omitted.

