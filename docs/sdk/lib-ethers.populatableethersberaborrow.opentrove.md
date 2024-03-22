<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-ethers](./lib-ethers.md) &gt; [PopulatableEthersBeraBorrow](./lib-ethers.populatableethersberaborrow.md) &gt; [openTrove](./lib-ethers.populatableethersberaborrow.opentrove.md)

## PopulatableEthersBeraBorrow.openTrove() method

Open a new Trove by depositing collateral and borrowing NECT.

<b>Signature:</b>

```typescript
openTrove(params: TroveCreationParams<Decimalish>, maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersBeraBorrowTransaction<TroveCreationDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [TroveCreationParams](./lib-base.trovecreationparams.md)<!-- -->&lt;[Decimalish](./lib-base.decimalish.md)<!-- -->&gt; | How much to deposit and borrow. |
|  maxBorrowingRateOrOptionalParams | [Decimalish](./lib-base.decimalish.md) \| [BorrowingOperationOptionalParams](./lib-ethers.borrowingoperationoptionalparams.md) |  |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersBeraBorrowTransaction](./lib-ethers.populatedethersberaborrowtransaction.md)<!-- -->&lt;[TroveCreationDetails](./lib-base.trovecreationdetails.md)<!-- -->&gt;&gt;

## Remarks

If `maxBorrowingRate` is omitted, the current borrowing rate plus 0.5% is used as maximum acceptable rate.
