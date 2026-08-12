# Optimization record

## Baseline

The upstream ONNX model exposes one combined CLIP graph with three inputs:
`input_ids`, `attention_mask`, and `pixel_values`. Its outputs are both normalized
embeddings and both directions of the similarity matrix. The high-level
Transformers.js `CLIPModel` forward supplies both modalities and returns every
output, even when a user only typed a query.

This is convenient for zero-shot classification but wasteful for retrieval:
photos are embedded once, while the three-layer text transformer runs on every
search. The ten-layer vision transformer should not be on that hot path.

## Change 1: exact graph surgery

`tools/prepare_model.py` extracts only the nodes required to compute
`text_embeds` and `image_embeds`. The resulting models share no execution graph:

| Artifact | Bytes | Role |
|---|---:|---|
| upstream combined INT8 | 24,281,512 | reproducible baseline |
| Pinhole text INT8 | 15,367,058 | every search query |
| Pinhole vision INT8 | 8,957,217 | imports only, lazy loaded |

The sizes sum to slightly more than the source because each self-contained ONNX
file carries graph metadata. Source and output SHA-256 values are in the generated
manifest. A seeded two-item tensor test asserts NumPy `array_equal` for both
outputs; maximum absolute error is 0.0.

The benchmark includes two baselines:

1. `stock_combined_forward`: all outputs, matching the high-level CLIP forward.
2. `combined_requested_text_only`: the best raw-ORT control, asking the unsplit
   session for only `text_embeds`.

This second control prevents an exaggerated comparison. Results report both.

The same strongest control is also measured inside native Arm64 Chromium using
the exact ONNX Runtime Web/WASM SIMD backend and split artifact shipped by the
PWA. The three paths are interleaved with rotating order on every measured
repetition, and Chromium's high-entropy architecture hint is retained beside the
Arm64 host identity in the raw JSON.

## Change 2: weight quantization

Pinhole uses the upstream ONNX Community INT8 artifact rather than claiming the
weight conversion as original work. Against its 94,071,688-byte FP32 counterpart,
the combined INT8 artifact is 74.2% smaller. The original conversion and TinyCLIP
architecture are attributed; Pinhole's original work begins with graph separation,
lazy modality loading, local persistence, and compact retrieval.

## Change 3: compact embeddings

CLIP outputs normalized Float32 vectors. For each photo Pinhole uses symmetric
per-vector quantization:

```text
scale = max(abs(vector)) / 127
q[i]  = clamp(round(vector[i] / scale), -127, 127)
cosine ≈ dot(q_query, q_photo) × scale_query × scale_photo
```

One photo falls from 2,048 bytes to 516 bytes (512 signed bytes plus a Float32
scale), a 74.8% reduction. The benchmark measures ranking loss rather than merely
assuming it is harmless: Recall@10 and top-1 agreement are calculated across
seeded noisy queries.

## Change 4: Arm-friendly exact scan

`wasm/dot_i8.wat` processes 16 signed bytes per iteration. It widens low and high
halves, multiplies to signed i16 lanes, pairwise-widens to i32, and accumulates
without overflow for a 512-dimensional vector. A scalar tail preserves correctness
for arbitrary dimensions.

WebAssembly SIMD is portable; on Arm64 browsers its fixed-width operations lower
to Neon instructions in the engine. The 434-byte module searches a contiguous
index in one call, avoiding a JavaScript↔WASM boundary for each photo. Tests compare
the output against scalar signed arithmetic, including a 513-dimensional tail.

## Change 5: work avoidance

The browser hashes stable file metadata (`name`, byte length, modification time,
MIME type). Existing IDs are skipped. The full photo is decoded once inside a
worker, then only its compact embedding and resized WebP thumbnail are persisted.
Search never decodes the original again.

## Measurement policy

- Warm-up is discarded.
- Median and p95 are both reported; a lone best run is never used.
- MAD, min, max, and sample count remain in raw JSON.
- Model and index quality guards accompany speed/size claims.
- Every Arm result embeds Actions run ID, architecture, runtime versions, and CPU
  details.
- x64 development measurements are labeled controls and are not represented as
  Arm results.
- No energy claim is inferred from latency.
