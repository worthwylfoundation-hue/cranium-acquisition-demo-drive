# Canonical Kernel Snapshot Provenance

The buyer-facing appliance keeps its customized `ecosystem/cranium-kernel/` demo/UI payload separate from the canonical source snapshot. The demo/UI payload is not represented as an exact source mirror. The exact tracked Kernel source is bundled at `ecosystem/canonical-kernel-source/`, is subordinate to the canonical repository, and is not a separate authority issuer.

- Upstream canonical repository recorded in prior provenance: `https://github.com/worthwyl2022-cloud/cranium-kernel`
- Migration/access caveat (2026-10-19): the expected `worthwylfoundation-hue/cranium-kernel` repository was not found during this refresh, and the upstream repository could not be independently fetched through the connected GitHub account. The bundled 209-file snapshot is therefore the directly verifiable source artifact in this acquisition drive; do not claim the upstream repository has been migrated to Hue until its repository URL and access are verified.
- Snapshot commit: `2d0c6928ed5efb75a22a602f43516d22e9fbf610` (`2d0c692`)
- Verified diligence stamp: `2d0c6928ed5efb75a22a602f43516d22e9fbf610`, recorded 2026-10-18
- Verification basis: merged Kernel PR #55 and its passing hosted checks; the source revision was also recorded as passing a fresh clean-clone `npm ci --legacy-peer-deps`, `npm run verify`, and `npm run verify:denial-semantics` sequence.
- Snapshot path: `ecosystem/canonical-kernel-source/`
- Demo/UI path: `ecosystem/cranium-kernel/` (customized appliance payload; freshness and runtime behavior require separate validation)
- Snapshot content: the 209-file tracked source tree at the exact commit, excluding Git metadata; its root checksum manifest is verified by `scripts/verify-kernel-snapshot.sh`.
- Main-tip distinction: the main-branch tip observed during this refresh was `720c299a2e748d1f5ac4b26530a068499b911399`. It is not substituted for the verified stamp without a new successful verification run.
- Limitations: this is not evidence of an independent security audit, HSM/KMS deployment, verified boot, or production certification.
