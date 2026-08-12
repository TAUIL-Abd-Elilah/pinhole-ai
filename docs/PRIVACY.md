# Privacy boundary and threat model

## What crosses the network

The application shell, ONNX Runtime, TinyCLIP model files, fonts, and public demo
photos are ordinary same-origin static downloads. User-selected photographs are
never passed to `fetch`, `XMLHttpRequest`, a form, analytics, or a remote inference
service. Model inference runs in a browser worker.

After those versioned static assets are cached, a search sends zero user-content
bytes and makes no request to an inference endpoint. “Nothing leaves your phone”
describes photos, queries, embeddings, thumbnails, and inference data—not the
initial download of the open application and model artifacts.

## Why the privacy boundary also unlocks threading

Multi-threaded WASM requires cross-origin isolation. Pinhole can apply strict
COOP/COEP on a headerless static host because its code, models, runtime, WASM,
fonts, and public demo media are all same-origin; there is no third-party runtime
dependency for COEP to block. The service worker installs once, reloads once,
and exposes SharedArrayBuffer for up to four ONNX Runtime threads. If isolation
is unavailable, the same SIMD path continues with one thread.

## What is retained

For each selected image, IndexedDB stores:

- a resized WebP thumbnail;
- a 512-byte signed-INT8 embedding and one Float32 scale;
- filename, MIME type, dimensions, original byte count, and modification time;
- a truncated SHA-256 of those metadata fields for duplicate avoidance.

The original bytes are held transiently by the browser `File` and worker during
decode. They are not copied into IndexedDB. **Clear local index** deletes every
stored record.

## What this protects against

- routine exposure to a hosted photo-search provider;
- server retention, API logging, and account correlation;
- loss of service when offline;
- accidental transfer of a camera roll during ordinary app use.

## What it does not protect against

- a compromised browser, operating system, extension, or device;
- another person with access to the same unlocked browser profile;
- sensitive content visible in locally stored thumbnails;
- a malicious fork that changes this open source code;
- browser storage eviction.

Pinhole is a local-processing architecture, not encryption software. Users with a
high-risk threat model should use device encryption and a dedicated browser
profile in addition to the app.
