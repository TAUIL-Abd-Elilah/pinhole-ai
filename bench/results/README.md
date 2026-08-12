# Arm benchmark results

`lighthouse-20260812.json` is the raw Lighthouse 12.8.2 mobile report behind the
deployed 97 / 100 / 100 / 100 UX snapshot. Unlike the Arm runtime bundles below,
it is browser lab evidence rather than an Arm performance benchmark.

Each directory is named for the GitHub Actions run that produced it. JSON files
are committed without post-processing and contain the complete environment,
method, samples, dispersion, hashes, parity, and ranking-quality fields.

- [`cobalt-31625513958`](cobalt-31625513958/) — final evidence bundle, including
  the native Arm64 Chromium comparison and an isolated scalar-INT8 vs WASM SIMD
  control; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31625513958).
- [`cobalt-31582721108`](cobalt-31582721108/) — previous evidence bundle, including
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
speedups and 3.54–3.58x exact-scan speedups. Run `31582721108` added a 9.73x
exact-parity comparison inside the product's Chromium/WASM runtime. The final run
repeated that result at 9.76x and isolated the index kernel: 15.44x scan-only and
2.83x full-ranking speedups over the identical signed-INT8 scalar control.
