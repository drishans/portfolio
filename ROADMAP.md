# Roadmap

The long-term plan for this site. Each pass is independently shippable and
ordered by value. Architecture notes are pre-researched (July 2026, versions
verified) so a future work session can start building instead of investigating.

## Standing decisions

- **Paths, not subdomains.** Topics live at `/topics/<slug>/`, never
  `quantum.drishan.com`. One domain compounds SEO authority and identity;
  subdomains fragment both and multiply deploys. Cross-topic posts (the best
  ones) can live in several hubs at once. *Escape hatch:* if a topic ever
  becomes a product with its own app, split that one to a subdomain then and
  add `_redirects`.
- **URLs are forever.** Never delete or rename a published path — add a 301 in
  `public/_redirects`. Slugs stay date-free.
- **Zero client-side frameworks, forever.** Interactivity is vanilla JS /
  WebGL / WASM. Heavy computation happens offline on the desktop (RTX 5090,
  96 GB RAM); the site ships the artifacts.
- **The build is the test suite.** Schema-validate everything; `npm run build`
  must stay the only gate. Check `/writing/kitchen-sink` (permanent draft)
  after any rendering-stack change.
- **Series live inside Writing.** Tutorials are field notes grouped by a
  `series` collection entry; no separate tutorials section.
- **Adding a topic** is one line in `TOPICS` (`src/consts.ts`). Hub pages
  appear only once a topic has published content.

## Pass 1 — Platform + tutorial stack (shipped July 2026)

Centralized draft filtering (`getPublished`), topic taxonomy + hub pages,
series architecture with series-aware navigation, build-time MathML (Sätteri
math + Temml plugin), Expressive Code frames, stable note/plate numbering,
WCAG contrast + UTC date fixes, and the `/writing/kitchen-sink` rendering
test page. This document's conventions date from that pass.

## Pass 2 — Sound gallery

Algorithmically designed sounds as a fourth collection. All encoding happens
offline; the site ships compressed audio + build-time SVG waveforms.

- **Formats:** dual-encode Opus 128 kbps (`.opus`) + AAC 160–192 kbps
  (`.m4a`) in `<audio><source>` order (Safari plays Ogg Opus since 18.4, AAC
  covers older iOS). Optional FLAC master as a download link — masters >25 MiB
  go to Cloudflare R2, compressed files live in `public/sounds/` (a 2-min
  Opus is ~2 MB; the Pages 25 MiB/file limit is far away).
- **Authoring script (one pass per sound):** ffmpeg encode (`-c:a libopus
  -b:a 128k` / `-c:a aac -b:a 192k`), BBC `audiowaveform` → peaks JSON
  (`winget install BBC.audiowaveform`), spectrogram thumbnail via librosa or
  `sox`/ffmpeg with the site palette, emit a frontmatter stub.
- **Collection schema:** title, date, technique tags, durationSec, sampleRate,
  seed/params (reproducibility is the differentiator — publish the generating
  code next to the sound), repo link, audio paths, peaks path, spectrogram
  image, draft.
- **Player:** build-time SVG waveform from peaks JSON (an Astro component;
  zero client JS for the visual) + one shared ~2 KB vanilla module for
  play/seek/progress with an "only one plays at a time" registry. Native
  `<audio>` in `<noscript>`. Skip wavesurfer.js.
- **Later sparkle:** an opt-in "synthesize in your browser" toggle — render
  the algorithm with a seeded PRNG into `OfflineAudioContext(2, 48000·dur,
  48000)` (fixed rate = deterministic across devices), created inside the
  click handler (autoplay policy).
- **RSS:** `@astrojs/rss` supports `enclosure: {url, length, type}` — point at
  the M4A, compute `length` with `fs.statSync`.

## Pass 3 — Photo gallery (Leica)

Originals never enter git; the repo stays tiny for life.

