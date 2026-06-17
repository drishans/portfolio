---
title: QuDaQ
summary: Quantum data acquisition and instrument control tooling for benchmarking real cryogenic superconducting hardware at NIST Boulder.
role: Research contribution
stack: ['Python', 'Qiskit', 'NumPy', 'Randomized Benchmarking']
year: 2024
length: '~10 months'
order: 1
glyph: polar
draft: false
---

QuDaQ was the data-acquisition and instrument control layer behind a quantum
benchmarking effort at NIST Boulder. The job was unglamorous and essential:
turn noisy, hardware-level measurements into numbers you can actually trust and
reason about.

## The problem

Characterizing a quantum processor means running a lot of carefully constructed
circuits, collecting shot statistics, and fitting them to models of how the
hardware misbehaves. The hard part isn't any single step — it's that every step
leaks error. Calibration drifts between runs. Fit routines quietly diverge on
edge cases. A clean-looking decay curve can hide a systematic bias that makes the
final fidelity number meaningless.

## The approach

I worked on the acquisition and analysis pipeline that sat between the control
stack and the results: generating randomized-benchmarking and randomized-compiling
sequences, orchestrating their execution, and fitting the resulting decays to
extract error rates. The emphasis throughout was on *defensible* numbers —
surfacing when a fit was unreliable rather than reporting a confident-looking
value, and keeping the path from raw shots to published metric legible enough
that someone else could audit it.

> The instinct I took from this: a measurement you can't trace back to its
> assumptions isn't a measurement, it's a vibe.

## What came out of it

A reusable characterization workflow that made the team's benchmarking runs
reproducible and easier to interrogate. {TODO: Add a concrete result here — e.g. the
specific protocols supported, a throughput improvement, or a publication /
internal report this fed into.}
