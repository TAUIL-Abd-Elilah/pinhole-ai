# Pinhole — extended submission evidence

## Submission metadata

- **Project:** Pinhole
- **Tagline:** Describe the moment. Find the photo. Nothing leaves your phone.
- **Track:** Mobile AI (Track 3)
- **Submitted project:** https://devpost.com/software/pinhole
- **Live application:** https://tauil-abd-elilah.github.io/pinhole-ai/
- **Public video:** https://www.youtube.com/watch?v=O7vfNBXskPg
- **Public source:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai
- **License:** MIT
- **Final Arm evidence:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31625513958
- **Committed raw evidence:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/tree/main/bench/results/cobalt-31625513958
- **Native Arm portrait demo footage:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31655157040

## Judge evidence map

| Criterion | Fastest evidence |
|---|---|
| Technological implementation | [Exact-parity graph extraction](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/tools/prepare_model.py), lazy modality loading, a compact INT8 index, and a [434-byte signed-INT8 WASM SIMD kernel](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/wasm/dot_i8.wat); every headline comparison has a control and correctness gate. |
| WOW factor | [One-click semantic photo search](https://tauil-abd-elilah.github.io/pinhole-ai/), followed in the 63-second demo by a second correct search while the product reports **Offline · local search active**. |
| Potential impact | Personal photos and queries stay out of an inference API; the index uses **74.8% less memory**, while the [reusable optimization kit](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/docs/PORTING.md) transfers the pattern to other multimodal retrieval apps. |
| Developer experience | Public PWA, MIT source, pinned hashes, [raw Arm64 JSON](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/tree/main/bench/results/cobalt-31625513958), CI browser artifacts, and one-command `npm run verify:submission` validation. |

## Mobile AI track alignment

Pinhole is a **Track 3: Mobile AI** entry, not a cloud-inference service. The
host serves static application/model files only; ONNX inference, photo indexing,
query embedding, ranking, and persistence execute inside the client browser.

| Mobile AI expectation | Pinhole evidence |
|---|---|
| Local inference on Arm client devices | The installable PWA runs the same ONNX Runtime Web/WASM path in Android and Arm-laptop browsers; it has no application backend or inference endpoint. |
| Mobile constraints | Exact graph separation removes vision work from each query; lazy loading, 74.8% smaller indexes, responsive workers, bounded caches, and offline persistence target memory, latency, and network dependence. |
| Privacy and offline value | Photos and queries remain client-side, and the native-Arm recording completes a different correct search after its uncached network probe is blocked. |
| Reproducible Arm execution | Public native Arm64 Chromium and Neoverse-N2 runs record architecture, hashes, controls, dispersion, quality, and the complete production-browser flow. Cobalt is the public measurement host—not a runtime service used by the app. |

## Project overview

Your camera roll should not have to leave your phone to become searchable.
Pinhole makes it searchable inside an installable Arm Android PWA: exact-parity
graph surgery makes queries **9.76x faster in the shipped browser runtime**, each
saved search vector uses **74.8% less memory**, and personal data never goes to an
inference API. Type “golden dog in the snow” instead of remembering a filename or
date, and Pinhole finds the moment entirely inside the browser.

The product experience is simple, but the implementation changes the model
graph, storage representation, and retrieval path for on-device constraints. It
turns an upstream combined TinyCLIP graph into independent, exact-parity text and
vision encoders; lazy-loads the vision side only when a photo needs indexing;
compresses every saved embedding from 2,048 to 516 bytes; and scans those compact
vectors with a custom 434-byte signed-INT8 WebAssembly SIMD kernel. The result is
a useful privacy experience with optimization that a judge can inspect,
reproduce, and measure.

The impact is visible rather than hypothetical. With the public 12-photo roll,
Pinhole reports **1.3 MB of original photo bytes not sent to an AI API**. Once
the static application and model artifacts are cached, a search sends zero user
content and waits on no cloud-inference round trip.

The optimization is inseparable from the human value: less computation, memory,
and network dependence are exactly what let personal photos remain personal.
Unlike an on-device concept with a single timing, Pinhole ships reproducible Arm
comparisons, strong controls, raw samples, and a correctness gate for every speed
or size claim. It is a finished, one-click demo, not a benchmark wrapped around a
hypothetical product.

Pinhole should win because its measured Arm optimization, finished private
client experience, and reusable optimization kit are one coherent result: the
engineering improvement is exactly what makes the human value possible.

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
full-browser tests (including a dynamic WCAG A/AA gate), privacy documentation,
and raw benchmark JSON from a real Arm64 runner.

The deployed product is also measured as a product: a dated Lighthouse 12.8.2
mobile snapshot scored **97 Performance and 100 Accessibility / Best Practices /
SEO**. The stronger full-flow gate then loaded the model, indexed and searched
the real-photo roll, and found zero WCAG 2 A/AA violations after results settled.

The 63-second native-Arm product recording makes the privacy boundary visible:
after the first result, its harness forces browser networking offline, runs a
different query, asserts that “coffee on an open book” ranks first, and records
the result under the product's own **Offline · local search active** status. The
recording fails if an uncached network probe succeeds, the result is wrong, or a
console/request error appears.

A fresh-profile audit of the deployed full-demo path also measures mobile
delivery: the two split models, ORT loader/runtime, and custom kernel total
**19.0 MiB of gzip-encoded inference-artifact responses**. The production worker
requests the 3.20 MiB compressed plain threaded ORT WASM—not the unused 23.57 MB
Asyncify dependency artifact—and the full browser gate now rejects an Asyncify
request. The raw report records every URL, response length, and encoding; this is
a transfer audit, not a latency claim.

## Measured optimization on Arm

Final run
[`31625513958`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31625513958)
executed the shipped ONNX Runtime Web/WASM SIMD path in native Arm64 Chromium on
four Arm Neoverse-N2 cores. It interleaved 30 samples per path after 7 warm-ups.
Even the strongest combined-graph control—requesting only `text_embeds`—still
scheduled the unused vision branch:

| Product-runtime optimization | Strongest baseline | Pinhole | Outcome |
|---|---:|---:|---:|
| Browser text query, 2 WASM threads | combined graph 121.865 ms | split text graph 12.493 ms | **9.76x faster** |

The combined graph is the fair baseline because upstream ships no split artifact
for this model—only variants of one combined graph—so this is where any adopting
developer actually begins. The `combined_requested_text_only` control closes the
obvious objection: requesting only `text_embeds` from the unsplit session costs
121.865 ms against the full forward's 121.845 ms. ONNX Runtime does not prune the
unused vision branch, so the work had to be removed deliberately.

The browser result has bit-for-bit output parity and records the host as `arm64`,
Chromium's high-entropy architecture hint as `arm`/`64`, the exact model hashes,
and complete median, p95, min/max, and MAD statistics. Its raw JSON is committed
with the source instead of depending on an expiring CI artifact.

The same run also isolates the Arm SIMD contribution from INT8 compaction. With
the exact same quantized queries and 10,000-vector corpus, the signed-INT8
dot-product scan falls from 6.735 ms in scalar JavaScript to 0.436 ms in the WASM
batch kernel—**15.44x faster**. Including rescaling and the full Top-K sort, the
path is **2.83x faster** (9.649 → 3.410 ms). Every integer score and every Top-K
result is exactly equal between the two paths.

The final run also used four Arm Neoverse-N2 cores for a unified native CPU and
compact-index measurement. Model tests used ONNX Runtime's CPU execution
provider with 7 discarded warm-ups and 50 measured forwards. Index tests used
25 fixed seeded queries over 10,000 512-dimensional vectors. Values below are
medians, never best-of-run timings.

| Optimization | Baseline | Pinhole | Outcome |
|---|---:|---:|---:|
| Text query, 1 thread | combined graph 45.553 ms | split text graph 3.972 ms | **11.47x faster** |
| Text query, 4 threads | combined graph 15.412 ms | split text graph 1.702 ms | **9.05x faster** |
| Exact 10k-vector full ranking | Float32 JavaScript 9.531 ms | INT8 WASM SIMD 3.410 ms | **2.80x faster** |
| 10k-vector index | 20,480,000 bytes | 5,160,000 bytes | **74.8% smaller** |
| Model payload | FP32 94,071,688 bytes | upstream INT8 24,281,512 bytes | **74.2% smaller** |

The Float32 JavaScript baseline has occasional long p95 pauses consistent with
runtime scheduling or garbage collection. They remain in the raw JSON; medians
are used for the headline so an isolated pause does not become either a penalty
or a cherry-picked advantage.

Correctness accompanies every speed claim. Extracted text and vision outputs are
bit-for-bit equal to the combined graph (maximum absolute error `0.0`). The
compact seeded index reaches `0.996` mean Recall@10 and `1.0` Top-1 agreement.
On the 12-photo demonstration path, both Float32 and compact INT8 retrieval find
the intended result first for all 12 fixed queries, with `1.0` mean Recall@3
between their rankings. That small, fully disclosed set is a product regression
test—not a claim of general model accuracy.

Four independent Arm runs are retained in the repository. Earlier runs remain
available as repeatability evidence; the newest run adds the isolated
scalar-INT8 control rather than silently replacing the original methodology.
Run-to-run dispersion is disclosed rather than averaged away, and every figure
quoted above names the run that produced it.

The native and browser model harnesses deliberately use a full **77-token**
sequence, CLIP's maximum. Pinhole's shipped tokenizer uses the graph's dynamic
sequence axis and sends the actual query length, so those encoder measurements
are conservative upper bounds for ordinary short searches.

The workflow also executes the complete PWA, not only benchmark harnesses. Final
run `31625513958` built the production
app on Cobalt, indexed all 12 real photographs in a 390×844 mobile viewport,
searched “golden dog in the snow,” returned the dog first, and captured the frame
used in the project cover. It explicitly asserted the `wasm simd` search path;
reported two WASM threads, ran a dynamic WCAG 2 A/AA audit after results settled,
and completed with zero console or request errors. UI timings remain live smoke
telemetry and are not represented as benchmark medians.

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
- reusable native-model, browser-model, index, and real-photo benchmark harnesses
  whose JSON records hardware, runtime, methodology, hashes, dispersion, and
  quality;
- an explicit browser privacy boundary and threat model.

The extraction pattern and compact exact-scan kernel can be reused by other
on-device multimodal retrieval apps, not only photo search. A dedicated
[porting guide](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/docs/PORTING.md)
identifies the reuse seams and gives other developers
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

The first uncached query includes tokenizer/session warm-up. Use a second
**different** query to observe the steady-state encoder; an exact repeat is
intentionally labelled `cached` in the interface.

GitHub Pages cannot emit cross-origin-isolation headers itself, so Pinhole's
same-origin service worker adds COOP/COEP to the app shell and performs one
installation reload. That unlocks SharedArrayBuffer and up to four ONNX Runtime
WASM threads on the hosted PWA. Unsupported browsers retain the exact same SIMD
path with one thread rather than failing.

The privacy architecture makes that strict isolation practical: application
code, models, ONNX Runtime, WASM, fonts, and demo media are all same-origin, so
COEP does not break a third-party dependency. The one-time reload is deliberate,
and the status pill always reports the thread count actually in use.

Public Arm64 run
[`31655157040`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31655157040)
tests that static-host path without server headers, asserts cross-origin
isolation and repeated-query cache correctness, then forces the browser offline,
reloads, and completes another search with zero request or console errors. The
same run records the judge-facing demo in a 9:16 mobile viewport in native Arm64
Chromium and independently forces networking offline before its second successful
search.

### Build from source

```bash
git clone https://github.com/TAUIL-Abd-Elilah/pinhole-ai.git
cd pinhole-ai
npm ci
npm run dev
```

### Validate the implementation

```bash
npm run verify:submission

# Targeted checks below require a running dev server and Chrome
node tools/browser-smoke.mjs
node tools/browser-flow.mjs
node tools/browser-offline.mjs
```

To reproduce the exact model split and native Arm benchmark, follow
[`bench/README.md`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/bench/README.md).
The public workflow runs the complete
quality suite on x64 and all four benchmark/quality harnesses on
`ubuntu-24.04-arm`.

The offline harness warms the hosted application, indexes and searches the demo
roll, forces the browser network offline, verifies that an uncached probe is
blocked, reloads under service-worker control, and successfully performs a
second local search with no console or request errors. The main browser harness
runs axe-core after the contact sheet has ranked and animated, and fails on any
WCAG 2 A/AA violation.

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

Finally, browser threading and privacy need precise language. Multi-threaded WASM
requires cross-origin isolation, so a custom service worker supplies COOP/COEP on
the otherwise headerless static host. Pinhole reports the active thread count and
degrades to one thread if isolation is unavailable. Keeping every dependency
same-origin is both the privacy boundary and the condition that makes strict
COEP safe. The app and model are downloaded static assets; “nothing leaves your
phone” refers to user photos, queries, and inference data, which never cross the
network boundary.

## Built with

TypeScript, React, Vite PWA, ONNX Runtime Web, Transformers.js, ONNX, IndexedDB,
Web Workers, WebAssembly SIMD/WAT, Python, Vitest, Playwright, and GitHub Actions
on Arm64.
