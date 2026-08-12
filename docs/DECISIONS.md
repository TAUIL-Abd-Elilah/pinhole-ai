# Technical decisions

| Decision | Chosen | Rejected | Evidence / reason |
|---|---|---|---|
| Track | Mobile AI | crowded Cloud LLM tuning | Local camera-roll search directly demonstrates privacy, latency, and offline value on Arm phones. |
| Model | TinyCLIP ViT-8M/Text-3M INT8 | full CLIP ViT-B/32 | 24.28 MB instead of 338+ MB class models; acceptable zero-shot behavior on the public demo roll. |
| Runtime | ONNX Runtime Web, forced WASM | WebGPU default | WASM SIMD gives a CPU path with predictable Arm Neon lowering and broad Android support. |
| Graph shape | separate text and vision | one convenient combined graph | Exact parity, modality-specific lazy loading, and a much smaller query execution plan. |
| Index | exact INT8 scan | HNSW | Exact scan is simpler, deterministic, tiny, and fast enough for normal camera rolls; no recall loss from ANN structure. |
| Quantization | per-vector symmetric INT8 | one global scale | Per-vector scales preserve ranking when vector ranges differ at a cost of four bytes per photo. |
| Persistence | IndexedDB derivatives | original photo copies | Keeps reloads fast while minimizing retained sensitive data. |
| UI metaphor | photographic contact sheet | generic dashboard cards | Results visibly “develop” from muted to color and the product action remains the hero. |
