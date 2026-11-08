# Roadmap

Refreshed August 2026. The construction era is over: five platform passes,
three published series (One GPU N Qubits, Plucked Struck Blown, Building a
Quantum Compiler), two galleries, a widget runtime, share cards, CI, and
agent skills. This document therefore stopped being a build plan and became
two things: an **operating rhythm** for a publishing practice, and four
**tracks** of parallel work you pull from by appetite, not sequence.

## Standing decisions

- **Paths, not subdomains** for topics; the two art galleries
  (audio./photos.drishan.com) are the deliberate exception.
- **URLs are forever.** Never delete or rename a published path without a
  301 in `public/_redirects`. This applies to *unpublishing* too: a plate
  taken off the wall still owes its URL a redirect.
- **Zero client-side frameworks.** Interactivity is vanilla JS / WebGL /
  WASM; heavy computation happens offline on the desktop; the site ships
  artifacts.
- **The build is the test suite**, locally and on every PR. Kitchen sink
  after rendering-stack changes.
- **Claude scaffolds, Drishan publishes.** Drafts only; project repos are
  private until their series ships, then public the day part 1 goes live.
- **Agent parity.** The house rules live twice by design: CLAUDE.md +
  `.claude/skills/` and AGENTS.md + `.agents/skills/`. Any rule or skill
  change lands in both in the same commit.
- Projects live in `code\<domain>-projects\<name>`, one repo each, with
  provenance-stamped results. Notes cite only committed numbers.

## The operating rhythm

The loop that replaced the passes. One turn of the crank per project:

1. Build and measure in the project repo (`new-project-repo` skill).
2. Draft the series + plate (`draft-note`), figures from provenance data.
3. Voice pass, then publish roughly a part per day (`publish-note`),
   repo public on day one.
4. Distribution once, after the final part (`share-note`): HN, one X post,
   one LinkedIn post. Space series launches at least a fortnight apart.
5. Gallery grows whenever a project throws off sound or image artifacts.
6. Quarterly: `site-audit`, which ends by updating this file.

The site's compounding loop is: findable notes bring readers, readers make
the next series worth distributing, distribution makes the site findable.
Right now the loop leaks at step 4: three series have shipped and none has
ever been submitted anywhere. The HN debut is still unfired ammunition;
spend it on the strongest card (the playable Faust series), then qcc.

## Debts (pay before pulling new work)

- Delete the stray `old-cuquantum-wsl2-setup.md` draft.
- Land the open KAK resynthesis part (PR #13) into the qcc series.

Paid in August: qcc repo public and its series links whole again; the
seven real pieces hung in the sound gallery (fixtures retired to
permanent draft render tests); 301s added for the retired qudaq and
woodsideprism plate URLs.

## Track: Reach

Make the existing corpus findable and durable. All old Pass 6/7 items,
none started, all small.

- Pagefind search (`astro build && pagefind --site dist`; indexes built
  HTML, survives any framework change).
- Full-content RSS + per-topic feeds (`topics/[topic]/rss.xml.js`).
- JSON-LD (Article + Person) in BaseHead.
- Licensing footer: prose CC BY 4.0, code MIT, declared in footer + RSS.
- lychee link-rot action weekly against `dist/`; Wayback cron off the
  sitemap. Zenodo DOIs for the three public project repos.
- giscus when a post first draws real readers; Cloudflare analytics or
  nothing.

## Track: Rooms

- The first real Leica batch through `add-photo`; masonry vs uniform
  decided with real photos. (The photo room still shows its three seeded
  fixtures; hide them the day real prints hang.)
- Gallery og:image + apple-touch-icon per room once real work hangs.
- Sounds RSS with audio enclosures (podcast plumbing for free).
- **Reruns**: every sound is deterministic, and its sidecar already stores
  the recipe; print the exact regeneration command on each slide. Sheet
  music for machines; no other gallery can do this.
- About page gains a photograph of the author.

## Track: Lab

The widget runtime (Pass 5) has one tenant. Make the lab a place.

- `/lab/` index page: every interactive widget as a collectible
  instrument, one card each, in the plate aesthetic. Enter it in NAV when
  it holds three or more.
- Tenants, in rough order of cheapness: the psb workbench (live today
  inside the Faust series), a port of the already-public
  `bloch-sphere-playground`, the wub pattern pad (see shelf), the QEC
  surface-code widget + logical-qubit calculator (arrives with the QEC
  series).

## Track: Crossovers

The projects have started to rhyme; the estate can play itself. These are
the outside-the-box pieces, each cheap because both halves already exist.

- **wub × psb**: the wub pattern language sequencing the three physical
  models in one page. Both are WASM; the result is a playable groovebox
  inside a field note, and the natural finale of the wub series.
- **The sound of decoherence** (shelf №6) is the quantum-audio bridge:
  Lindblad dynamics sonified into gallery pieces nobody else has.
- **The Ledger**: an annual page generated from the provenance JSONs
  across every project repo; every measured number of the year in one
  table, regenerated by script. The site's own lab notebook, audited.
- **Colophon** (`/colophon/`): the one-machine story. Offline rendering on
  the 5090, provenance sidecars, deterministic renders, the toolchain.
  The making-of is itself field-guide material.
- **RAW developer** (shelf №9) develops the Leica gallery and rhymes with
  the site's grain shader: the same machine that measures qubits develops
  the film.

## Project shelf

★ = suggested next. Each lands a plate + a series (+ gallery artifacts
where noted).

**Shipped:** One GPU N Qubits · Plucked Struck Blown · Building a Quantum
Compiler (KAK part in flight; structured-model fit remains psb's natural
part 4).

**In flight:**
1. **wub** *(compilers × audio)*, public repo, M0 done, unwritten. The
   cheapest series on the shelf: the language exists, the plan (pad →
   editor widget) exists, and it ends in the wub × psb crossover.

**Next:**
2. ★ **Error correction you can actually run** *(quantum)*: Stim +
   PyMatching + Tesseract, sinter across all cores, capstone calculator +
   surface-code widget on the Lab runtime. Kickoff prompt ready:
   `C:\Users\drishan\code\PROMPT-qec-project.md`.
3. **The sound of decoherence** *(quantum × audio)*, see Crossovers.
4. **Concert hall in a GPU** *(audio × scicomp)*: FDTD room acoustics,
   auralized impulse responses for the gallery.
5. **Shor vs. Bitcoin** *(quantum × blockchain)*.
6. **GPU ZK prover, browser verifier** *(blockchain × optimization)*.
7. **A RAW developer for the Leica gallery** *(graphics × photography)*,
   see Crossovers.
8. **Noisy circuits with PTSBE** *(quantum)*: short 3-part series.

## Ongoing practice

CITATION.cff + uv.lock per repo; figures via `fieldguide.mplstyle`;
Pages → Workers migration calmly within the year (`_redirects` carries
over); typography itch unchanged (test free fraktur before spending).
