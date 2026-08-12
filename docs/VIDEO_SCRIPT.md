# Pinhole demo video script

Target length: 60–75 seconds. Keep the final upload below three minutes. Use no
music or third-party logos. `node tools/record-demo.mjs` produces the captioned
browser footage; replace or supplement it with real Android footage when a device
is available.

## Narration

Your camera roll should not have to leave your phone to become searchable.
Meet Pinhole, a local semantic photo-search app for Arm-powered Android devices.

Load the demo roll, or choose your own pictures. A TinyCLIP vision model creates
compact embeddings in a worker. Originals are never uploaded or retained.

Describe a moment in plain language. The separate text encoder runs locally, and
a 434-byte WebAssembly SIMD kernel ranks the compact index.

On a real Arm Neoverse-N2 runner, exact graph surgery made text queries 11.3
times faster. INT8 SIMD made a ten-thousand-vector scan 3.58 times faster while
using 74.8 percent less index memory.

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
6. Search for “coffee on an open book” to prove re-ranking is live.
7. Show split-model sizes, the 434-byte kernel, and retained-data boundary.
8. End on the live PWA URL and public evidence invitation.
