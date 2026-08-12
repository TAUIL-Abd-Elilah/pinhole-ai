# On-device measurement (Arm Cortex-A)

## Why this page exists

Every benchmark in this repository was produced on **Arm Neoverse-N2** (Microsoft
Cobalt 100) — a server core. Pinhole is pitched at Arm-powered Android phones,
which use **Cortex-A** cores with a different cache hierarchy, lower memory
bandwidth, thermal throttling, and big.LITTLE scheduling.

Neoverse numbers are honest and clearly labelled, but they are not phone numbers.
This page records measurements taken on real consumer Arm silicon so the claim and
the evidence describe the same class of hardware.

## Procedure

No tooling, cable, or build step is required. Pinhole already reports its own
timings in the interface.

1. Open <https://tauil-abd-elilah.github.io/pinhole-ai/> in Chrome on the phone.
2. Wait for the status pill to read **Local AI ready**.
3. Tap **Load demo roll** and let all 12 photographs finish indexing.
4. Search `golden dog in the snow`, then `coffee on an open book`, then
   `yellow flower on black`.
5. Read the instrument strip at the bottom of the control panel:
   `PHOTOS HERE`, `INDEX`, `VECTOR SEARCH`, `TEXT ENCODER`.
6. Screenshot the ranked result with the strip visible.
7. Record the device, SoC, Android version, and Chrome version.

Record the **third distinct query's** value. The first search includes tokenizer
warm-up and is not representative; repeating the exact same text intentionally
shows `cached` because Pinhole reuses a bounded in-memory query embedding.

## Strongest visual proof: airplane mode

After one online run has cached the application/model artifacts and indexed the
demo roll:

1. Start the phone's screen recorder with notifications hidden.
2. Show Airplane mode turning on, then return directly to Pinhole.
3. Reload or reopen the installed PWA and search a new phrase such as
   `coffee on an open book`.
4. Hold on the correct first result, the **Offline · local search active** pill,
   and the instrument strip for several seconds. Capture the online thread count
   before turning on Airplane mode.

This proves the product claim more clearly than another benchmark screenshot.
Use only the public demo roll, and do not expose the notification shade longer
than necessary.

## Results

> Replace this block with real values. Do not publish estimated or interpolated
> numbers — the credibility of every other measurement in this repository depends
> on that distinction holding.

| Field | Value |
|---|---|
| Device | _e.g. Pixel 8_ |
| SoC / core | _e.g. Tensor G3, Cortex-X3 + A715 + A510_ |
| Android / Chrome | _e.g. Android 15 / Chrome 151_ |
| WASM threads reported | _copy the live status pill; isolated browsers use up to 4_ |
| Text encoder | _… ms_ |
| Repeated exact query | _should report `cached`_ |
| Vector search (12 photos) | _… µs_ |
| Index size | _… KB_ |
| Search result | _dog ranked first: yes / no_ |

## How to describe these numbers

These are **live UI telemetry from a single device**, not benchmark medians. They
are not directly comparable to the interleaved, warm-up-discarded, 30-sample
Neoverse-N2 figures, and they must never be presented as though they were.

Correct framing for the write-up and the video:

> On a *<device>*, the hosted PWA reports *<N>* WASM threads, embeds a fresh query
> in *<X>* ms, and scans the local index in *<Y>* µs. Live in-app telemetry from
> one device — the
> controlled 30-sample comparisons remain the Neoverse-N2 runs in
> `bench/results/`.

That sentence is worth more to a judge than another server-core decimal place: it
demonstrates the optimization on the hardware class the project actually targets,
while preserving the measurement discipline used everywhere else.

## Optional: WebView / Android Chrome remote debugging

If a USB cable and desktop Chrome are available, `chrome://inspect` will attach to
the phone's tab and expose the same console the CI harnesses read. This is not
required — the in-app strip reports the same figures.
