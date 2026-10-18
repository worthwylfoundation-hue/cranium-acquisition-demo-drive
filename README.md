# Convertible Cranium Acquisition Demo Drive

**Status: Buyer-facing offline demonstration & diligence surface — Non-canonical**

The sole canonical authority source is [**Liberty Kernel**](https://github.com/worthwyl2022-cloud/cranium-kernel) (`cranium-kernel`).  
Product story: **Justice OS** · interface: **Commander AI** (propose only).

This drive is a Linux-first, offline, buyer-facing demonstration of the WorthWyl / Convertible Cranium governance substrate. It boots into an interactive presentation rather than an ordinary file browser.

## Core invariant

> Cognition may come from anywhere.  
> Authority comes only through Liberty Kernel.

A demo, tour, or successful local boot is **not** an authority grant and **not** proof of production HSM, verified boot, or third-party audit.

## What a buyer sees on boot

Visual executive overview, guided tour, architecture map, product cards, governance controls, COMA containment, and a safe deployment rehearsal. Read-only by default. No live credentials. No external actions.

## Ecosystem included

Assembled local source and documentation surfaces for Convertible Cranium AI, Kernel, Synapse, supporting planes, Miracle Memory, WorthWyl Forge, acquisition package, Constitution, architecture docs, deployment guidance, and health checks.

Each surface is independently presentable. Composition under Justice OS does not make any non-Kernel package the grant path.

**Account map:** [worthwyl2022-cloud/ACCOUNT_INVENTORY.md](https://github.com/worthwyl2022-cloud/worthwyl2022-cloud/blob/main/ACCOUNT_INVENTORY.md)  
**Kernel pin (project-verified):** `710ab844571c704078852b38d9451ffe68900acf`

## Run the interactive demo without booting

```bash
python3 -m http.server 8765 --directory demo
# open http://127.0.0.1:8765/
```

Fully static; works offline.

## Build the bootable ISO

Requires a Linux host with `live-build`, `xorriso`, `debootstrap`, `squashfs-tools`, and GRUB live-image packages:

```bash
sudo ./BUILD_ACQUISITION_ISO.sh
```

Output: `dist/cranium-acquisition-demo.iso`

## Security and scope

Demonstration and diligence surface, not a production autonomous agent. Explanation is separated from authority. Passcodes, encryption, FRP, Activation Lock, MDM, and equivalent boundaries are not bypassed. Real deployment needs a separate approved plan, credentials at deploy time, and human review.

## Ownership

© 2026 Wyl Mathes · WorthWyl Media. All rights reserved.
