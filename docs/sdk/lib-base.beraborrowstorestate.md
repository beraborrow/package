<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [BeraBorrowStoreState](./lib-base.beraborrowstorestate.md)

## BeraBorrowStoreState type

Type of [BeraBorrowStore](./lib-base.beraborrowstore.md)<!-- -->'s [state](./lib-base.beraborrowstore.state.md)<!-- -->.

<b>Signature:</b>

```typescript
export declare type BeraBorrowStoreState<T = unknown> = BeraBorrowStoreBaseState & BeraBorrowStoreDerivedState & T;
```
<b>References:</b> [BeraBorrowStoreBaseState](./lib-base.beraborrowstorebasestate.md)<!-- -->, [BeraBorrowStoreDerivedState](./lib-base.beraborrowstorederivedstate.md)

## Remarks

It combines all properties of [BeraBorrowStoreBaseState](./lib-base.beraborrowstorebasestate.md) and [BeraBorrowStoreDerivedState](./lib-base.beraborrowstorederivedstate.md) with optional extra state added by the particular `BeraBorrowStore` implementation.

The type parameter `T` may be used to type the extra state.
