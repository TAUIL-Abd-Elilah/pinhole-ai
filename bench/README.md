# Benchmark evidence

Pinhole records two independent optimization layers:

1. `tools/benchmark_model.py` compares the pinned upstream combined TinyCLIP
   graph with Pinhole's exact-parity text and vision subgraphs. It includes the
   stock combined forward and the stronger raw-ORT requested-output control so
   the reported comparison is not cherry-picked.
2. `tools/benchmark-index.mjs` compares a Float32 JavaScript cosine scan with
   the app's per-vector INT8 WebAssembly SIMD scan over 10,000 512-dimensional
   vectors. It reports latency, index memory, Recall@10, and top-1 agreement.
3. `tools/benchmark-retrieval.mjs` runs both split encoders over the 12 attributed
   demo photographs and 12 fixed natural-language queries. It reports end-task
   top-1 accuracy plus compact-vs-Float32 ranking agreement. This is a transparent
   demo-set regression check, not a claim of general model accuracy.

Committed results live in `bench/results/`. Every result embeds the runtime,
architecture, sample count, dispersion, and GitHub Actions run identity. The
Arm64 workflow uploads the raw JSON as well, so numbers can be traced back to a
specific Microsoft Cobalt 100 runner execution.

## Published Arm run

Run [`31557261642`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557261642)
used four Neoverse-N2 cores (`ubuntu-24.04-arm`, Microsoft Cobalt 100). Raw,
machine-readable results are committed in
[`results/cobalt-31557261642`](results/cobalt-31557261642/).

| Measurement | Baseline median | Pinhole median | Change |
|---|---:|---:|---:|
| Text query, 1 ORT thread | 45.681 ms | 4.027 ms | 11.35x faster |
| Text query, 4 ORT threads | 15.462 ms | 1.757 ms | 8.80x faster |
| 10,000-vector scan | 12.439 ms | 3.512 ms | 3.54x faster |
| 10,000-vector storage | 20,480,000 B | 5,160,000 B | 74.8% smaller |

Text and vision graph outputs were exactly equal to the combined model (maximum
absolute error `0.0`). The compact index achieved `0.996` mean Recall@10 and
`1.0` Top-1 agreement over the fixed seeded benchmark.
