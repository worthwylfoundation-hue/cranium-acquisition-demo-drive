# Convertible Cranium Proofing & Remediation Layer v1

## Purpose

Proofing is a post-decision verification boundary. It verifies that a canonical authority result remains consistent with the invariants that were supposed to govern it.

Proofing does not grant authority, mint capabilities, bypass the Kernel, or replace canonical authorization. A failed proof produces a finding and a remediation proposal that requires canonical re-evaluation.

## Failure loop

`EXECUTION -> PROOF -> FINDING -> ROOT CAUSE -> REMEDIATION -> RE-EVALUATION -> AUTHORITY`

A finding is durable evidence of a control failure, not permission to act.

## Core invariants

- Canonical authority identity must match.
- The receipt must verify against the durable authority store.
- The receipt must contain a canonical request binding.
- The decision must be explicit and canonical.
- Remediation must require re-evaluation through the normal authority path.
- Proofing must never contain an authority-grant operation.

## Design law

**Authority grants permission. Proofing verifies that permission was deserved.**

A proofing failure is not silently repaired by changing the current decision. The system records the finding, identifies the failed control, proposes a preventive constraint, and sends the matter back through canonical evaluation.

## Reality standard

Proofing findings must be based on actual runtime evidence. Synthetic fixtures may be used only in isolated tests and must remain explicitly test-only. Production evidence, receipts, and claims must never be fabricated.
