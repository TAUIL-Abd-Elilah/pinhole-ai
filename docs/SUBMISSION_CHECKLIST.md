# Arm AI Optimization Challenge submission checklist

Official deadline: **August 14, 2026 at 4:00 PM PDT** — **August 15 at
12:00 AM in Casablanca**. Submit earlier so Devpost processing or video upload
does not become the failure mode.

## Ready in the repository

- [x] Public source repository with an MIT license detected by GitHub.
- [x] Working no-login live PWA and complete local setup instructions.
- [x] Mobile AI track named consistently in the app, README, and write-up.
- [x] Raw repeatable Arm64 benchmark JSON with host, Chromium, and workflow identity.
- [x] Native Arm64 Chromium product flow, responsive screenshot, and demo footage.
- [x] Native Arm64 video shows the product's offline status; its harness confirms
  an uncached probe is blocked and a correct second search completes with zero
  unexpected request/console errors.
- [x] Model/source hashes, attribution, privacy limits, and quality guards.
- [x] 1200×630 cover, desktop product image, and 390×844 mobile product image.
- [x] Devpost-ready English copy in [`SUBMISSION.md`](SUBMISSION.md).
- [x] One-command `npm run verify:submission` judge gate for the production,
  accessibility, static-host, cache, and offline flows.
- [x] Sub-three-minute video title, description, and narration in
  [`VIDEO_DESCRIPTION.md`](VIDEO_DESCRIPTION.md) and
  [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md).
- [x] Public YouTube video is embeddable while signed out:
  <https://www.youtube.com/watch?v=O7vfNBXskPg>.

## Devpost actions

- [x] Join the challenge with the intended Devpost account.
- [x] Join the Arm Developer Program using the same email address, as required by
  the official rules.
- [x] Create the submission and identify it throughout as **Mobile AI**.
- [x] Use project name **Pinhole** and tagline **Describe the moment. Find the
  photo. Nothing leaves your phone.**
- [x] Paste and format the public copy from [`DEVPOST_STORY.md`](DEVPOST_STORY.md).
- [x] Use the exact links, technology list, and suggested survey responses in
  [`DEVPOST_FORM.md`](DEVPOST_FORM.md), changing any personal survey response
  that is not true for the entrant.
- [x] Add the live app and public repository URLs from the metadata section.
- [x] Upload `.cache/final-submission/Pinhole-demo-mobile-native-Arm64-narrated.mp4`
  publicly. Use <https://www.youtube.com/watch?v=O7vfNBXskPg> on Devpost; the
  caption-card-only fallback is the adjacent `captioned.mp4`.
- [ ] If any Arm Android phone is available, capture the short Airplane-mode
  proof in [`ON_DEVICE.md`](ON_DEVICE.md) and record only real displayed values.
  This is the highest-value optional upgrade; it must not delay submission.
- [ ] Use `.cache/final-submission/Pinhole-video-thumbnail-1280x720.png` as the video
  thumbnail and optionally upload `Pinhole-demo-en.srt` as English captions.
- [x] Upload `media/pinhole-cover.png` first, followed by
  `media/pinhole-mobile.png`, `media/pinhole-offline-proof.png`, and
  `media/pinhole-search.png`.
- [x] State that the project was created August 12, 2026, during the submission
  period; the public commit history is the evidence.
- [x] Preview every judge-facing link from a signed-out browser; all returned
  HTTP 200 with zero page errors on August 13, 2026.
- [x] Submit and confirm the signed-out page explicitly displays **Submitted to
  Arm Create: AI Optimization Challenge**:
  <https://devpost.com/software/pinhole>.
- [ ] After submission, optionally use [`SHARE_COPY.md`](SHARE_COPY.md) for one
  evidence-first Arm community post and follow the channel's self-promotion
  rules.

## Final smoke path

1. Open <https://tauil-abd-elilah.github.io/pinhole-ai/> in a private window.
2. Wait for **Local AI ready**, load the demo roll, and search `golden dog in the
   snow`.
3. Confirm the dog ranks first, the UI reports `wasm simd`, and there are no
   visible errors.
4. Open <https://github.com/TAUIL-Abd-Elilah/pinhole-ai> and confirm the cover,
   license, homepage, and latest green workflow are visible without signing in.
