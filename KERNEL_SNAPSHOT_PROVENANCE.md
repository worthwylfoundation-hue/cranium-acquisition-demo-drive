# Canonical Kernel Snapshot Provenance

The buyer-facing appliance keeps its customized `ecosystem/cranium-kernel/` demo/UI payload separate from the canonical source snapshot. The demo/UI payload is not represented as an exact source mirror. The exact tracked Kernel source is bundled at `ecosystem/canonical-kernel-source/`, is subordinate to the canonical repository, and is not a separate authority issuer.

- Canonical repository: `https://github.com/worthwylfoundation-hue/cranium-kernel`
- Canonical main snapshot and verification target: `9508185be264de77ebfe88904e98237e242697f1`, observed and verified on 2026-10-19. This replaces the earlier `2d0c692` snapshot after a full exact-commit verification run.
- Snapshot commit: `9508185be264de77ebfe88904e98237e242697f1` (`9508185`)
- Verified diligence stamp: `9508185be264de77ebfe88904e98237e242697f1`, recorded 2026-10-19
- Verification basis: exact main SHA `9508185be264de77ebfe88904e98237e242697f1` passed clean-checkout `npm ci`, `npm run verify`, and `npm run verify:denial-semantics` on Node.js v24.18.0; npm audit reported 0 vulnerabilities across 71 packages. TypeScript CI, Android CI, Enterprise Integration Evidence, and CodeQL all passed on the exact main SHA.
- Snapshot path: `ecosystem/canonical-kernel-source/`
- Demo/UI path: `ecosystem/cranium-kernel/` (customized appliance payload; freshness and runtime behavior require separate validation)
- Snapshot content: the 209-file tracked source tree at the exact commit, excluding Git metadata; its root checksum manifest is verified by `scripts/verify-kernel-snapshot.sh`.
- Main-tip status: the canonical main snapshot and the verified bundle pin now both identify `9508185be264de77ebfe88904e98237e242697f1`; the older `2d0c692` snapshot has been superseded.
- Limitations: this is not evidence of an independent security audit, HSM/KMS deployment, verified boot, or production certification.
