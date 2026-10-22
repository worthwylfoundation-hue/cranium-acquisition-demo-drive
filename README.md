# Convertible Cranium Acquisition Demo Drive

**Status: Buyer-facing offline demonstration and diligence surface. Non-canonical.**

The canonical authority boundary belongs to **Convertible Cranium Kernel**. This drive is a presentation and evaluation artifact, not an authority source.

> Cognition may come from anywhere.  
> Authority comes only through Cranium.

The **Convertible Cranium Acquisition Demo Drive** is a Linux-first, offline demonstration of the WorthWyl / Convertible Cranium governance ecosystem. It boots into an interactive presentation rather than an ordinary file browser.

## Governance model

The architecture separates two forms of integrity:

- **Convertible Cranium Guardian Substrate:** Constitutional Integrity
- **Convertible Cranium Imperial Substrate:** Evidence Integrity

Synapse may receive proposals and evidence. Interfaces and models may explain, compare, or recommend. Neither a model, a demo, a successful local boot, nor a presentation surface grants authority. Execution authority remains behind the Convertible Cranium Kernel boundary.

A demo or successful local boot is **not** proof of production HSM, verified boot, independent security audit, or deployment readiness.

## What a buyer sees on boot

A visual executive overview, guided tour, ecosystem architecture map, product cards, governance controls, COMA containment, and a safe deployment rehearsal. The interface is read-only by default. It contains no live credentials and performs no external actions.

## Ecosystem included

The assembled local presentation covers Convertible Cranium AI, Kernel, Synapse, supporting components, Miracle Memory, WorthWyl Forge, acquisition materials, the Constitution, architecture documentation, deployment guidance, and health checks.

Each surface can be presented independently. Composition in this demonstration does not make any non-Kernel package an authority path.

## Run the interactive demo without booting

```bash
python3 -m http.server 8765 --directory demo
# open http://127.0.0.1:8765/
```

The demo is static and designed to work offline.

## Build the bootable ISO

Requires a Linux host with `live-build`, `xorriso`, `debootstrap`, `squashfs-tools`, and GRUB live-image packages:

```bash
sudo ./BUILD_ACQUISITION_ISO.sh
```

Output: `dist/cranium-acquisition-demo.iso`

## Security and scope

This is a demonstration and diligence surface, not a production autonomous agent. It intentionally separates explanation from authority. Passcodes, encryption, Android Factory Reset Protection, Apple Activation Lock, MDM controls, and equivalent security boundaries are not bypassed. Real deployment requires a separately approved implementation plan, credentials supplied at deployment time, and human review.

## Release verification

The canonical Kernel source snapshot is pinned to the verified diligence stamp recorded in `KERNEL_PIN` and `KERNEL_SNAPSHOT_PROVENANCE.md`; verify it with `bash scripts/verify-kernel-snapshot.sh ecosystem/canonical-kernel-source`. The customized demo/UI payload and other embedded component snapshots still require separate freshness and runtime validation; this does not certify the entire drive as current or boot-verified.

## Ownership

© 2026 Wyl Mathes · WorthWyl Media. All rights reserved.

See also: [ECOSYSTEM.md](./ECOSYSTEM.md) · [LICENSE](./LICENSE)
