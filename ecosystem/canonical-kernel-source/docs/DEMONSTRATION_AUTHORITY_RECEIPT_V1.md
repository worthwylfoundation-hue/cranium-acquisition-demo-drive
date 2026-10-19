# Demonstration: propose → deny unauthorized → grant + verifiable receipt

**Purpose:** Make the authority boundary undeniable using the shipped Kernel checks.  
**Primary script:** `scripts/authority-denial-semantics-check.ts`  
npm script: `npm run verify:denial-semantics`

This is **project verification**, not a live multi-party demo UI. It exercises the same contracts a buyer can re-run.

---

## Prerequisites

```bash
git clone https://github.com/worthwylfoundation-hue/cranium-kernel.git
cd cranium-kernel
git checkout main
git rev-parse HEAD   # compare to KERNEL_PIN
npm ci
```

---

## Act 1 — Unauthorized path blocked (V-006)

**Story:** Contradictory cognition is quarantined and cannot be advanced to authority-ready or prepare authorization.

**Evidence in script:**

- `observe` contradiction → state `OBSERVING`  
- `quarantine` → `QUARANTINED`  
- `advance(... READY_FOR_AUTHORITY)` throws `COGNITION_TERMINAL`  
- `prepareAuthorization` throws `COGNITION_NOT_READY_FOR_AUTHORITY`  

**Meaning:** A model or agent producing contradictory content does **not** become a grant.

---

## Act 2 — Authorized transition produces a receipt

**Story:** A well-formed `AuthorityTransitionRequest` is committed through `KernelAuthorityProxy` + `SQLiteAuthorityStore`.

**Evidence in script:**

- `firstReceipt = proxy.commit(baseRequest)`  
- `firstReceipt.authority === 'cranium-kernel'`  
- `proxy.verifyReceipt(firstReceipt) === true`  

**Meaning:** Successful authority is **evidence-bearing** (receipt), not a silent boolean.

---

## Act 3 — Replay and conflicting reuse blocked (V-007)

**Story:** Exact replay returns the existing transition; same idempotency key with different payload is denied.

**Evidence:**

- Exact replay: `replayStatus.type === 'Existing'`; second commit equals first receipt  
- Conflicting reuse: `ConflictingReuse`, `Denied`, `REPLAY_CONFLICT`; journal sequence remains 1  

**Meaning:** Unauthorized *repeat* or *mutated* reuse cannot mint a second authority event.

---

## Act 4 — Tampered evidence rejected (V-008)

**Story:** Forged receipt fields fail verification; journal hash tampering fails store load.

**Evidence:**

- Mutated `authority`, `transactionId`, `requestHash`, `stateHash`, or `journalSequence` → `verifyReceipt` false  
- SQL update of `frame_hash` → `AUTHORITY_JOURNAL_HASH_FAILURE` on reload  

**Meaning:** Receipts are not decorative; integrity failure is fail-closed.

---

## One-command run

```bash
npm run verify:denial-semantics
# expect: AUTHORITY_DENIAL_SEMANTICS_PASS ... exit 0
```

Full suite (broader corpus):

```bash
npm run verify
```

---

## What this demonstration does *not* prove

- Network enterprise gateway under real OIDC  
- HSM-backed signing  
- Chromium ISO boot  
- UI cannot escalate authority without Kernel (separate adversarial UI suite)  

For those, see `docs/EVIDENCE_GAPS.md`.
