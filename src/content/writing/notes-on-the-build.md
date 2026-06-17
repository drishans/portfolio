---
title: Notes on building this
description: Why this site reads like an engraved field guide, ships zero JavaScript by default, and renders its hero with a hand-written shader instead of a stock library.
pubDate: 2026-06-02
tags: ['design', 'web', 'astro']
draft: true
---

Most engineering portfolios look the same right now, and it isn't the authors'
fault — it's the gravity of defaults. Pick a popular framework, accept its
starter template, reach for the component library everyone else reached for, and
you land on the same near-black page with one neon accent that a thousand other
people also landed on. The tooling is good. The sameness is the cost.

I wanted this one to come from somewhere specific, so I borrowed from the thing I
care about away from the keyboard: experimental bass, and the artwork that scene
wraps itself in.

## A field guide

An aesthetic I like looks like pages torn out of a 19th-century science book —
engraved botanical plates and star charts spliced with waveforms, spectra, and
polar plots, letterpressed in one or two inks. It's a strange, exact fusion: the
romance of an old almanac carrying the diagrams of sound. That turned out to be
the right frame for a portfolio spanning quantum, AI systems, and signal work,
because all of it is, at heart, measurement.

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
fractal noise in monochrome, with a faint teal-to-violet glow that tracks your
cursor. It's the one deliberately bold element, and it does triple duty: it reads
as a spectral field, it gestures at the quantum-field imagery I think about at
work, and it's a nod to the generative visuals I run for shows. It pauses when it
scrolls off-screen, falls back to a static gradient where WebGL isn't available,
and renders a single still frame for anyone who's asked their system to reduce
motion.

I wrote it by hand instead of dropping in a library for the same reason I did the
rest: a template can't be the memorable thing. The memorable thing has to be
specific to the person it belongs to.

If you want the build details -- the type system, the tokens, how the content
collections are wired -- the source is on GitHub. This is the first field note.
More to come.
