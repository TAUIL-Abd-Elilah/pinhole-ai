# Benchmark evidence

Pinhole records two independent optimization layers through four harnesses:

1. `tools/benchmark_model.py` compares the pinned upstream combined TinyCLIP
   graph with Pinhole's exact-parity text and vision subgraphs. It includes the
   stock combined forward and the stronger raw-ORT requested-output control so
   the reported comparison is not cherry-picked.
2. `tools/benchmark-browser-model.mjs` repeats the strongest combined-vs-split
   control inside native Arm64 Chromium using the same ONNX Runtime Web/WASM
   backend and runtime artifacts as the product. The 24 MB baseline is served
   only by Vite's development file route and is never included in the deployed
   PWA.
3. `tools/benchmark-index.mjs` compares a Float32 JavaScript cosine scan with
   the app's per-vector INT8 WebAssembly SIMD scan over 10,000 512-dimensional
   vectors. It reports latency, index memory, Recall@10, and top-1 agreement.
4. `tools/benchmark-retrieval.mjs` runs both split encoders over the 12 attributed
   demo photographs and 12 fixed natural-language queries. It reports end-task
   top-1 accuracy plus compact-vs-Float32 ranking agreement. This is a transparent
   demo-set regression check, not a claim of general model accuracy.

Committed results live in `bench/results/`. Every result embeds the runtime,
architecture, sample count, dispersion, and GitHub Actions run identity. The
Arm64 workflow uploads the raw JSON as well, so numbers can be traced back to a
specific Microsoft Cobalt 100 runner execution.

## Published Arm run

Run [`31557654775`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557654775)
used four Neoverse-N2 cores (`ubuntu-24.04-arm`, Microsoft Cobalt 100). Raw,
machine-readable results are committed in
[`results/cobalt-31557654775`](results/cobalt-31557654775/).

| Measurement | Baseline median | Pinhole median | Change |
|---|---:|---:|---:|
| Text query, 1 ORT thread | 45.697 ms | 4.043 ms | 11.30x faster |
| Text query, 4 ORT threads | 15.513 ms | 1.734 ms | 8.94x faster |
| 10,000-vector scan | 12.352 ms | 3.446 ms | 3.58x faster |
| 10,000-vector storage | 20,480,000 B | 5,160,000 B | 74.8% smaller |

Text and vision graph outputs were exactly equal to the combined model (maximum
absolute error `0.0`). The compact index achieved `0.996` mean Recall@10 and
`1.0` Top-1 agreement over the fixed seeded benchmark.

The real-photo regression in the same Arm run found the intended result first
for all 12 fixed demo queries in both Float32 and compact INT8 rankings, with
`1.0` compact-vs-Float32 mean Recall@3. The small attributed set is fully
disclosed in `retrieval.json`; this is a product-path check, not a general model
accuracy benchmark.
