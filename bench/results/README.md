# Arm benchmark results

Each directory is named for the GitHub Actions run that produced it. JSON files
are committed without post-processing and contain the complete environment,
method, samples, dispersion, hashes, parity, and ranking-quality fields.

- [`cobalt-31582721108`](cobalt-31582721108/) — final evidence bundle, including
  the same-runtime native Arm64 Chromium comparison plus model, index, and
  real-photo retrieval evidence; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31582721108).
- [`cobalt-31557654775`](cobalt-31557654775/) — published native CPU/index
  reference and real-photo retrieval evidence; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557654775).
- [`cobalt-31557261642`](cobalt-31557261642/) — first independent model/index
  run, retained to show repeatability; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557261642).

All executions used four Arm Neoverse-N2 cores on Microsoft Cobalt 100. The two
original repeatability runs produced 11.30–11.35x native one-thread text-query
speedups and 3.54–3.58x exact-scan speedups. The final run independently measured
10.70x and 3.49x, and added a 9.73x exact-parity comparison inside the product's
actual Chromium/WASM runtime.
