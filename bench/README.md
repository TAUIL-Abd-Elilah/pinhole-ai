# Benchmark evidence

Pinhole records two independent optimization layers:

1. `tools/benchmark_model.py` compares the pinned upstream combined TinyCLIP
   graph with Pinhole's exact-parity text and vision subgraphs. It includes the
   stock combined forward and the stronger raw-ORT requested-output control so
   the reported comparison is not cherry-picked.
2. `tools/benchmark-index.mjs` compares a Float32 JavaScript cosine scan with
   the app's per-vector INT8 WebAssembly SIMD scan over 10,000 512-dimensional
   vectors. It reports latency, index memory, Recall@10, and top-1 agreement.

Committed results live in `bench/results/`. Every result embeds the runtime,
architecture, sample count, dispersion, and GitHub Actions run identity. The
Arm64 workflow uploads the raw JSON as well, so numbers can be traced back to a
specific Microsoft Cobalt 100 runner execution.
