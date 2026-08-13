# Public video metadata

## Title

Pinhole — Private on-device photo search optimized for Arm

## Description

Live PWA: https://tauil-abd-elilah.github.io/pinhole-ai/
Source + reproducible evidence: https://github.com/TAUIL-Abd-Elilah/pinhole-ai

Chapters:
0:00 Private on-device search
0:13 Find a photo by meaning
0:25 Measured Arm optimization
0:35 Forced-offline search proof
0:45 Privacy, source, and evidence

Pinhole finds a photo from a natural-language memory without uploading the
camera roll. TinyCLIP inference, compact indexing, and search all run locally in
the browser on Arm-powered client devices. In the video, the browser network is
visibly forced offline before a second natural-language search returns the
correct photo.

This 63-second portrait product demo was recorded in a 9:16 mobile viewport by
native Arm64 Chromium on a Microsoft Cobalt 100 runner. The public workflow
includes the recording, static-host isolation and offline checks, screenshots,
raw JSON, and a log that explicitly confirms the WASM SIMD path:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31655157040

The mobile viewport demonstrates the responsive PWA; it is not presented as a
physical-phone capture. The same live PWA can be opened directly on an Arm
Android phone and installed with **Add to Home screen**.

Cobalt is the reproducible Arm measurement and recording host—not an inference
service used by Pinhole. The deployed product has no application backend: when
opened on an Arm phone, tablet, or laptop, inference and private data remain in
that client browser.

Measured on a real Arm Neoverse-N2 runner:
- 9.76x faster text queries in the shipped Chromium/WASM runtime
- 15.44x faster signed-INT8 scan than the identical scalar control
- 2.83x faster full ranking path than the identical scalar control
- 11.47x faster text queries through exact-parity graph separation
- 2.80x faster end-product Float32-to-compact full ranking
- 74.8% less index memory
- bit-for-bit model parity and 99.6% mean Recall@10
- 1.3 MB of demo-photo bytes not sent to an inference API

Committed raw browser, native model, index, and retrieval JSON:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/tree/main/bench/results/cobalt-31625513958

Reusable graph extraction, compact-vector, SIMD, benchmark, and quality-gate kit:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/docs/PORTING.md

Built for the Arm Create: AI Optimization Challenge 2026, Mobile AI track.

The video contains no music. Demonstration photographs are used under CC0,
CC BY, and CC BY-SA licenses. Full creator, source, modification, and license
attribution:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/public/demo/ATTRIBUTION.md

#ArmAI #OnDeviceAI #WebAssembly
