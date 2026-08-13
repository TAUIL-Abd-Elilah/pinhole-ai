# Pinhole

**Describe the moment. Find the photo. Nothing leaves your phone.**

[Try the live PWA](https://tauil-abd-elilah.github.io/pinhole-ai/) ·
[Watch the 63-second demo](https://www.youtube.com/watch?v=O7vfNBXskPg) ·
[Inspect the source](https://github.com/TAUIL-Abd-Elilah/pinhole-ai) ·
[Open the native Arm64 evidence](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31625513958)

## Inspiration

A camera roll can contain years of memories, yet finding one photo often means
remembering a date, filename, or album. Cloud AI can make those photos searchable,
but uploading private images and queries is the wrong tradeoff for many people.

Pinhole asks a different question: what if measurable Arm optimization made the
private path the practical path? Type “golden dog in the snow” or “coffee on an
open book,” and Pinhole finds the moment locally—without an account, API key, or
inference backend.

## What it does

Pinhole is an installable semantic camera-roll search PWA for Arm-powered phones,
tablets, and laptops.

1. Choose personal photos through the normal browser picker, or load the
   attributed 12-photo demo roll.
2. A Web Worker runs the TinyCLIP vision encoder locally. The original image is
   transient; IndexedDB keeps only a resized WebP thumbnail and a compact
   512-dimensional INT8 embedding.
3. Describe a remembered moment in natural language.
4. An independent text encoder embeds the query without executing or loading the
   vision graph.
5. A custom signed-INT8 WebAssembly SIMD kernel ranks the local index, and the
   results develop into a photographic contact sheet.

Photos, queries, thumbnails, embeddings, inference, ranking, and persistence stay
inside the client browser. The host serves static files only; there is no Pinhole
application server or inference endpoint.

## Why Mobile AI

The optimization and the user value are the same story. Removing unnecessary
vision work lowers query latency. Lazy modality loading and compact vectors lower
mobile memory pressure. Local persistence and an offline-capable shell remove the
network from steady-state search. Those improvements are what let personal
memories remain personal.

With the public demo roll, Pinhole visibly reports **1.3 MB of original photo
bytes not sent to an AI API**. After the static app and model artifacts are
cached, a search sends zero user content and waits on no cloud-inference round
trip.

## How we built it

The upstream TinyCLIP release provides one combined image-and-text ONNX graph.
Requesting only `text_embeds` does not prune the image branch in ONNX Runtime, so
Pinhole performs exact dependency-graph extraction and ships separate text and
vision graphs. An automatic parity gate compares both extracted outputs with the
combined model before the build can pass.

The vision graph loads only while importing new photos. Each normalized Float32
embedding is then symmetrically quantized per vector from 2,048 bytes to 516
bytes: 512 signed bytes plus one Float32 scale. Search batches the compact corpus
through a **434-byte WAT kernel** that sign-extends INT8 lanes, uses WASM SIMD
integer dot products, handles non-multiple-of-16 tails, rescales scores, and runs
the exact Top-K selection.

The browser runs ONNX Runtime Web with WASM SIMD in a worker. On the hosted PWA,
a same-origin service worker adds COOP/COEP to the otherwise headerless GitHub
Pages shell, enabling SharedArrayBuffer and threaded WASM. Unsupported browsers
retain the same SIMD path with one thread instead of failing. The UI reports the
thread count actually in use.

## Measured optimization on Arm

The primary public run used native Arm64 Chromium and four Arm Neoverse-N2 cores.
Paths were interleaved with rotating order after warm-up; results below are
medians, never best runs. Raw JSON records the hardware, runtime, exact hashes,
sample counts, p95, min/max, MAD, baselines, and correctness gates.

| Optimization | Strongest baseline | Pinhole | Result |
|---|---:|---:|---:|
| Browser text query, 2 WASM threads | combined graph, text output requested: 121.865 ms | split text graph: 12.493 ms | **9.76× faster** |
| Native text query, 1 thread | combined graph: 45.553 ms | split text graph: 3.972 ms | **11.47× faster** |
| Isolated 10k-vector signed-INT8 scan | identical INT8 scalar JS: 6.735 ms | WASM SIMD: 0.436 ms | **15.44× faster** |
| Full 10k-vector ranking | Float32 JS: 9.531 ms | INT8 WASM SIMD: 3.410 ms | **2.80× faster** |
| Full ranking, SIMD contribution only | identical INT8 scalar path: 9.649 ms | INT8 WASM SIMD: 3.410 ms | **2.83× faster** |
| 10k-vector index memory | 20,480,000 bytes | 5,160,000 bytes | **74.8% smaller** |

The upstream INT8 model conversion is credited rather than presented as our
work; relative to its FP32 source, that payload is also 74.2% smaller. Pinhole’s
original contributions are graph separation, lazy modality loading, compact
per-vector storage, the signed-INT8 batch kernel, product integration, and the
measurement and quality system around them.

## Correctness before speed

Every optimization has a guard:

- extracted text and vision outputs are bit-for-bit equal to the combined graph
  (`max_abs_error = 0.0`);
- scalar and WASM SIMD paths produce identical integer dot products and exact
  Top-K results;
- the seeded compact benchmark retains **0.996 mean Recall@10** and **1.0 Top-1
  agreement**;
- both Float32 and compact INT8 retrieval rank the intended image first for all
  12 fixed real-photo queries;
- the production flow passes a dynamic WCAG 2 A/AA audit with zero violations.

The committed evidence is not a screenshot of one favorable timing. It includes
the raw browser-model, native-model, index, and real-photo JSON, plus repeat runs
and a one-command judge gate.

## Offline proof

The 63-second portrait demo was recorded in a 9:16 mobile viewport by native
Arm64 Chromium. It is transparently a responsive browser capture, not claimed as
physical-phone footage. Before the second query, the harness forces the browser
context offline, confirms `navigator.onLine === false`, verifies that an uncached
network probe is blocked, waits for Pinhole’s **Offline · local search active**
status, and searches for “coffee on an open book.” The coffee photo ranks first.
The recording fails if the probe succeeds, the result is wrong, or an unexpected
console/request error occurs.

[Inspect that public recording run](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31655157040).

## What is original and reusable

Pinhole contributes:

- exact ONNX graph surgery with pinned source hashes and an automatic parity
  gate;
- modality-specific loading so a saved camera roll can be searched without the
  8.96 MB vision graph;
- a per-vector symmetric INT8 format with explicit retrieval-quality checks;
- a single-call signed-INT8 WASM SIMD batch scan with scalar fallback and tail
  tests;
- native-model, browser-model, index, and real-photo benchmark harnesses with
  strong controls and dispersion statistics;
- an explicit browser privacy boundary and threat model; and
- a [porting guide](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/docs/PORTING.md)
  that maps the same optimization pattern to other multimodal retrieval apps.

Pinhole was created on August 12, 2026, inside the challenge period. Its public
history records the implementation, optimization, benchmark, native-browser,
offline, accessibility, media, and documentation milestones.

## Challenges we ran into

The first trap was assuming that requesting only the text output would skip the
image branch. A raw-ORT control disproved that assumption: the combined session
still scheduled the unused branch. Extracting the actual dependency subgraph was
necessary to make the hot path smaller.

The second challenge was signed byte arithmetic. WASM widening operations can
silently interpret negative INT8 values as unsigned. The kernel explicitly
sign-extends both halves, accumulates i32 lanes, and retains a scalar tail. Tests
cover negative values and a 513-dimensional vector.

The third challenge was reconciling browser threading, static hosting, and a
strict privacy boundary. Threaded WASM needs cross-origin isolation, while GitHub
Pages cannot set those headers. A same-origin service worker supplies them, all
runtime assets remain same-origin, and the application reports its real fallback
state instead of implying threads that are unavailable.

## Accomplishments we are proud of

- A finished, no-login PWA whose optimization is visible as a useful product.
- Strong baselines that isolate graph surgery, compaction, and SIMD rather than
  combining them into one ambiguous speedup.
- Reproducible native Arm evidence with exact hashes and raw distributions.
- Bit-for-bit model parity, exact kernel parity, retrieval-quality guards, full
  browser tests, accessibility checks, and genuine forced-offline proof.
- A small reusable optimization kit rather than a benchmark-only prototype.

## Try it in 90 seconds

1. Open the [live PWA](https://tauil-abd-elilah.github.io/pinhole-ai/) in Chrome.
2. Wait for **Local AI ready**, then choose **Load demo roll**.
3. Search `golden dog in the snow`, `coffee on an open book`, or your own phrase.
4. Use **Choose photos** to index local files, or **Add to Home screen** to install
   the PWA.

The first uncached query includes tokenizer/session warm-up; use a second
different phrase to see the steady-state encoder. Exact repeats are deliberately
shown as `cached` rather than misreported as encoder speed.

```bash
git clone https://github.com/TAUIL-Abd-Elilah/pinhole-ai.git
cd pinhole-ai
npm ci
npm run verify:submission
```

That command builds the production PWA and exercises model loading, real-photo
indexing and ranking, accessibility, query caching, static-host isolation, a
blocked uncached network probe, offline reload, and persisted local search. It
fails on a wrong result or unexpected browser error.

## What’s next

Next we want to validate the same flow across a broader set of physical Arm
Android devices and larger personal libraries, add incremental background
indexing, and explore hardware-aware execution providers while keeping the exact
privacy and correctness gates. The current PWA remains complete and usable
without those extensions.

## Built with

TypeScript, React, Vite PWA, ONNX Runtime Web, Transformers.js, ONNX, TinyCLIP,
IndexedDB, Web Workers, WebAssembly SIMD, WAT, Python, NumPy, Vitest, Playwright,
axe-core, GitHub Actions, Arm64, and Microsoft Cobalt 100.
