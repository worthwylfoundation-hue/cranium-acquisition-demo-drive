# Canonical Authority Proxy

`KernelAuthorityProxy` is the supported boundary for external callers. A caller submits an `AuthorityTransitionRequest`; it does not provide a mutable state object, reducer, receipt, or journal frame.

## Contract

```ts
evaluate(request) -> { transition, replayStatus }
commit(request) -> CanonicalReceipt
verifyReceipt(receipt) -> boolean
```

`commit` loads canonical state from the durable authority store, evaluates through the Kernel boundary validator and transition engine, reduces through the Kernel reducer, and commits the resulting state and journal frame atomically. The returned receipt is canonical only when its transaction ID, journal sequence, request hash, and state hash are represented in the Kernel authority store.

## Durable reference implementation

`SQLiteAuthorityStore` uses SQLite WAL mode with `synchronous = FULL`, an append-only journal table, predecessor-frame hashes, state hashes, and an atomic `BEGIN IMMEDIATE` commit. On startup and load, it verifies journal sequence, predecessor links, frame hashes, and the state/journal sequence relationship. Any mismatch throws a typed integrity failure instead of returning potentially corrupted authority state.

## Boundary guarantee

A demo, UI, simulator, model, or external repository may call the proxy, but it cannot make a receipt canonical by constructing a look-alike object. Canonicality is established by durable Kernel persistence and verification.

## Remaining deployment work

The reference store is not a complete operational deployment. A buyer-grade deployment still needs migration controls, database file permissions, backup/restore procedures, key custody and rotation, multi-process test coverage, observability, and an external security review.
