#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_REL="${1:-cranium-kernel}"
SNAPSHOT="$ROOT/$SNAPSHOT_REL"
MANIFEST="$ROOT/KERNEL_SNAPSHOT_SHA256SUMS"
PIN_FILE="$ROOT/KERNEL_PIN"
fail() { echo "Kernel snapshot verification failed: $*" >&2; exit 1; }
[[ -d "$SNAPSHOT" ]] || fail "snapshot directory missing: $SNAPSHOT_REL"
[[ -f "$MANIFEST" && -f "$PIN_FILE" ]] || fail "pin or checksum manifest missing"
PIN_COMMIT="$(sed -n 's/^KERNEL_COMMIT=//p' "$PIN_FILE" | head -n 1)"
PIN_MANIFEST_SHA="$(sed -n 's/^KERNEL_SNAPSHOT_MANIFEST_SHA256=//p' "$PIN_FILE" | head -n 1)"
[[ "$PIN_COMMIT" == "9508185be264de77ebfe88904e98237e242697f1" ]] || fail "unexpected Kernel commit pin"
ACTUAL_MANIFEST_SHA="$(sha256sum "$MANIFEST" | awk '{print $1}')"
[[ "$ACTUAL_MANIFEST_SHA" == "$PIN_MANIFEST_SHA" ]] || fail "checksum manifest hash does not match KERNEL_PIN"
EXPECTED_COUNT="$(wc -l < "$MANIFEST" | tr -d '[:space:]')"
ACTUAL_COUNT="$(find "$SNAPSHOT" \( -type f -o -type l \) ! -path "$SNAPSHOT/BUNDLE_BRANDING_NOTICE.md" | wc -l | tr -d '[:space:]')"
[[ "$ACTUAL_COUNT" == "$EXPECTED_COUNT" ]] || fail "expected $EXPECTED_COUNT snapshot files, found $ACTUAL_COUNT"
(cd "$SNAPSHOT" && sha256sum --check "$MANIFEST" >/dev/null)
echo "Kernel snapshot verified: $PIN_COMMIT ($ACTUAL_COUNT files)"
