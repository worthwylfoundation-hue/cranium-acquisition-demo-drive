# Cranium Release Readiness Matrix

**Contract version:** `cranium-authority-protocol` v1.0.0  
**Owner:** Cranium Kernel maintainers  
**Last reviewed:** 2026-09-14

## Release policy

A platform is **build-verified** only when its declared CI workflow completes on a clean checkout with the platform toolchain, tests, and production artifact build. A platform is **conformance-verified** only when it executes the canonical vectors in [`CRANIUM_CONFORMANCE_V1.json`](./CRANIUM_CONFORMANCE_V1.json) against its own authority implementation. Architecture portability alone is not release evidence.

The Kernel remains the sole authority issuer. Client applications and adapters may propose work, but they must not independently grant authority or create an eligible external side effect.

## Matrix

| Surface | Repository | Validation | Current gate | Release status |
|---|---|---|---|---|
| TypeScript Kernel/runtime | `cranium-kernel` | `npm ci`, typecheck, Vite build, durable/recovery checks, Synapse checks, canonical vectors | `.github/workflows/ci-typescript.yml` | **Build- and conformance-verified** |
| Kernel Android app | `cranium-kernel` | Android SDK, unit tests, debug APK | `.github/workflows/android-ci.yml` | **Build-verified in Android CI; not locally verifiable without SDK** |
| Convertible Cranium Core Android app | `Cranium-Core-` | Android SDK, unit tests, debug APK | `.github/workflows/android-ci.yml` | **Build-verified in Android CI; not locally verifiable without SDK** |
| Hardened Core web | `cranium-hardened-core` | Typecheck, Vite build, production dependency audit | `.github/workflows/ci.yml` | **Build-verified** |
| Diligence Workbench web | `cranium-diligence-workbench` | Typecheck, Vite build | `.github/workflows/ci.yml` | **Build-verified** |
| Operator OS web/server | `cranium-operator-os` | Typecheck, Vite build, Node bundle | `.github/workflows/ci.yml` | **Build-verified** |
| Provider integrations | `cranium-provider-integrations` | Node tests, dependency audit | `.github/workflows/ci.yml` | **Test-verified** |
| WorthWyl Forge web/server | `worthwyl-forge` | Typecheck, Vite build, Node bundle, tests | `.github/workflows/ci.yml` | **Build-verified** |
| WorthWyl Game Changer web/server | `worthwyl-game-changer` | Quality gate, typecheck/build as declared | `.github/workflows/quality-gate.yml` | **Build-verified** |
| Acquisition template | `cranium-acquisition-template` | Unit tests, lint, nested core build, audit | `.github/workflows/ci.yml` | **Build-verified** |
| Native iOS | None | Xcode project, signing, simulator/device tests, archive | None | **Not established** |

## Required release gates

1. **Linux/Node gate:** the Kernel runtime and every web/server repository must pass its repository workflow on the protected branch.
2. **Android gate:** both Android repositories must pass their Android workflow with the declared JDK, Android Gradle Plugin, compile SDK, and build tools. A local machine without an Android SDK may report `NOT_RUN`, never `PASS`.
3. **Conformance gate:** the TypeScript Kernel must execute every vector and report a zero-failure summary. Android implementations remain pending until they expose the protocol fields needed to run the same vectors.
4. **Boundary gate:** production-boundary scanning must reject mock/fake/stub authority paths and unsupported verification claims in production source.
5. **Constitutional code gate:** the Prime Directives, constitutional contract, canonical engine proof points, and evidence-language alignment must pass `npm run verify:constitution`.
6. **iOS gate:** no iOS release claim may be made until a native target, CI runner, signing strategy, and test/archive workflow are committed.

## How to run the available gates

From the Kernel repository:

```bash
npm ci
npm run verify
npm run verify:conformance
npm run verify:production-boundary
```

From a workspace containing sibling repositories:

```bash
node scripts/ecosystem-release-check.mjs
```

The workspace checker is an inventory and consistency check. It does not substitute for GitHub-hosted Android or repository CI runs.

## Status vocabulary

- **PASS:** executed successfully under the declared toolchain.
- **NOT_RUN:** the required toolchain or target is unavailable; this is not a pass.
- **PENDING:** implementation or workflow evidence is incomplete.
- **FAIL:** a declared gate ran and failed.
