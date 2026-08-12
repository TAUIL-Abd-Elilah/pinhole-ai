# Arm benchmark results

Each directory is named for the GitHub Actions run that produced it. JSON files
are committed without post-processing and contain the complete environment,
method, samples, dispersion, hashes, parity, and ranking-quality fields.

- [`cobalt-31557654775`](cobalt-31557654775/) — current published run, including
  model, index, and real-photo retrieval evidence; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557654775).
- [`cobalt-31557261642`](cobalt-31557261642/) — first independent model/index
  run, retained to show repeatability; [view the workflow
  run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557261642).

Both executions used four Arm Neoverse-N2 cores on Microsoft Cobalt 100. Across
the two runs, the one-thread text-query speedup was 11.30–11.35x and the
10,000-vector scan speedup was 3.54–3.58x.
