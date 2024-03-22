<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [EthersBeraBorrow](./lib-ethers.ethersberaborrow.md) &gt; [withdrawGainsFromStaking](./lib-ethers.ethersberaborrow.withdrawgainsfromstaking.md)

## EthersBeraBorrow.withdrawGainsFromStaking() method

Withdraw [collateral gain](./lib-base.pollenstake.collateralgain.md) and [NECT gain](./lib-base.pollenstake.nectgain.md) from POLLEN stake.

<b>Signature:</b>

```typescript
withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;void&gt;

## Exceptions

Throws [EthersTransactionFailedError](./lib-ethers.etherstransactionfailederror.md) in case of transaction failure. Throws [EthersTransactionCancelledError](./lib-ethers.etherstransactioncancellederror.md) if the transaction is cancelled or replaced.
