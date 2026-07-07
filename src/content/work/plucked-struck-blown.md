---
title: Plucked, Struck, Blown
summary: Three physical-modeling instruments in ~60 lines of Faust each, compiled to 9 KB AudioWorklet WASM, performed offline into a sound gallery, and reverse-engineered by batched gradient descent on a 5090.
role: Everything
stack: ['Faust', 'WebAssembly', 'AudioWorklet', 'Node', 'PyTorch', 'CUDA']
year: 2026
length: 'one long night, then curation'
order: 5
glyph: contour
topics: ['audio', 'scicomp']
repo: https://github.com/drishans/plucked-struck-blown
draft: true
---

One instrument per way of making an object vibrate: a plucked wire (extended
Karplus–Strong with pick position, hardness, and dispersion as physical
knobs), a struck bar (nine-mode modal synthesis at free–free ratios, mallet
hardness as contact time), and a blown pipe (Cook's jet–bore slide flute,
calibrated by measurement to the register it actually speaks in). Each is
about sixty lines of Faust; every parameter points at something on the real
object.

## What made it a project instead of a patch

**The measurements.** The bar's designed decay times are recovered to three
significant figures from its own renders ($t_{60}$ 10.00 s designed, 10.02 s
measured). The pipe refused its written pitch until a two-parameter grid
search revealed the loop speaks on its m = 1 odd mode at $3\,\mathrm{SR}/2D$,
which turns out to be exactly the uncommented `0.66666` in STK's flute,
measured rather than inherited.

**One source, two stages.** The same `.dsp` files feed an offline Node
renderer (recipes as event timelines, one WASM instance per voice, sidecar
JSON provenance with the DSP's SHA-256 next to every master) and a browser
workbench (precompiled WASM in an `AudioWorklet`, ~9 KB per instrument,
sliders generated from the compiler's own parameter metadata). Six pieces
rendered this way hang in the [sound gallery](https://audio.drishan.com).

**The capstone.** A differentiable copy of the modal bar, a bank of damped
sinusoids under a multiscale spectral loss, is fitted to recordings by
running thousands of random initializations in parallel on the GPU and
letting the best survivors refine. Against the bar's answer key the fit
recovers mode frequencies to within a few cents; pointed at the *string*, a
model it can't exactly represent, the recovered partials trace the
dispersion stretch the allpasses were designed to cause.

The series walks through all of it:
[the instruments](/writing/three-instruments-in-faust),
[the toolchain](/writing/faust-to-wasm-audioworklet),
[the fit](/writing/fit-a-bell-by-gradient-descent).
