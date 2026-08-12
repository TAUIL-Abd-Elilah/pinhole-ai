# Submission media provenance

- `pinhole-mobile.png` was captured by native Arm64 Chromium on the Microsoft
  Cobalt 100 runner in Actions run
  [`31625513958`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31625513958).
  The automated flow built the PWA, indexed 12 attributed photographs, searched
  for “golden dog in the snow,” asserted the dog ranked first through the WASM
  SIMD path, ran a dynamic WCAG 2 A/AA audit, and failed on any console or
  request error.
- `pinhole-cover.png` is rendered by `tools/render-cover.mjs` from that Arm
  screenshot and the committed benchmark results.
- `pinhole-search.png` is the corresponding full desktop development capture.
- `pinhole-offline-proof.png` is an unmodified frame from native Arm64 Actions
  run [`31648817286`](https://github.com/TAUIL-Abd-Elilah/pinhole-ai/actions/runs/31648817286).
  The recorder set the Chromium context offline, asserted `navigator.onLine` was
  false, searched for “coffee on an open book,” and asserted that photo ranked
  first with zero console/request errors.

All visible demo-photo creators and licenses are listed in
[`public/demo/ATTRIBUTION.md`](../../public/demo/ATTRIBUTION.md).
