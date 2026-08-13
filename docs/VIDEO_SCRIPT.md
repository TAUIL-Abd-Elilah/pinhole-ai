# Pinhole demo video script

Target length: 60–75 seconds. Keep the final upload below three minutes. Use no
music or third-party logos. `PINHOLE_DEMO_FORMAT=mobile node
tools/record-demo.mjs` produces the portrait mobile-viewport browser footage;
replace or supplement it with real Android footage when a device is available.

## Narration

Your camera roll should not have to leave your phone to become searchable.
Meet Pinhole, a local semantic photo-search app for Arm-powered Android devices.

Load the demo roll, or choose your own pictures. A TinyCLIP vision model creates
compact embeddings in a worker. Originals are never uploaded or retained.

Describe a moment in plain language. The separate text encoder runs locally, and
a 434-byte WebAssembly SIMD kernel ranks the compact index.

On a real Arm Neoverse-N2 runner, exact graph surgery made text queries 11.47
times faster. Against the identical INT8 scalar control, SIMD made a
ten-thousand-vector scan 15.44 times faster and the full ranking path 2.83 times
faster, while using 74.8 percent less index memory than Float32.

Extracted model outputs are bit-for-bit equal, and the compact benchmark retained
99.6 percent mean Recall at ten.

Pinhole turns careful Arm optimization into something human: private memories
that stay private. Try the live PWA, and inspect every result in the public
repository.

## Shot order

1. Pinhole title and one-sentence privacy promise.
2. Live local model status and empty camera roll.
3. Load the attributed demo roll; show live photo/index metrics.
4. Type “golden dog in the snow”; reveal the correct ranked result.
5. Show the three measured Arm outcomes and correctness guard.
6. Force browser networking offline, then search for “coffee on an open book”
   and hold on the correct result plus the product's visible offline status.
7. Show split-model sizes, the 434-byte kernel, and retained-data boundary.
8. End on the live PWA URL and public evidence invitation.

## Highest-value phone replacement shot

If a real Android device is available, replace shots 2–4 with a 12–18 second
portrait capture: finish one online run, turn on Airplane mode, reopen Pinhole,
search `coffee on an open book`, and hold on the correct result plus the in-app
offline status. Capture the live thread count before enabling Airplane mode. Keep
the controlled Neoverse-N2 numbers in the narration and label phone
timings as single-device UI telemetry, not benchmark medians. The existing
portrait Arm64 mobile-viewport video remains the compliant fallback; do not miss
submission waiting for this optional physical-device shot.
