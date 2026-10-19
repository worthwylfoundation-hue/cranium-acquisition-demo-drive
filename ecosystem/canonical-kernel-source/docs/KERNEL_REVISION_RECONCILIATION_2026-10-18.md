# Canonical Kernel — Access and Revision Reconciliation

**Date:** 2026-10-18  
**Repo:** `worthwyl2022-cloud/cranium-kernel` (private)  
**Product name:** Liberty Kernel  
**Role:** Sole grant / deny / receipt boundary for Justice OS

---

## 1. Access

| Fact | Value |
|------|--------|
| Canonical URL | https://github.com/worthwyl2022-cloud/cranium-kernel |
| Default branch | `main` |
| Visibility | **Private** |
| Open PRs (at report time) | **None** |
| Public implication | Profile / inventory describe the Kernel; they do **not** grant public source access |

Clone (authorized):

```bash
git clone https://github.com/worthwyl2022-cloud/cranium-kernel.git
cd cranium-kernel
git fetch origin
git checkout main
git rev-parse HEAD
```

---

## 2. Revision model (do not collapse these)

| Label | Meaning |
|-------|--------|
| **CURRENT_MAIN_TIP** | `origin/main` HEAD right now |
| **VERIFIED_DILIGENCE_STAMP** | Last revision that completed **full** project verify (CI `npm run verify` gate) |
| **Downstream pin** | What Commander / boot-drive cite for provenance |

**Rule:** Docs-only commits after a stamp are allowed. They do **not** inherit the stamp. Promote a newer tip to the stamp only after full verify exit 0.

---

## 3. Live reconciliation (this report)

| Revision | SHA | Role |
|----------|-----|------|
| **Verified stamp** | `710ab844571c704078852b38d9451ffe68900acf` | Actions **#253** · full verify **PASS** · 2026-10-17 |
| **main at report start** | `3ef18591d7481987add3b05b6fc212e6b121bbc7` | Docs (#54 Justice OS naming) **after** stamp |
| Intermediate docs | `05967099…`, `bd6835bc…` | Pin restamp + completion status |

**Delta:** `710ab84` → `3ef18591` = documentation / naming alignment only (no claim of re-verified implementation tip without a new Actions full gate).

---

## 4. Downstream pins (aligned to stamp)

| Consumer | Pin file | Cites |
|----------|----------|--------|
| Commander | `KERNEL_PIN` | `710ab84` verified |
| Boot / Chromium | `chromiumos/KERNEL_PIN` | `710ab84` verified |
| Account inventory | `ACCOUNT_INVENTORY.md` | `710ab84` |

All consumers correctly pin the **stamp**, not an unverified tip. Good.

---

## 5. How to re-verify a newer tip

```bash
git checkout <candidate-sha>   # or main after pull
npm ci --legacy-peer-deps
npm run verify
# optional focused: npm run verify:denial-semantics
```

Or: Actions → Cranium TypeScript CI → `workflow_dispatch` on `main`.

On exit 0: update `VERIFIED_DILIGENCE_STAMP` in `KERNEL_PIN`, then refresh Commander + boot pins to match.

---

## 6. Non-claims

- Stamp ≠ independent security audit  
- Stamp ≠ HSM/KMS  
- Stamp ≠ ChromiumOS image built  
- Current tip ahead of stamp ≠ silently verified  

---

**Canonical diligence citation for buyers:**  
Liberty Kernel **`710ab84`** · project-verified · Actions #253 · exit 0.
