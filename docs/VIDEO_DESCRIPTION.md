# Public video metadata

## Title

Pinhole — Private on-device photo search optimized for Arm

## Description

Pinhole finds a photo from a natural-language memory without uploading the
camera roll. TinyCLIP inference, compact indexing, and search all run locally in
the browser on Arm-powered client devices.

Try the live PWA: https://tauil-abd-elilah.github.io/pinhole-ai/

Source and reproducible evidence:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai

This 63-second product demo was recorded by native Arm64 Chromium on a Microsoft
Cobalt 100 runner. The public run includes the recording, screenshot, raw JSON,
and log that explicitly confirms the WASM SIMD path:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31579510127

Measured on a real Arm Neoverse-N2 runner:
- 11.30x faster text queries through exact-parity graph separation
- 3.58x faster exact 10,000-vector scans with signed-INT8 WASM SIMD
- 74.8% less index memory
- bit-for-bit model parity and 99.6% mean Recall@10

Built for the Arm Create: AI Optimization Challenge 2026, Mobile AI track.

The video contains no music. Demonstration photographs are used under CC0,
CC BY, and CC BY-SA licenses. Full creator, source, modification, and license
attribution:
https://github.com/TAUIL-Abd-Elilah/pinhole-ai/blob/main/public/demo/ATTRIBUTION.md
