# Convertible Cranium Justice OS — Acquisition Binder Index

**Date:** 2026-10-17  
**Status:** Engineering diligence package (not legal advice; not a security certification)  
**Authority core (product name):** Liberty Kernel  
**Authority core (GitHub slug today):** `cranium-kernel`  
**Primary repo:** https://github.com/worthwyl2022-cloud/cranium-kernel  

## How to use this binder

1. Read this index.  
2. Open linked documents for depth.  
3. Reproduce verification from `KERNEL_PIN` (note tip may be ahead of stamp).  
4. Treat Schedule A (Commander / Justice OS surface) vs Schedule B (Liberty Kernel retained) as commercial structure.  

Naming map (slug → product): `docs/REPOSITORY_NAMING_MAP_V1.md`  
Architecture (dual-column engines): `docs/JUSTICE_OS_ARCHITECTURE_TREE_V1.md`  

---

## 1. Architecture map

**Normative rule:** Cognition may come from anywhere. Authority comes only through Liberty Kernel (Cranium Kernel).

```
Commander AI / models / tools     →  propose only
        ↓
Guardian / Constitutional Integrity   Imperial / Evidence Integrity
  Engine A1 Synapse D_A             Engine B1 Synapse D_B
  Engine A2 Constitutional          Engine B2 Evidence Grounding
        ↓  convergence (not a vote)  ↓
Liberty Kernel — sole GRANT|DENY + atomic state + journal + receipt
        ↓
Execution gate (receipt-bound only)
```

| Document | Path |
|----------|------|
| Justice OS tree | `docs/JUSTICE_OS_ARCHITECTURE_TREE_V1.md` |
| Authority protocol | `docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md` |
| Constitution | `docs/CRANIUM_CONSTITUTION_V1.md` |
| Denial semantics | `docs/AUTHORITY_DENIAL_SEMANTICS_V1.md` |
| Key custody | `docs/KEY_CUSTODY_V1.md` |
| Synapse controller | `docs/SYNAPSE_CONTROLLER_V1.md` |
| Threat model | `docs/THREAT_MODEL_V1.md` |
| Justice OS Chromium Edition boundary | `convertible-cranium-commander/COMMANDER_OS_PACKAGE_BOUNDARY.md` |
| IP outline | `docs/IP_CHAIN_OF_TITLE_V1.md` |
| Demo procedure | `docs/DEMONSTRATION_AUTHORITY_RECEIPT_V1.md` |

---

## 2. Asset inventory (transfer schedules)

| Schedule | Product name | Current slug | Default |
|----------|--------------|--------------|---------|
| **A** | Justice OS Commander AI surface | `convertible-cranium-commander` | Licensable OS/UI |
| **B** | **Liberty Kernel** authority | `cranium-kernel` | **Retained unless separately priced** |
| **C** | Justice OS Boot / Acquisition demo | `cranium-boot-drive`, `cranium-acquisition-demo-drive` | Optional |
| **D** | Commander AI cognition | `cranium-ai` | Optional; propose only |
| **E** | Archived / historical | Ultra, archive, etc. | Reference only |

---

## 3. Test evidence

| Item | Value |
|------|--------|
| Pin | `KERNEL_PIN` |
| Verified stamp | `VERIFIED_DILIGENCE_STAMP` (see pin; currently `52f312d`, 2026-10-15, exit 0) |
| Main tip | `KERNEL_MAIN_TIP` — **may be ahead of stamp**; do not equate tip with verified |
| Commands | `npm ci && npm run verify && npm run verify:denial-semantics` |
| Denial demo | V-006 / V-007 / V-008 — `scripts/authority-denial-semantics-check.ts` |

**Not claimed:** independent security audit, HSM/KMS, verified boot, quantum runtime, Metabolic Memory v2 on grant path, customers, revenue.

---

## 4. Demonstration

`docs/DEMONSTRATION_AUTHORITY_RECEIPT_V1.md` → `npm run verify:denial-semantics`

---

## 5. Known limitations

See `docs/EVIDENCE_GAPS.md`. Highlights: HSM, Listener, verified boot, env-gated Redis/Postgres, partial stress suite, tip-ahead-of-stamp until re-run.

---

## 6. Repository hygiene (2026-10-17)

| Class | Treatment |
|-------|-----------|
| Liberty Kernel (`cranium-kernel`) | Sole authority |
| Commander / Boot / Acquisition | Product surfaces; non-granting |
| Synapse / providers | Ingress / proposal plane |
| Archived Ultra | Reference only |

**Open PRs on core stack (last audit):** none on Kernel, Commander, Boot, AI, Acquisition.  
Rename when ready per `docs/REPOSITORY_NAMING_MAP_V1.md` (GitHub Settings; API cannot rename).

---

## 7. Transfer checklist (counsel)

- [ ] Entity / LLC title  
- [ ] Schedule A vs B (Commander vs Liberty Kernel)  
- [ ] OSS licenses / SBOM  
- [ ] No secrets in public trees  
- [ ] Buyer reproduces pin verify  
- [ ] Non-claims in LOI  
- [ ] Optional: execute GitHub renames after deal structure stable  

---

**Author fact pattern (not a warranty):** Wyl Mathes · `worthwyl2022-cloud` · binder account `worthwylmedia-lang`.
