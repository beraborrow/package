<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [EthersBeraBorrow](./lib-ethers.ethersberaborrow.md) &gt; [withdrawGainsFromStabilityPool](./lib-ethers.ethersberaborrow.withdrawgainsfromstabilitypool.md)

## EthersBeraBorrow.withdrawGainsFromStabilityPool() method

Withdraw [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and [POLLEN reward](./lib-base.stabilitydeposit.pollenreward.md) from Stability Deposit.

<b>Signature:</b>

```typescript
withdrawGainsFromStabilityPool(overrides?: EthersTransactionOverrides): Promise<StabilityPoolGainsWithdrawalDetails>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[StabilityPoolGainsWithdrawalDetails](./lib-base.stabilitypoolgainswithdrawaldetails.md)<!-- -->&gt;

## Exceptions

Throws [EthersTransactionFailedError](./lib-ethers.etherstransactionfailederror.md) in case of transaction failure. Throws [EthersTransactionCancelledError](./lib-ethers.etherstransactioncancellederror.md) if the transaction is cancelled or replaced.
