# Repository naming map — Justice OS current architecture

**Date:** 2026-10-17  
**Purpose:** Align GitHub **slugs** with **product names**.  
**Constraint:** This integration **cannot** rename repositories via API. Use GitHub → Settings → General → Repository name. Old URLs redirect.

**Normative rule:** Cognition may come from anywhere. Authority comes only through Liberty Kernel.

---

## Preferred slug targets (execute when ready)

| Priority | Current slug | **Rename to** | Product role |
|----------|--------------|---------------|--------------|
| 1 | `cranium-kernel` | **`liberty-kernel`** | Sole authority core (GRANT/DENY/receipts) |
| 2 | `convertible-cranium-commander` | **`justice-os-commander`** | Commander AI UI — no grant |
| 3 | `cranium-boot-drive` | **`justice-os-boot`** | Appliance / ISO / Chromium pipeline |
| 4 | `cranium-acquisition-demo-drive` | **`justice-os-acquisition-demo`** | Offline diligence demo media |
| 5 | `cranium-ai` | **`commander-ai-cognition`** | Propose-only cognition |
| 6 | `cranium-synapse` | **`synapse`** or **`cranium-synapse`** (keep if short name taken) | Ingress D_A/D_B — no grant |
| 7 | `qcd-fra` | **`quantum-hybrid-capability`** | Supporting capability; not 5th engine |
| 8 | `cranium-provider-integrations` | **`provider-integrations`** | Multi-model proposal plane |
| 9 | `cranium-diligence-workbench` | **`diligence-workbench`** | Evidence review |
| 10 | `cranium-adversarial-bridge` | **`adversarial-bridge`** | Controlled test bridge |
| — | `cranium-ultra-platform` (archived) | **Do not rename** unless un-archiving | Superseded |
| — | `cranium-archive` | `cranium-archive` OK | Historical records |
| — | `worthwyl-forge` | `worthwyl-forge` OK | Non-canonical client |

### Do not create empty repos yet

Guardian / Imperial are **evaluation paths**, not required standalone repos. Optional later: `guardian-substrate`, `imperial-substrate`, `justice-os` (meta docs only).

---

## Human rename checklist (per repo)

1. Settings → General → Repository name → save.  
2. `git remote set-url origin git@github.com:worthwyl2022-cloud/<new>.git`  
3. If Kernel renamed: update `KERNEL_PIN` `KERNEL_REPO` and Commander `KERNEL_PIN` / boundary links.  
4. Prefer renames **after** pin tip/stamp are stable for a diligence freeze.  

---

## Architecture names (not slugs)

See `docs/JUSTICE_OS_ARCHITECTURE_TREE_V1.md`:

- **Guardian** column: Engine A1 Synapse D_A + Engine A2 Constitutional Authority  
- **Imperial** column: Engine B1 Synapse D_B + Engine B2 Evidence Grounding  
- **Liberty Kernel** under both as sole authority boundary  