- **Pipeline:** Lightroom exports sRGB JPEG masters (quality 85–90, profile
  embedded, long edge ~3600 px) → offline Node script (`sharp` +
  `exiftool-vendored` — the only EXIF lib that decodes Leica MakerNotes) →
  AVIF+JPEG ladder at ~640/1080/1600/2560 → `rclone` to a Cloudflare R2
  bucket behind `photos.drishan.com` (zero egress fees) → script writes a
  committed `src/data/photos.json` manifest (dimensions, variant URLs, EXIF).
- **Why offline:** hundreds of images through `astro:assets` at build time
  risks Cloudflare's 20-minute build timeout, and Cloudflare Image
  Transformations hard-fail past 5,000 unique transforms/month on the free
  plan. Pre-generating on the 5090 box keeps builds instant and unmetered.
- **Color:** sRGB in, sRGB out is shift-free (sharp converts + strips
  profiles by default). If shipping Display-P3, use `withIccProfile('p3')` —
  `keepIccProfile()` has a known AVIF gamut bug (sharp #4008).
- **Collection:** `file('src/data/photos.json')` loader + Zod schema; albums
  are a field, not folders. EXIF renders in the existing `Readout` component
  (camera / lens / ISO / aperture — very field-guide).
- **UI:** CSS `columns` masonry now, `@supports (display: grid-lanes)`
  enhancement as it stabilizes; native `<dialog>` lightbox (~2 KB vanilla:
  `showModal()`, arrow keys, manifest dimensions to avoid CLS). PhotoSwipe 5
  only if pinch/zoom gestures become a requirement.

## Pass 4 — Discovery & sharing

- **Search:** Pagefind (1.5+ has a vanilla web-components UI). Most durable
  integration: `"build": "astro build && pagefind --site dist"` — it indexes
  built HTML, so it survives any framework change.
- **Per-post OG images:** template a raw SVG plate (reuse `Glyph.astro`
  SVGs + Fraunces) → render PNG with `@resvg/resvg-js` in a
  `src/pages/og/[...slug].png.ts` endpoint at build time. Skips satori's
  HTML-emulation quirks and matches the plate aesthetic exactly.
- **RSS upgrades:** full-content feed (feeds outlive sites) and per-topic
  feeds via `src/pages/topics/[topic]/rss.xml.js`.
- **JSON-LD:** Article + Person structured data in `BaseHead`.

## Pass 5 — Interactive tutorials & figures

When the first tutorial needs a demo (surface-code visualizer, Faust synth,
ZK verifier):

- **Widget runtime:** custom elements written directly in Markdown bodies
  (`<qec-surface-code data-distance="5">` with a static-image fallback
  child), upgraded by one lazy runtime in the layouts: IntersectionObserver →
  dynamic `import()` → `customElements.define()`. Each widget is its own
  hashed chunk. Never `<script>` inside `.md` (passes through unbundled).
- **WASM:** `?url` import + `instantiateStreaming` with arrayBuffer
  fallback; intersection-load ≤300 KB, click-to-load with a size label above
  that. Audio always behind a user gesture.
- **No site-wide COOP/COEP** (breaks giscus/embeds; Safari lacks
  `credentialless`). Nothing planned needs SharedArrayBuffer — Faust runs in
  an AudioWorklet, ZK verification is single-threaded. If ever needed, scope
  headers to `/lab/*` via `_headers`.
- **Figures:** generate offline, commit SVGs to `src/assets/figures/<slug>/`,
  keep the generating script + data in the project repo. Toolchain per class:
  Qiskit `circuit_drawer(output="mpl")` with a committed style dict; quantikz
  → `dvisvgm --font-format=woff2 --currentcolor` for showpiece circuits; one
  committed `fieldguide.mplstyle` (palette hexes, transparent bg,
  `svg.fonttype: none`) for plots; Stim's built-in SVG diagrams + a color
  remap for QEC lattices. Inline SVGs into pages so they inherit fonts and
  `currentColor`.
- **Benchmark posts:** add an optional `repro` frontmatter block (gpu,
  driver, cuda, versions, seed, wall-clock, repo/tag) rendered as readout
  rows; a small `provenance.py` helper in project repos writes it.

## Ongoing practice

- **Per-project GitHub repos** (not a monorepo) + `CITATION.cff`; mint a
  Zenodo DOI per release via the GitHub integration; plates link `repo` (+
  future `doi`).
- **Environments:** `uv.lock` per project repo (cuQuantum/Qiskit/Stim are all
  pip wheels); a short `Dockerfile` on an `nvidia/cuda` base as the
  decade-scale escape hatch.
- **Licensing (adopt in a footer pass):** prose CC BY 4.0, code MIT — declare
  in the footer, per-page meta, and the RSS channel.
- **Link rot:** `lycheeverse/lychee-action` weekly against built `dist/`;
  Wayback Machine snapshot cron fed from the sitemap.
- **Hosting:** Cloudflare Pages is being absorbed into Workers static assets
  (parity since Mar 2026, no forced deadline) — plan a calm migration within
  a year or two; `_redirects` carries over. Real insurance: `dist/` is plain
  HTML, portable anywhere in an afternoon.
- **Comments/analytics:** giscus (GitHub Discussions) once tutorials have
  readers — empty comment boxes look worse than none. Cloudflare Web
  Analytics or nothing; skip self-hosted analytics forever.
- **Typography (deferred):** if the fraktur itch returns, PragmataPro Fraktur
  is €49+ display-only (100k pageviews/mo cap + hotlink-protection
  obligation); test-drive the aesthetic free with UnifrakturMaguntia first,
  or spend $75 on Berkeley Mono (no caps) to swap the code voice instead.
  Body/heading trio stays.

## Project idea shelf

Verified against mid-2026 tooling. Each lands a plate + a series (+ a gallery
artifact where noted). ★ = suggested next.

1. ★ **One GPU, N Qubits** *(quantum × scicomp)* — the drafted flagship.
   cuQuantum 26.6 added cuPauliProp + cuStabilizer for "beyond 30 qubits"
   sequels; arc: setup → first sim → the memory wall → cuTensorNet → published
   scaling data.
2. ★ **Error correction you can actually run** *(quantum)* — Stim +
   PyMatching + Google's Tesseract decoder; threshold plots are embarrassingly
   parallel on 96 GB RAM; capstone: cost-of-a-logical-qubit calculator + a
   vanilla-JS surface-code widget.
3. ★ **Faust → WASM sound gallery** *(audio)* — physical-modeling synths
   compiled to AudioWorklet WASM; ships the Pass-2 gallery with content;
   autodiff capstone (fit a synth to a recording).
4. **The sound of decoherence** *(quantum × audio)* — cuDensityMat Lindblad
   dynamics sonified; Rabi as tremolo, decoherence as decay; feeds the gallery
   with sounds nobody else has.
5. **Build a quantum compiler** *(compilers × quantum)* — OpenQASM 3 → MLIR
   dialect (or xDSL) → passes (fusion, cancellation) → QIR → CUDA-Q; benchmark
   against Qiskit 2.x transpiler.
6. **Shor vs. Bitcoin** *(quantum × blockchain)* — Shor on cuQuantum for toy
   keys, honest ECDSA resource estimate, ML-DSA signatures in a 200-line
   chain.
7. **Concert hall in a GPU** *(audio × scicomp)* — room-acoustics FDTD in
   CUDA (memory-bandwidth-bound — GDDR7's home turf); auralized impulse
   responses for the sound gallery, wave renders for the photo gallery.
8. **A tiny audio DSL** *(compilers × audio)* — ~2k-line compiler, native +
   WASM backends, playable on the site.
9. **GPU ZK prover, browser verifier** *(blockchain × optimization)* — ICICLE
   MSM/NTT on the 5090 (public benchmarks mostly stop at 4090), whimsical
   proof, in-browser WASM verification widget.
10. **A RAW developer for the Leica gallery** *(graphics × photography)* —
    CUDA demosaic + tone map + physically-based grain; develops the Pass-3
    gallery and rhymes with the site's grain shader.
11. **Noisy circuits with PTSBE** *(quantum)* — CUDA-Q 0.14's new
    pre-trajectory sampling; near-zero competing content; short 3-part series.
