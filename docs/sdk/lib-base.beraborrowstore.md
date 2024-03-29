<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [BeraBorrowStore](./lib-base.beraborrowstore.md)

## BeraBorrowStore class

Abstract base class of BeraBorrow data store implementations.

<b>Signature:</b>

```typescript
export declare abstract class BeraBorrowStore<T = unknown> 
```

## Remarks

The type parameter `T` may be used to type extra state added to [BeraBorrowStoreState](./lib-base.beraborrowstorestate.md) by the subclass.

Implemented by [BlockPolledBeraBorrowStore](./lib-ethers.blockpolledberaborrowstore.md)<!-- -->.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [logging](./lib-base.beraborrowstore.logging.md) |  | boolean | Turn console logging on/off. |
|  [onLoaded?](./lib-base.beraborrowstore.onloaded.md) |  | () =&gt; void | <i>(Optional)</i> Called after the state is fetched for the first time. |
|  [state](./lib-base.beraborrowstore.state.md) |  | [BeraBorrowStoreState](./lib-base.beraborrowstorestate.md)<!-- -->&lt;T&gt; | The current store state. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [start()](./lib-base.beraborrowstore.start.md) |  | Start monitoring the blockchain for BeraBorrow state changes. |
|  [subscribe(listener)](./lib-base.beraborrowstore.subscribe.md) |  | Register a state change listener. |

