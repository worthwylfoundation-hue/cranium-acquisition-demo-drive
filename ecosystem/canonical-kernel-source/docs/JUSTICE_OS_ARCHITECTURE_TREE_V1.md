# Convertible Cranium Justice OS — Full Architecture Tree (V1.1)

**Product:** Justice OS — the authority-bound operating system.
**Normative rule:** Cognition may come from anywhere. Authority comes only through Cranium (Liberty Kernel).

**Status legend:** **I** implemented + checks · **P** partial · **T** target brand · **X** not in audited trees.

Repo slug map: `docs/REPOSITORY_NAMING_MAP_V1.md`
Pin honesty: `KERNEL_PIN` (tip may be ahead of verified stamp).

---

## 1. Layout rule (authoritative)

- **Guardian substrate** and **Imperial substrate** are **two columns**.
- **Each column carries two engines** on that line (not one shared horizontal engine strip).
- **Liberty Kernel** is the **central authority boundary under** both columns — **not** “Engine 3” peer in the substrate engine row.
- **Quad-engine** = Guardian A1+A2 + Imperial B1+B2.
- **Quantum hybrid** = supporting capability under the boundary, **not** a fifth engine.

```text
CONVERTIBLE CRANIUM
│  "Cognition may come from anywhere. Authority comes only through Cranium."
│
└── CONVERTIBLE CRANIUM JUSTICE OS                      [T]
    └── CONVERTIBLE CRANIUM COMMANDER AI                [P — propose / orchestrate only]
        └── QUANTUM-HYBRID AUTHORITY-BOUND GOVERNANCE LAYER [P/T — dual substrate · quad engine]
            │
            ├─────────────────────┬─────────────────────┐
            │  GUARDIAN SUBSTRATE │  IMPERIAL SUBSTRATE │
            │  Constitutional     │  Evidence           │
            │  Integrity          │  Integrity          │
            │                     │                     │
            │  Engine A1          │  Engine B1          │
            │  Synapse D_A        │  Synapse D_B        │
            │  Ingress + bind     │  Ingress + bind     │
            │  for constitutional │  for evidence       │
            │  projection         │  projection         │
            │                     │                     │
            │  Engine A2          │  Engine B2          │
            │  Constitutional     │  Evidence           │
            │  Authority          │  Grounding          │
            │  (Guardian path)    │  (Imperial path)    │
            └─────────┬───────────┴──────────┬──────────┘
                      │   convergence        │
                      │   (not a vote)       │
                      └──────────┬───────────┘
                                 ▼
                    CONVERTIBLE CRANIUM LIBERTY KERNEL      [I code as cranium-kernel]
                    Central authority boundary
                    admit → evaluate → GRANT|DENY
                    atomic state + journal + receipt
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         Miracle Memory    Circuit/COMA         ASO bottleneck
         Metabolic v2 [X]  Quantum hybrid [T]   Trusted exec [P]
         Receipts · lineage · audit             Key lifecycle [I/P]
```

---

## 2. Engine map

| ID | Name | Substrate line | Grant? | Status |
|----|------|----------------|--------|--------|
| **A1** | Synapse D_A — constitutional projection ingress | Guardian | No | I/P |
| **A2** | Constitutional Authority | Guardian | No (prepares only) | P |
| **B1** | Synapse D_B — evidence projection ingress | Imperial | No | I/P |
| **B2** | Evidence Grounding | Imperial | No (prepares only) | P |
| **Boundary** | **Liberty Kernel** (`cranium-kernel`) | Under both | **Yes — sole** | **I** |

Synapse is one system with **two substrate-aligned projections** (D_A / D_B) so each column still has two engines.

---

## 3. Implementation reconciliation

| Node | Status | Notes |
|------|--------|-------|
| Justice OS | T | Product envelope |
| Commander AI | P | `convertible-cranium-commander`; boot #17 harden |
| Guardian / Imperial substrates | P | Paths in evaluation model; not separate grant repos |
| Synapse A1/B1 | I/P | Adapter/controller; cannot grant |
| Constitutional / Evidence engines A2/B2 | P | Inside evaluator / attestation path |
| Liberty Kernel | **I** | Sole GRANT/DENY; `verify` + denial-semantics V-006..V-008 |
| Miracle Memory, COMA, circuit breaker | I | Kernel checks |
| Metabolic Memory v2 | X | Not on main grant path |
| Quantum hybrid | T/X | Capability only; must still pass Kernel |
| HSM / verified boot | X | Non-claims |

---

## 4. Governing logic

1. Justice OS = product.
2. Commander AI = interface — propose only.
3. Guardian = Constitutional Integrity; Imperial = Evidence Integrity.
4. Convergence is conjunction, not voting.
5. Quantum/classical/external compute never grants.
6. Only Liberty Kernel authorizes, denies, commits, receipts.

Demo: `docs/DEMONSTRATION_AUTHORITY_RECEIPT_V1.md`
Binder: `docs/ACQUISITION_BINDER_INDEX.md`
Naming map: `docs/REPOSITORY_NAMING_MAP_V1.md`

---

## 5. Non-claims

Tree ≠ every branch shipped. Tip ≠ verified unless `KERNEL_PIN` stamp matches tip after full verify. Liberty Kernel product name ≠ separate repo until rename map is executed on GitHub.
