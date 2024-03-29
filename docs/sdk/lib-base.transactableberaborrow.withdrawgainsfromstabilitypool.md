<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [TransactableBeraBorrow](./lib-base.transactableberaborrow.md) &gt; [withdrawGainsFromStabilityPool](./lib-base.transactableberaborrow.withdrawgainsfromstabilitypool.md)

## TransactableBeraBorrow.withdrawGainsFromStabilityPool() method

Withdraw [collateral gain](./lib-base.stabilitydeposit.collateralgain.md) and [POLLEN reward](./lib-base.stabilitydeposit.pollenreward.md) from Stability Deposit.

<b>Signature:</b>

```typescript
withdrawGainsFromStabilityPool(): Promise<StabilityPoolGainsWithdrawalDetails>;
```
<b>Returns:</b>

Promise&lt;[StabilityPoolGainsWithdrawalDetails](./lib-base.stabilitypoolgainswithdrawaldetails.md)<!-- -->&gt;

## Exceptions

Throws [TransactionFailedError](./lib-base.transactionfailederror.md) in case of transaction failure.

