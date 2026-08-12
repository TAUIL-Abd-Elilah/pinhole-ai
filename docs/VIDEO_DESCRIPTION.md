# Public video metadata

## Title

Pinhole — Private on-device photo search optimized for Arm

## Description

Live PWA: https://tauil-abd-elilah.github.io/pinhole-ai/
Source + reproducible evidence: https://github.com/TAUIL-Abd-Elilah/pinhole-ai

Pinhole finds a photo from a natural-language memory without uploading the
camera roll. TinyCLIP inference, compact indexing, and search all run locally in
the browser on Arm-powered client devices. In the video, the browser network is
visibly forced offline before a second natural-language search returns the
correct photo.

This 63-second product demo was recorded by native Arm64 Chromium on a Microsoft
Cobalt 100 runner. The public workflow includes the recording, static-host
isolation and offline checks, screenshots, raw JSON, and a log that explicitly
confirms the WASM SIMD path:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31646299070

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

Built for the Arm Create: AI Optimization Challenge 2026, Mobile AI track.

The video contains no music. Demonstration photographs are used under CC0,
CC BY, and CC BY-SA licenses. Full creator, source, modification, and license
attribution:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/public/demo/ATTRIBUTION.md
