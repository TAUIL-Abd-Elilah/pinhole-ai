# Evidence-first launch copy

Use this only where project sharing is permitted. Do not imply Arm endorsement
or post outside
channels where project sharing is allowed.

## Arm Developer Program community / Discord

I built **Pinhole**, a private semantic photo-search PWA for the Arm Mobile AI
track. Photos, queries, and inference stay in the browser; the demo forces
networking offline, the product reports **Offline · local search active**, and a
second search succeeds.

The optimization is measured on native Arm64 Chromium / Neoverse-N2:

- 9.76x faster text queries through exact-parity graph separation
- 15.44x faster signed-INT8 scan than the identical scalar control
- 74.8% less index memory, with 99.6% mean Recall@10

Live PWA: https://tauil-abd-elilah.github.io/pinhole-ai/
Source + raw evidence: https://github.com/TAUIL-Abd-Elilah/pinhole-ai
Devpost: https://devpost.com/software/pinhole
Video: https://www.youtube.com/watch?v=O7vfNBXskPg

I would especially value feedback on the ONNX graph split and the 434-byte
signed-INT8 WASM SIMD kernel.

## LinkedIn

Your camera roll should not have to leave your phone to become searchable.

I built **Pinhole** for the Arm Create: AI Optimization Challenge: an installable
semantic photo-search PWA with local TinyCLIP inference, compact INT8 indexes,
and a custom WebAssembly SIMD scan. In the demo, I force browser networking
offline and search again successfully.

Measured on native Arm64: 9.76x faster browser text queries, 15.44x faster
isolated INT8 scan, and 74.8% less index memory—with exact model parity and a
quality gate.

Try it: https://tauil-abd-elilah.github.io/pinhole-ai/
Evidence: https://github.com/TAUIL-Abd-Elilah/pinhole-ai
Submission: https://devpost.com/software/pinhole

#Arm #ArmAI #OnDeviceAI #WebAssembly #ONNX #Privacy

## YouTube pinned comment

Try Pinhole: https://tauil-abd-elilah.github.io/pinhole-ai/

Source, raw Arm64 measurements, model hashes, correctness gates, and the SIMD
kernel: https://github.com/TAUIL-Abd-Elilah/pinhole-ai

The second search in this video is executed after the recorder forces browser
networking offline and confirms an uncached probe is blocked. Pinhole itself
reports **Offline · local search active**. No photo, query, thumbnail, or
embedding is sent to an inference API.
