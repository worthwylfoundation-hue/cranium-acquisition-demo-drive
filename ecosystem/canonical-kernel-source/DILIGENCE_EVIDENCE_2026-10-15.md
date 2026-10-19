# Current-tip clean-clone verification evidence

- **Repository:** `https://github.com/worthwyl2022-cloud/cranium-kernel`
- **Branch:** `main`
- **Exact source SHA tested:** `52f312dc5b4f080332d47836ef55b6b73d1ef99b`
- **Environment:** GitHub-hosted `ubuntu-latest`, Ubuntu 24.04.5 LTS, Linux x86_64, Node `v24.21.0`, npm `11.19.0`
- **Workflow run:** https://github.com/worthwyl2022-cloud/cranium-kernel/actions/runs/38735598149
- **Workflow result:** overall run passed; both TypeScript CI and the independent clean-clone job passed.
- **Command exit codes and wall time:** `git clone` 0 / 1s; `git checkout main` 0 / <1s; `git rev-parse HEAD` 0 / <1s; `npm ci` 0 / 6s; `npm run verify` 0 / 20s; `npm run verify:denial-semantics` 0 / <1s. Total measured command wall time 26s; sequence ran from 12:33:57Z to 12:34:24Z.
- **Cleanliness:** fresh clone worktree status count 0 after verification.
- **Log digest:** SHA-256 `c5b00ba65bb47dda663b72e8742dae355a26e8742692b63a6616c3b7b2c5450a` for the exported combined GitHub Actions job log.
- **Full stdout/stderr:** emitted into the GitHub Actions job log in named groups, with separate `*.stdout.log` and `*.stderr.log` content. Artifact upload was blocked by GitHub Actions storage quota; the full job log is available through the workflow URL above.

## Scope and residuals

This is reproducible project verification on a clean GitHub-hosted runner, not an independent security audit or third-party certification. The run printed a high-severity dependency advisory. Existing audit evidence identifies `source-map-js` GHSA-68fv-2mgg-jv7q, affected range `<1.2.2`, with a fix available. The constitution check prints `engine_proofs=7` despite checking eight markers. The acquisition stress-suite command prints its manifest but does not execute all 14 proposed cases. These findings remain open and should be triaged before claiming zero security alerts or complete stress execution.
