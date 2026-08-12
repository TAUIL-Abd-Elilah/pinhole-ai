# Pinhole — Devpost submission copy

## Submission metadata

- **Project:** Pinhole
- **Tagline:** Describe the moment. Find the photo. Nothing leaves your phone.
- **Track:** Mobile AI
- **Live application:** https://tauil-abd-elilah.github.io/pinhole-ai/
- **Public source:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai
- **License:** MIT
- **Arm evidence:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557654775
- **Native Arm browser proof:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31579510127
- **Native Arm demo footage:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31579510127

## Project overview

We take thousands of photos and then lose the moments inside them. Cloud photo
search can help, but it asks users to put a deeply personal camera roll on
someone else's infrastructure. Pinhole is an installable semantic photo-search
PWA built for Arm-powered Android devices. A user can type “golden dog in the
snow” instead of remembering a filename or date, and Pinhole finds the photo
entirely inside the browser.

The product experience is simple, but the implementation changes the model
graph, storage representation, and retrieval path for on-device constraints. It
turns an upstream combined TinyCLIP graph into independent, exact-parity text and
vision encoders; lazy-loads the vision side only when a photo needs indexing;
compresses every saved embedding from 2,048 to 516 bytes; and scans those compact
vectors with a custom 434-byte signed-INT8 WebAssembly SIMD kernel. The result is
a useful privacy experience with optimization that a judge can inspect,
reproduce, and measure.

Pinhole should win because the optimization is inseparable from the human value:
less computation, memory, and network dependence are exactly what let personal
photos remain personal. It is a finished, one-click demo, not a benchmark wrapped
around a hypothetical product.

Pinhole was created on August 12, 2026, inside the June 10–August 14 hackathon
period. Its complete public commit history records the implementation,
benchmark, native-browser, offline, media, and documentation milestones.

## Functionality and output

1. The user opens Pinhole on an Arm Android phone and selects photos through the
   normal browser file picker, or loads the attributed public demo roll.
2. A Web Worker runs the TinyCLIP vision encoder locally. The original photo is
   transient: Pinhole persists only a resized WebP thumbnail and a compact
   512-dimensional INT8 embedding in IndexedDB.
3. The user describes a memory in natural language. The independent text encoder
   embeds that query without executing or loading the vision graph.
4. A WebAssembly SIMD kernel ranks the local index. No query, photo, thumbnail,
   or embedding is sent to an inference API.
5. Results appear as a photographic contact sheet that visibly “develops” into
   color, with live model and search timing shown in the interface.

The final output includes the installable PWA, pinned exact-parity ONNX models,
the auditable WAT SIMD kernel, a reproducible graph-extraction tool, unit and
full-browser tests, privacy documentation, and raw benchmark JSON from a real
Arm64 runner.

## Measured optimization on Arm

Run
[`31557654775`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31557654775)
used four Arm Neoverse-N2 cores on a Microsoft Cobalt 100 GitHub runner. Model
tests used ONNX Runtime's CPU execution provider with 7 discarded warm-ups and
50 measured forwards. Index tests used 25 fixed seeded queries over 10,000
512-dimensional vectors. Values below are medians, never best-of-run timings.

| Optimization | Baseline | Pinhole | Outcome |
|---|---:|---:|---:|
| Text query, 1 thread | combined graph 45.697 ms | split text graph 4.043 ms | **11.30x faster** |
| Text query, 4 threads | combined graph 15.513 ms | split text graph 1.734 ms | **8.94x faster** |
| Exact 10k-vector scan | Float32 JavaScript 12.352 ms | INT8 WASM SIMD 3.446 ms | **3.58x faster** |
| 10k-vector index | 20,480,000 bytes | 5,160,000 bytes | **74.8% smaller** |
| Model payload | FP32 94,071,688 bytes | upstream INT8 24,281,512 bytes | **74.2% smaller** |

Correctness accompanies every speed claim. Extracted text and vision outputs are
bit-for-bit equal to the combined graph (maximum absolute error `0.0`). The
compact seeded index reaches `0.996` mean Recall@10 and `1.0` Top-1 agreement.
On the 12-photo demonstration path, both Float32 and compact INT8 retrieval find
the intended result first for all 12 fixed queries, with `1.0` mean Recall@3
between their rankings. That small, fully disclosed set is a product regression
test—not a claim of general model accuracy.

