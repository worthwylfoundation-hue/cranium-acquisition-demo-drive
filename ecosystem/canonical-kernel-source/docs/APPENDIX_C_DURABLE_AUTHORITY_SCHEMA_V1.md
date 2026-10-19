# APPENDIX C: Durable Authority Store Schema & Integrity Map
## Verification anchor
- Repository: `cranium-kernel`
- Verified commit: `60c663cc313ffdc3c7f160ca68939cd4c169967f`
- Verification basis: source inspection plus repository validation at this revision.
- Scope: physical SQLite authority-store schema and directly related integrity behavior.
- Important boundary: logical authority concepts implemented elsewhere are not presented as physical SQLite tables here.

## 1. Physical SQLite schema
The inspected `SQLiteAuthorityStore` creates two tables: `authority_state` and `authority_journal`.

### authority_state
| Column | Definition | Integrity role |
|---|---|---|
| id | INTEGER PRIMARY KEY CHECK (id = 1) | Singleton canonical state row |
| state_json | TEXT NOT NULL | Serialized authoritative state |
| state_hash | TEXT NOT NULL | State integrity anchor |
| journal_sequence | INTEGER NOT NULL | State-to-journal position |

### authority_journal
| Column | Definition | Integrity role |
|---|---|---|
| sequence | INTEGER PRIMARY KEY | Monotonic journal position |
| transaction_id | TEXT NOT NULL UNIQUE | Unique transition identity |
| request_json | TEXT NOT NULL | Canonical persisted request |
| transition_json | TEXT NOT NULL | Persisted transition decision |
| state_hash | TEXT NOT NULL | Resulting state integrity anchor |
| previous_hash | TEXT | Prior frame linkage |
| frame_hash | TEXT NOT NULL | Current frame integrity value |
## 2. SQLite durability configuration
The inspected store configures:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
```
These settings provide transactional durability, writer coordination, and foreign-key enforcement for the implemented store. They do not imply encryption or whole-system air-gapping.

## 3. Commit boundary
The store loads and validates current state, derives the next state hash and journal sequence, computes the prior-frame linkage, builds the journal frame, then executes the journal insert and authority-state update inside `BEGIN IMMEDIATE` / `COMMIT`. Errors trigger rollback.

Conceptually:
```
load + integrity check
        |
        v
derive next state / sequence
        |
        v
build frame + hash
        |
        v
BEGIN IMMEDIATE
   |           |
journal      state
insert       update
   \           /
       COMMIT
```

The verified implementation supports atomic persistence of the journal entry and corresponding authority-state update. The WAL mode should be understood as SQLite transaction semantics, not as a claim of mathematical atomicity.

## 4. Frame integrity
For each journal entry, the implementation stores `previous_hash` and `frame_hash`. Integrity validation walks the journal, checks sequence continuity, verifies previous-hash linkage, and recomputes frame hashes.
## 5. Receipt integrity
The store derives a canonical receipt from the transition, request hash, transaction identity, journal sequence, state hash, and decision. Verification rechecks database integrity and validates the expected request hash and receipt signature relationship.

The implementation also validates transaction ID, request hash, decision, and state hash before accepting a receipt as valid.

## 6. Replay semantics
Replay records are derived from persisted journal/request data. The verified denial-semantics test exercises:
- exact idempotency reuse: existing transition/receipt is returned without a second journal commit;
- conflicting reuse: altered request under the same idempotency key is denied as `ConflictingReuse`;
- conflicting reuse leaves the journal sequence unchanged.

## 7. Corruption behavior
Direct authority-journal frame tampering is detected during integrity validation and produces an authority-journal hash failure. State sequence and final state-hash mismatches have dedicated integrity failures.

This establishes a fail-closed integrity boundary for the inspected authority store. It does not, by itself, establish a universal whole-system fail-closed property across every surrounding repository.
## 8. Logical architecture versus physical schema
The following are documented system responsibilities, but are intentionally NOT represented here as claimed SQLite tables:
- principals and capability authorization;
- session validity;
- cognitive contradiction/quarantine;
- Synapse assessment;
- Miracle Memory continuity;
- Session Circuit Breaker runtime protection.

Those responsibilities are implemented or exercised through separate components and verification paths. V-006 cognitive quarantine is verified in the cognitive authority component, while the physical SQLite authority store contains the two tables documented above.

## 9. Buyer reproduction
From the verified repository revision:
```bash
npm run verify
npm run verify:denial-semantics
```
The targeted denial semantics result at the verified revision was:
```
AUTHORITY_DENIAL_SEMANTICS_PASS V-006=quarantine V-007=replay-blocked V-008=evidence-tamper-blocked canonical-authority=cranium-kernel
```

## 10. Claim boundary
This appendix deliberately does not claim encrypted SQLite storage, whole-system air-gapping, universal multi-repository production status, benchmark superiority, revenue, users, or deployment scale. It documents the inspected implementation and its reproducible evidence boundary.
