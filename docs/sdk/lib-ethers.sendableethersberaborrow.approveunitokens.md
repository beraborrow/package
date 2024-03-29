<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [SendableEthersBeraBorrow](./lib-ethers.sendableethersberaborrow.md) &gt; [approveUniTokens](./lib-ethers.sendableethersberaborrow.approveunitokens.md)

## SendableEthersBeraBorrow.approveUniTokens() method

Allow the liquidity mining contract to use Uniswap iBGT/NECT LP tokens for [staking](./lib-base.transactableberaborrow.stakeunitokens.md)<!-- -->.

<b>Signature:</b>

```typescript
approveUniTokens(allowance?: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersBeraBorrowTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  allowance | [Decimalish](./lib-base.decimalish.md) | Maximum amount of LP tokens that will be transferrable to liquidity mining (<code>2^256 - 1</code> by default). |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersBeraBorrowTransaction](./lib-ethers.sentethersberaborrowtransaction.md)<!-- -->&lt;void&gt;&gt;

## Remarks

Must be performed before calling [stakeUniTokens()](./lib-base.transactableberaborrow.stakeunitokens.md)<!-- -->.