A second independent Arm run is retained in the repository. Across both runs,
the one-thread text-query speedup is 11.30–11.35x and the exact-scan speedup is
3.54–3.58x.

The workflow also installs native Arm64 Chromium and executes the complete PWA,
not only the native benchmark harnesses. Run `31579510127` built the production
app on Cobalt, indexed all 12 real photographs in a 390×844 mobile viewport,
searched “golden dog in the snow,” returned the dog first, and captured the frame
used in the project cover. It explicitly asserted the `wasm simd` search path;
live smoke telemetry reported two WASM threads, a 16.0 ms text encode, and a
245 µs vector scan with zero console or request errors. Those single UI timings
are reported as smoke telemetry, not as benchmark medians.

## What is original and reusable

The upstream TinyCLIP model and its INT8 conversion are credited; Pinhole does
not relabel that conversion as original work. Pinhole contributes:

- exact ONNX graph surgery with source pinning, SHA-256 verification, and an
  automatic parity gate;
- modality-specific loading so a saved camera roll can be searched without the
  8.96 MB vision model;
- a per-vector symmetric INT8 format with measured retrieval quality;
- a single-call signed-INT8 WASM SIMD batch scan, including scalar fallback and
  non-multiple-of-16 tail tests;
- reusable model, index, and real-photo benchmark harnesses whose JSON records
  hardware, runtime, methodology, hashes, dispersion, and quality;
- an explicit browser privacy boundary and threat model.

The extraction pattern and compact exact-scan kernel can be reused by other
on-device multimodal retrieval apps, not only photo search. A dedicated
[porting guide](PORTING.md) identifies the reuse seams and gives other developers
an adoption and measurement checklist.

## Setup and validation

### Fastest judge path on an Arm Android device

1. Open https://tauil-abd-elilah.github.io/pinhole-ai/ in Chrome.
2. Wait for **Local AI ready**. Choose **Load demo roll**.
3. Search for `golden dog in the snow`, `coffee on an open book`, or your own
   description. Try **Choose photos** to index local files.
4. Optionally use Chrome's **Add to Home screen** action. After the static model
   and app assets have been cached, inference remains local and the app shell is
   offline-capable.

The hosted Pages environment uses one WASM thread because it cannot set
cross-origin-isolation headers; SIMD remains active. A self-hosted deployment
with the included COOP/COEP headers uses up to four threads.

### Build from source

```bash
git clone https://github.com/TAUIL-Abd-Elilah/pinhole-ai.git
cd pinhole-ai
npm ci
npm run dev
```

### Validate the implementation

```bash
npm run verify

# Requires a running dev server and Chrome
node tools/browser-smoke.mjs
node tools/browser-flow.mjs
node tools/browser-offline.mjs
```

To reproduce the exact model split and native Arm benchmark, follow
[`bench/README.md`](../bench/README.md). The public workflow runs the complete
quality suite on x64 and all three benchmark/quality harnesses on
`ubuntu-24.04-arm`.

The offline harness warms the hosted application, indexes and searches the demo
roll, forces the browser network offline, verifies that an uncached probe is
blocked, reloads under service-worker control, and successfully performs a
second local search with no console or request errors.

## Challenges and learning

The first trap was assuming that requesting only `text_embeds` from a combined
CLIP session would skip the image branch. A raw-ORT control showed that the full
combined graph was still scheduled. Extracting the dependency subgraph made the
hot query path genuinely smaller while preserving exact outputs.

The second challenge was signed byte arithmetic. WebAssembly's widening
operations make it easy to accidentally treat negative INT8 values as unsigned.
The kernel explicitly sign-extends both halves, accumulates i32 lanes, and keeps a
scalar tail. Tests compare it with straightforward signed arithmetic, including a
513-dimensional vector.

Finally, browser threading and privacy need precise language. SIMD works on the
hosted PWA, but multi-threaded WASM requires cross-origin isolation. Pinhole
reports the active thread count rather than hiding that difference. The app and
model are downloaded static assets; “nothing leaves your phone” refers to user
photos, queries, and inference data, which never cross the network boundary.

## Built with

TypeScript, React, Vite PWA, ONNX Runtime Web, Transformers.js, ONNX, IndexedDB,
Web Workers, WebAssembly SIMD/WAT, Python, Vitest, Playwright, and GitHub Actions
on Arm64.
