# Pinhole on-device retrieval optimization kit

Pinhole is one implementation of a broader optimization pattern: separate work
performed once from work performed for every query, persist the smallest useful
representation, and cross the JavaScript-to-WebAssembly boundary once per scan.
This guide maps the reusable parts and the correctness checks needed to adapt
them to another multimodal search product.

The kit is deliberately source-first: an exact-parity ONNX graph extractor, a
compact signed-INT8 vector format, a 434-byte batched WASM SIMD kernel, native
and browser Arm benchmark harnesses, real-input retrieval gates, and this porting
recipe. Each component can be adopted independently under the MIT license.

## When the pattern fits

Use this approach when an application has a paired encoder such as text/image or
text/audio, the corpus changes less often than queries arrive, and an exact scan
over tens of thousands of items is acceptable. Keep an approximate index when a
corpus is much larger or when measured exact-scan latency misses the product's
budget.

## Reuse map

| Artifact | What it demonstrates | Adaptation seam |
|---|---|---|
| [`tools/prepare_model.py`](../tools/prepare_model.py) | Pinned download, ONNX dependency extraction, hashes, and an exact-parity gate | Replace the source revision, checksum, graph input names, and target output names |
| [`src/lib/embedding.ts`](../src/lib/embedding.ts) | Per-vector symmetric INT8 quantization | Change the vector dimension only if the encoder changes it |
| [`wasm/dot_i8.wat`](../wasm/dot_i8.wat) | Signed-INT8 SIMD dot products with a scalar tail | Rebuild after changing dimensions only when the calling contract changes |
| [`src/lib/wasm-search-index.ts`](../src/lib/wasm-search-index.ts) | Contiguous index packing, one-call batch scan, and scalar fallback | Replace IDs and persistence without changing the kernel ABI |
| [`tools/benchmark-index.mjs`](../tools/benchmark-index.mjs) | Seeded latency, memory, Recall@K, and Top-1 agreement | Set corpus size and quality thresholds from the target product |
| [`tools/benchmark_model.py`](../tools/benchmark_model.py) | Warmed native-Arm model comparison with strong controls | Supply representative shapes and compare against the best unsplit-runtime path |
| [`tools/benchmark-browser-model.mjs`](../tools/benchmark-browser-model.mjs) | The same strongest control in the product's browser backend | Serve the baseline only to the benchmark page and record both browser and host architecture |
| [`tools/benchmark-retrieval.mjs`](../tools/benchmark-retrieval.mjs) | End-task regression over real, disclosed inputs | Replace demo assets and expected queries with a versioned product set |

All project-owned code is MIT licensed. Upstream models and runtimes keep their
own licenses; preserve their notices when reusing the pattern.

## Porting recipe

### 1. Draw the execution-frequency boundary

List each model branch by when it runs. In Pinhole, image encoding is a cold path
that runs during import, while text encoding is the hot path that runs for every
search. Optimize the hot path independently instead of benchmarking a convenient
combined forward.

### 2. Extract dependency-complete subgraphs

Pin the upstream revision and SHA-256 before editing the graph. Use
`onnx.utils.extract_model` with the original graph inputs and the one embedding
output needed by each branch. Run `onnx.checker.check_model` on every result.
Do not call the extraction successful until the split and source outputs compare
equal on seeded inputs. If the transformation changes precision, define and
record an error tolerance instead of claiming exact parity.

### 3. Quantize persisted vectors and measure ranking loss

For a normalized vector `v`, Pinhole stores:

```text
scale = max(abs(v)) / 127
q[i]  = clamp(round(v[i] / scale), -127, 127)
```

Keep one Float32 scale per vector. Compare rankings from the compact index with a
Float32 reference using Recall@K and Top-1 agreement on seeded synthetic queries
and on a disclosed real-input regression set. A byte reduction without a quality
measurement is incomplete evidence.

### 4. Batch the exact scan

Pack all signed bytes contiguously, then invoke the WASM scan once for the whole
corpus. Calling WASM once per item can erase the SIMD win at the language
boundary. Retain a scalar implementation both as a compatibility fallback and as
an executable oracle for tests. Include negative values and dimensions that are
not multiples of 16 so signed widening and tail bugs cannot hide.

### 5. Avoid work before making it faster

Load only the query encoder at startup. Load the corpus encoder on the first
import. Fingerprint items and skip unchanged inputs. Persist derived thumbnails
and compact vectors only when the product does not need original bytes. Document
that privacy boundary precisely.

### 6. Measure on Arm and publish the raw result

Record architecture, CPU, runtime versions, artifact hashes, thread counts,
warm-ups, samples, median, p95, dispersion, and quality in machine-readable
output. Compare against the strongest credible baseline, not only a high-level
API with avoidable work. Run the actual application in a native Arm64 browser in
addition to native benchmark harnesses.

## Adoption checklist

- [ ] Upstream revision, license, and checksum are pinned.
- [ ] Hot and cold branches are extracted from dependency-complete graph slices.
- [ ] Split outputs pass an exact or explicitly bounded parity gate.
- [ ] Compact ranking quality is compared with a Float32 reference.
- [ ] SIMD and scalar results agree for negative values and tail dimensions.
- [ ] Model, index, and end-task measurements use fixed inputs and disclosed seeds.
- [ ] Arm results identify the real machine and retain raw samples or dispersion.
- [ ] Product copy distinguishes static asset downloads from private user data.
- [ ] Offline, fallback, and non-isolated browser paths are tested.

Pinhole's committed Arm results in [`bench/results`](../bench/results/) are an
example of the evidence bundle produced by this process.
