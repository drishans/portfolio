---
title: Notes on building this
description: Why this site reads like an engraved field guide, ships zero JavaScript by default, and renders its hero with a hand-written shader instead of a stock library.
pubDate: 2026-06-07
tags: ['design', 'web', 'astro']
draft: false
---

So the site is built as a field guide. Projects are *plates* — numbered, because a
field guide is a sequence, and because a "plate" is also what you cut a record to.
Writing is *field notes*. Project metadata is set like an instrument readout, and
each plate carries a small diagram — a waveform, a contour, a polar plot — drawn
from scratch rather than lifted. The palette is a single near-black ground with one
luminous teal accent, plus a violet note that only surfaces in the field behind my
name.

## Zero JavaScript, on purpose

The site is built with Astro and ships as static HTML with no client-side
framework. Every page is plain HTML and CSS — no hydration, no runtime, nothing to
boot. That's not asceticism, it's the right tool: a portfolio is mostly text
someone skims on a laptop, and the fastest, most durable version of that is a
document, not an app.

The one place I spent the interactivity budget is the hero.

## A shader, not a stock animation

The field behind my name is a hand-written WebGL fragment shader — domain-warped
fractal noise in monochrome, with a faint amber-to-violet glow that tracks your
cursor. It's the one deliberately bold element, and it does triple duty: it reads
as a spectral field, it gestures at the quantum-field imagery I think about at
work, and it's a nod to the generative visuals I run for shows. It pauses when it
scrolls off-screen, falls back to a static gradient where WebGL isn't available,
and renders a single still frame for anyone who's asked their system to reduce
motion.

I wrote it by hand instead of dropping in a library for the same reason I did the
rest: a template can't be the memorable thing. The memorable thing has to be
specific to the person it belongs to.

If you want the build details (the type system, the tokens, how the content
collections are wired) the source is on GitHub. This is the first field note.
More to come.
