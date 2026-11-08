---
title: wub
summary: A tiny compiled language for wobble bass, where the LFO rate knob is the syntax. A zero-dependency Rust compiler whose interpreter, C, and WebAssembly backends must agree bit for bit.
role: Solo build
stack: ['Rust', 'WebAssembly', 'DSP']
year: 2026
length: In progress
order: 6
glyph: spectrum
topics: ['compilers', 'audio']
repo: https://github.com/drishans/wub
draft: true
---

On a Korg Volca Bass you make a wub with one hand on the LFO rate knob,
switching between note divisions in time with the music. wub promotes that
gesture to syntax. Wobble rhythm is written the way you'd play it:

```text
tempo 140
wob = lfo(pat[8 8 8 16], tri)
```

Three beats of eighth-note wobble, one beat of sixteenths, looped. Standard
divisions give a whole number of LFO cycles per beat, so the wobble stays
locked to the beat without any retrigger logic.

## The engineering bet

The compiler is Rust with zero dependencies, and every patch must run three
ways that agree to the bit: a reference interpreter that *is* the language's
semantics, a C backend that emits a straight-line sample kernel, and a
WebAssembly backend that writes the module byte by byte, with no LLVM and no
emscripten, for an AudioWorklet on this site.

Bit-for-bit agreement is a determinism problem before it's a compiler
problem, so the signal path uses its own polynomial sine, tangent, and tanh
instead of libm, and the design doc records the two floating-point hazards
that would otherwise surface as phantom codegen bugs (fused multiply-adds in
C, phase drift in single precision). Every render writes a provenance
sidecar with the patch source, compiler version, and git SHA.

## Status

The front end and reference interpreter are done and render WAVs offline;
the WebAssembly backend is next, then a playable pattern pad on the site.
