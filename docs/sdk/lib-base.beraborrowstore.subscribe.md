<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@beraborrow/lib-base](./lib-base.md) &gt; [BeraBorrowStore](./lib-base.beraborrowstore.md) &gt; [subscribe](./lib-base.beraborrowstore.subscribe.md)

## BeraBorrowStore.subscribe() method

Register a state change listener.

<b>Signature:</b>

```typescript
subscribe(listener: (params: BeraBorrowStoreListenerParams<T>) => void): () => void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  listener | (params: [BeraBorrowStoreListenerParams](./lib-base.beraborrowstorelistenerparams.md)<!-- -->&lt;T&gt;) =&gt; void | Function that will be called whenever state changes. |

<b>Returns:</b>

() =&gt; void

Function to unregister this listener.
