<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [BeraBorrowStoreDerivedState](./lib-base.beraborrowstorederivedstate.md) &gt; [redemptionRate](./lib-base.beraborrowstorederivedstate.redemptionrate.md)

## BeraBorrowStoreDerivedState.redemptionRate property

Current redemption rate.

<b>Signature:</b>

```typescript
redemptionRate: Decimal;
```

## Remarks

Note that the actual rate paid by a redemption transaction will depend on the amount of NECT being redeemed.

Use [Fees.redemptionRate()](./lib-base.fees.redemptionrate.md) to calculate a precise redemption rate.
