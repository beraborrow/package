<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [NECT\_MINIMUM\_DEBT](./lib-base.nect_minimum_debt.md)

## NECT\_MINIMUM\_DEBT variable

A Trove must always have at least this much debt.

<b>Signature:</b>

```typescript
NECT_MINIMUM_DEBT: Decimal
```

## Remarks

Any transaction that would result in a Trove with less debt than this will be reverted.
