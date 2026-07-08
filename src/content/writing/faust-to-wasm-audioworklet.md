---
title: The whole instrument is nine kilobytes
description: "One Faust source, two consumers: an offline renderer that performs the gallery pieces in Node, and an AudioWorklet build small enough to embed three instruments in a blog post with room to spare."
pubDate: 2026-07-04
tags: ['audio', 'wasm', 'faust', 'webaudio', 'audioworklet']
topics: ['audio', 'scicomp']
series:
  id: plucked-struck-blown
  part: 2
draft: true
---

Part 1 built three instruments in [Faust](https://faust.grame.fr): a
[wire, a bar, and a pipe](/writing/three-instruments-in-faust). This part is
about the unreasonable portability you get for free. The same sixty-line
`.dsp` file becomes both the studio that recorded the
[gallery](https://audio.drishan.com) pieces and a live instrument running in
your browser tab. Same physics, byte for byte.

The trick is that the Faust compiler itself has been compiled to WebAssembly,
so it runs anywhere Node or a browser does. No toolchain, no native builds;
`npm install` and you have a DSP compiler. On my machine each instrument
compiles in **40–120 ms** and renders **100–425× faster than realtime** on
one CPU core. The entire six-piece gallery album re-renders from source in
about six hundred milliseconds, which changes your relationship with
"final" mixes.

## The studio: scores as data, renders with provenance

The offline side is a ~150-line Node script that treats a piece as a
timeline of parameter events against one or more instrument instances:

```js
const breathTone = {
  slug: "breath-tone", dsp: "pipe", dur: 16,
  events: [
    { t: 0,    set:  { freq: 392, breath: 0.82, blow: 1 } },   // below speaking pressure: air
    { t: 1.2,  ramp: { param: "breath", to: 1.12, over: 2.5 } }, // the pipe finds the note
    { t: 4.0,  ramp: { param: "vibrato_depth", to: 0.04, over: 2.2 } },
    { t: 12.5, set:  { blow: 0 } },
  ],
};
```

The offline processor keeps DSP state across render calls, so the renderer
walks the timeline in 64-sample chunks (1.3 ms of scheduling resolution),
applying sets and linear ramps between chunks. Each voice is its own WASM
instance, because part 1 explains why a ringing modal bank must not be
retuned. Voices are summed, tail-trimmed at −72 dB, edge-faded,
peak-normalized to −1 dBFS, and written as 24-bit WAV by a forty-line
encoder with no dependencies.

Two habits from the quantum series carried over:

- **Every render gets a sidecar.** Next to each WAV lands a JSON with the
  full event list, level stats, pitch checks against expectation, the
  toolchain version, and the SHA-256 of the DSP source that produced it. A
  master you can't reproduce is a rumor.
- **The renderer is also the instrument tuner.** A 40-line FFT (Hann window,
  parabolic peak interpolation) measures every calibration render, which is
  how the pipe's bore factor in part 1 was found: sweep, measure, fit. The
  scripts that did it are committed next to the instruments they tuned.

## The stage: three worklets, one page

The browser side inverts the economics. You *could* ship the compiler and
build in the tab, the way the Faust IDE does. But you shouldn't make
readers download a compiler. Instead, a build step precompiles each `.dsp`
to a WASM module plus a JSON description of its parameters, and the page
instantiates them with a small runtime loader inside an `AudioWorklet`, so
the audio runs on its own thread, untouched by scroll jank.

The sizes are the story:

| artifact | size |
| --- | --- |
| `pluck` · the entire wire, physics and all | 9.9 KB |
| `bar` · nine modes, node lines, contact time | 8.9 KB |
| `pipe` · jet, bore, register and its manners | 9.9 KB |
| shared runtime loader (all three reuse it) | 190 KB |

Three complete instruments cost about 220 KB, inside the 300 KB budget I
keep for lazily loaded interactive figures on this site. All three worklets
instantiate in **50 ms** on first click. For comparison, a single decent
piano *sample* is larger than this entire orchestra.

The workbench page itself is deliberately dumb vanilla JS. It reads each
instrument's parameter metadata (name, range, step: the same `hslider`
declarations from part 1, round-tripped through the compiler) and generates
sliders, so the DSP source stays the single source of truth all the way to
the UI. Keys `a`–`k` play; pluck and bar tap, the pipe holds while you hold.
An `AnalyserNode` per instrument drives a peak meter, which is also how a
machine without ears verified the whole path end to end: instantiate,
trigger, measure the signal on the other side.

## Why bother with both?

Because they check each other. The offline render proves the DSP is
*correct*: you can FFT a WAV, fit its decay, grade it against design
values. The worklet build proves the DSP is *cheap*: three physical models
idling in a browser tab don't move the fan. When both consumers eat the same
source file, every improvement to the physics ships to the gallery and the
browser simultaneously, and neither can drift from the other.

Next: [the payoff for all this measurability](/writing/fit-a-bell-by-gradient-descent).
Hand a recording of the bar to a GPU and ask gradient descent to find the
physics, four thousand guesses at a time.
