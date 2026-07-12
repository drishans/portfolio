# Roadmap

The long-term plan for this site. Each pass is independently shippable and
ordered by value. Architecture notes are pre-researched so a future work
session can start building instead of investigating. Refreshed July 2026
after Passes 1 through 5 shipped.

## Standing decisions

- **Paths, not subdomains** for topics (`/topics/<slug>/`). One domain
  compounds SEO authority and identity. The two art galleries are the
  deliberate exception (audio./photos.drishan.com): personal work, separate
  rooms, one shared `gallery` repo. *Escape hatch:* if a topic ever becomes
  a product with its own app, split that one then and add `_redirects`.
- **URLs are forever.** Never delete or rename a published path; add a 301
  in `public/_redirects`. Slugs stay date-free.
- **Zero client-side frameworks, forever.** Interactivity is vanilla JS /
  WebGL / WASM. Heavy computation happens offline on the desktop (RTX 5090,
  96 GB RAM); the site ships the artifacts.
- **The build is the test suite**, locally and in CI (build workflow runs
  on every PR). Check `/writing/kitchen-sink` (permanent draft) after any
  rendering-stack change.
- **Series live inside Writing.** Adding a topic is one line in `TOPICS`.
- **Claude scaffolds, Drishan publishes.** Drafts only, private repos until
  a series ships. Workflows live in `.claude/skills/`; prose rules in
  CLAUDE.md. Projects live in `code\<domain>-projects\<name>`, one repo
  each, never in this repo.

## Shipped (the first five passes, July 2026)

1. **Platform + tutorial stack**: draft filtering, topics, series, build-time
   MathML, Expressive Code, stable numbering, kitchen sink.
2. **Sound gallery** (audio.drishan.com): grid → dialog slideshow, build-time
   peaks scrubbers, ridge-line tiles, Opus+AAC pipeline, mobile hardening.
3. **Photo gallery** (photos.drishan.com): AVIF/WebP/JPEG ladders on R2 at
   media.drishan.com, EXIF readouts, 3840px download rung.
4. **Per-post OG cards**: plate-aesthetic PNGs at build time via resvg,
   one per published note and plate.
5. **Widget runtime + /lab pattern**: custom elements in Markdown, lazy
   IntersectionObserver upgrade, first tenant `<psb-workbench>` (the three
   Faust instruments live inside series part 1).

Published series: *One GPU, N Qubits* (5 parts, repo public) and *Plucked,
Struck, Blown* (3 parts, repo public).

## Loose ends (do before any new pass)

- **Audition and hang the seven real gallery pieces** — they are still
  `draft: true` while the published series points readers at the gallery,
  which currently shows the three test fixtures. Flip per piece after
  listening; retire or keep one fixture as a render test.
- **Publish the Plucked, Struck, Blown work plate** (`draft: true` today, so
  the flagship series has no plate) and consider adding `project:` links to
  both series yamls now that plates can exist.
- Delete the stray `old-cuquantum-wsl2-setup.md` draft (git history keeps it).
- Review PR #9 (Building a Quantum Compiler series drafts; qcc repo stays
  private until part 1 publishes).

## Pass 6 — Discovery (the rest of old Pass 4)

- **Search:** Pagefind (vanilla web-components UI). Most durable
  integration: `"build": "astro build && pagefind --site dist"` — it indexes
  built HTML, so it survives any framework change.
- **Full-content RSS** (feeds outlive sites) and **per-topic feeds** via
  `src/pages/topics/[topic]/rss.xml.js`.
- **JSON-LD:** Article + Person structured data in `BaseHead`.
- **Gallery share polish:** og:image + apple-touch-icon per room (needs a
  1200×630 asset each; natural once real photos hang).

## Pass 7 — Trust & longevity

- **Licensing footer:** prose CC BY 4.0, code MIT — footer, per-page meta,
  RSS channel.
- **Link rot:** `lycheeverse/lychee-action` weekly against built `dist/`;
  Wayback snapshot cron fed from the sitemap.
- **Zenodo DOIs** for the public project repos (GitHub integration; plates
  link `repo` + future `doi`).
- **Comments:** giscus once tutorials have readers; empty boxes look worse
  than none. **Analytics:** Cloudflare Web Analytics or nothing.
- **Hosting:** Pages → Workers static assets migration, calmly, within a
  year or two; `_redirects` carries over.

## Pass 8 — The rooms get real

- First real Leica batch through `add-photo` (Lightroom recipe in the
  gallery README); masonry vs uniform grid decided with real photos on the
  wall.
- Field recordings and future project sounds through `add-sound`; the
  gallery grows a `sounds RSS with audio enclosures` when there are enough
  pieces to subscribe to.
- About page gets a photograph of the author. Engineers trust the writing;
  everyone else looks for a face.

## Ongoing practice

- Per-project repos + `CITATION.cff`; uv.lock committed; provenance JSON
  stamped into every result; figures via `fieldguide.mplstyle`.
- Distribution once a series completes: HN submission + one X post + one
  LinkedIn post, register rules in the `share-note` skill. The blog and RSS
  are the durable assets; social points at them.
- Typography itch (PragmataPro Fraktur, Berkeley Mono): unchanged verdict,
  test free alternatives first, body trio stays.

## Project idea shelf

★ = suggested next. Each lands a plate + a series (+ gallery artifacts
where noted).

**Shipped or in flight:**
1. ~~One GPU, N Qubits~~ — shipped (5 parts, public repo).
2. ~~Faust → WASM sound gallery~~ — shipped (3 parts, playable workbench,
   public repo); the structured-model fit (f0 + stretch law + damping law,
   3 functions instead of 72 free parameters) is the natural part 4.
3. **Build a quantum compiler** *(compilers × quantum)* — in flight: qcc
   repo (QASM3 → xDSL → QIR → CUDA-Q) built, series drafted in PR #9.
4. **A tiny audio DSL** *(compilers × audio)* — in flight: `wub` (Rust,
   wobble-bass rate-pattern language, M0 done; staged pad → editor-widget
   plan). Lands a /lab widget when playable.

**Next up:**
5. ★ **Error correction you can actually run** *(quantum)* — Stim +
   PyMatching + Tesseract; threshold plots via sinter across all cores;
   capstone: cost-of-a-logical-qubit calculator + surface-code widget on
   the Pass 5 runtime. Kickoff prompt ready:
   `C:\Users\drishan\code\PROMPT-qec-project.md`.
6. **The sound of decoherence** *(quantum × audio)* — cuDensityMat Lindblad
   dynamics sonified; Rabi as tremolo, decoherence as decay; feeds the
   gallery with sounds nobody else has.
7. **Concert hall in a GPU** *(audio × scicomp)* — room-acoustics FDTD in
   CUDA (memory-bandwidth-bound, GDDR7's home turf); auralized impulse
   responses for the sound gallery.
8. **Shor vs. Bitcoin** *(quantum × blockchain)* — Shor on cuQuantum for toy
   keys, honest ECDSA resource estimate, ML-DSA signatures in a 200-line
   chain.
9. **GPU ZK prover, browser verifier** *(blockchain × optimization)* —
   ICICLE MSM/NTT on the 5090, whimsical proof, in-browser WASM verifier
   widget.
10. **A RAW developer for the Leica gallery** *(graphics × photography)* —
    CUDA demosaic + tone map + physically-based grain; develops Pass 8 and
    rhymes with the site's grain shader.
11. **Noisy circuits with PTSBE** *(quantum)* — CUDA-Q pre-trajectory
    sampling; near-zero competing content; short 3-part series.
