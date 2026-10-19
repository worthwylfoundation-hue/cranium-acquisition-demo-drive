# IP chain of title and third-party obligations (outline)

**Not legal advice.** Counsel must confirm entity status, assignments, and filings.

## 1. Claimed authorship pattern

| Element | Stated pattern |
|---------|----------------|
| Primary author | Wyl Mathes |
| Primary GitHub | `worthwyl2022-cloud` |
| Related public binder | `worthwylmedia-lang` (Cranium-Infrastructure docs) |
| Engineering context | Substantial development via Android/Termux |

## 2. Asset classes

| Class | Repositories (representative) | Notes |
|-------|-------------------------------|-------|
| Original Kernel software | `cranium-kernel` | Canonical authority implementation |
| Operator surface | `convertible-cranium-commander` | OS package boundary documented |
| Boot / acquisition demo | `cranium-boot-drive`, `cranium-acquisition-demo-drive` | Appliance / demo |
| AI surface | `cranium-ai` | Cognition; must not grant Kernel authority |
| Archived / historical | `cranium-ultra-platform`, cognitive-core, substrate-reference, etc. | Reference; not production authority |

## 3. Chain-of-title steps (recommended)

1. Confirm whether copyright currently sits with the individual or an LLC.  
2. If LLC exists but is inactive: reinstate or form successor; execute **copyright assignment** of listed repos into the entity.  
3. Maintain a **Schedule of Assigned Works** with repo URLs and tip SHAs at assignment date.  
4. For any OS-only deal: assignment/license of Schedule A only; Kernel on Schedule B retained.  
5. Record any prior oral valuation discussions as non-binding.

## 4. Third-party obligations

| Source | Obligation |
|--------|------------|
| npm / pnpm dependencies | Comply with each package license (MIT/Apache/etc.); keep lockfiles |
| GitHub Actions / CodeQL / third-party actions | Terms of those tools; pin by SHA where security-sensitive |
| OIDC / cloud IdP (if deployed) | Customer/operator accounts — not in repo by default |
| Private voice / media assets | Exclude from OS-only package unless scheduled |
| Manus or other host boilerplate in archived apps | Strip or attribute per their terms on any public clean-up |

## 5. What is *not* established by this file

- Patent grants or patentability  
- Trade secret inventory completeness  
- Clean room status vs any employer  
- Absence of contributors other than the named author (Git history is evidence; counsel reviews)  

## 6. Buyer deliverable list

- Assignment instrument (or license) with schedules  
- `KERNEL_PIN` + verify reproduction  
- OSS notice file / SBOM where generated  
- List of excluded secrets and private assets  
