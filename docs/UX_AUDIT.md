# Deployed UX audit

Pinhole treats the judge-facing product as part of the technical submission, not
as an untested wrapper around a benchmark.

## Lighthouse snapshot

The deployed Pages build was measured on **August 12, 2026 at 18:12 UTC** with
Lighthouse **12.8.2** and its default mobile navigation profile:

| Category | Score |
|---|---:|
| Performance | **97** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

The same snapshot recorded 1.94 s First Contentful Paint, 1.94 s Largest
Contentful Paint, 0 ms Total Blocking Time, and 0.0018 Cumulative Layout Shift.
Lighthouse scores are lab snapshots and can vary with network and host load; the
date, version, URL, and supporting metrics are stated so the result is not
presented as a timeless guarantee.

The complete machine-readable report is committed at
[`bench/results/lighthouse-20260812.json`](../bench/results/lighthouse-20260812.json),
matching the evidentiary standard used by the Arm benchmark bundles.

Reproduce it with:

```bash
npx lighthouse https://tauil-abd-elilah.github.io/pinhole-ai/ \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

## Ranked-result accessibility gate

Lighthouse inspects initial navigation. Pinhole additionally tests the state a
judge actually uses: `tools/browser-flow.mjs` loads the model, indexes all 12
attributed photos, searches `golden dog in the snow`, waits for the contact sheet
animation to settle, injects axe-core, and fails on any WCAG 2 A/AA violation.
The final deployed run returned the dog first with WASM SIMD active, zero axe
violations, and zero console or request errors at a 390×844 viewport.

The same flow runs in native Arm64 Chromium in public CI, so responsive behavior
and accessibility are verified alongside the model and index evidence.
