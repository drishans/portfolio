---
title: Durga Puja Stage Visuals
summary: Live visuals for a Durga Puja DJ and Dandiya night on a 1248×540 LED wall. Seven hand-written GLSL shaders, generated stills and loops, and beat-cut DJ title takeovers, run in Resolume and Wire.
role: Visuals
stack: ['GLSL', 'ISF', 'Wire', 'Resolume', 'ComfyUI']
year: 2026
order: 5
glyph: contour
topics: ['graphics']
repo: https://github.com/drishans/durga-visuals
draft: true
---

A stage-visuals package for a live Durga Puja night: DJ sets and Dandiya on a
1248×540 LED wall. The brief after the organizer meeting was energetic
abstract motion, beat-driven cuts, color changes, and DJ names that take over
the whole wall.

## What I built

**Seven shaders, written to be played.** GoldenFlow, LiquidGold, GoldDust,
GoldRibbons, PrismField, PrismaticTitle, and DiamondKaleidoscope, each an
editable ISF/GLSL file with its performance controls exposed, so a knob in
Resolume or Wire moves something musical rather than something technical.
DiamondKaleidoscope runs as an effect on any source, including a live camera
on the crowd.

**A generated image library.** 39 stills and 11 loops from local ComfyUI
workflows, with every prompt and workflow kept in the repo so any frame can be
regenerated or varied later. Model weights stay out of git.

**Titles that take over.** Transparent title art for each DJ plus a
PrismaticTitle shader, so a name can punch through the wall on a cue and fall
back out of the way.

**A handoff someone else can run.** A Wire + GLSL tutorial, a layer plan, and
a rehearsal plan that tests camera framing, routing, and latency before
anything decorative. The repo is the show's source of truth; show media
lives outside it.

<!-- TODO(drishan): one or two sentences on how the night went, ideally with
a photo or clip from the wall. Not in the repo, so not invented here. -->
