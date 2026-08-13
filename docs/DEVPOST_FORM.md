# Devpost form values

Use this as a field-by-field companion to [`SUBMISSION.md`](SUBMISSION.md).
Personal eligibility and survey answers must remain truthful. The suggestions
below reflect the work recorded in this repository; they are not assertions about
the entrant and should be edited wherever they do not match their experience.

## Public project fields

- **Project name:** Pinhole
- **Tagline:** Describe the moment. Find the photo. Nothing leaves your phone.
- **Track:** Mobile AI (Track 3)
- **Live application:** https://tauil-abd-elilah.github.io/pinhole-ai/
- **Video:** https://www.youtube.com/watch?v=O7vfNBXskPg
- **Repository:** https://github.com/TAUIL-Abd-Elilah/pinhole-ai
- **License:** MIT
- **Project story / description:** paste all of
  [`DEVPOST_STORY.md`](DEVPOST_STORY.md). It is the public, judge-facing version;
  `SUBMISSION.md` remains the longer evidence reference.
- **Video title and description:** use [`VIDEO_DESCRIPTION.md`](VIDEO_DESCRIPTION.md).
- **Primary image:** `media/pinhole-cover.png`
- **Additional images:** `media/pinhole-mobile.png`,
  `media/pinhole-offline-proof.png`, then `media/pinhole-search.png`

## Built with

Use these tags where Devpost recognizes them:

```text
TypeScript, React, Vite, PWA, ONNX Runtime Web, Transformers.js, ONNX,
TinyCLIP, IndexedDB, Web Workers, WebAssembly SIMD, WAT, Python, NumPy,
Vitest, Playwright, axe-core, GitHub Actions, Arm64, Microsoft Cobalt 100
```

## Custom challenge questions

The project gallery currently exposes these exact survey fields. Suggested
choices are based on repository evidence and should be edited if they do not
match the entrant's experience.

### Hardest parts

Suggested selections:

- **measuring performance** — four harnesses, strong baselines, dispersion,
  and native-Arm provenance were needed;
- **improving model speed or latency** — the combined graph still scheduled the
  vision branch even when only the text output was requested;
- **reducing model size or memory usage** — graph separation and compact vectors
  required explicit quality gates;
- **debugging runtime or compatibility issues** — WASM signed widening,
  cross-origin isolation, browser threading, and offline caching all needed
  dedicated validation;
- **finding compatible hardware or cloud instances** — select only if this was
  genuinely difficult for the entrant.

### What would have made it easier

Reasonable selections:

- **more Arm-specific optimization guidance**;
- **more benchmarking examples**;
- **easier access to Arm-based hardware or cloud instances**;
- **more sample projects**.

### Future Arm work

- **Did this challenge change your likelihood of building on Arm in the
  future?** Suggested: **yes, significantly more likely**, only if true.
- **How likely are you to continue developing, optimizing, or deploying this
  project after the challenge?** Suggested: **very likely**, only if true.

## Final verification

Open the repository, live PWA, video, and final Devpost page in a signed-out
window. The submission is not complete until Devpost shows it as submitted—not
merely saved as a draft—before August 14, 2026 at 4:00 PM PDT.
