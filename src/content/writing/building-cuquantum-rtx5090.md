---
title: How far does a single RTX 5090 get you in quantum simulation?
description: Statevector simulation is a memory problem before it's a compute problem. Here's what 32 GB of consumer GDDR7 and cuQuantum actually buy you.
pubDate: 2026-05-28
tags: ['quantum', 'gpu', 'cuda']
topics: ['quantum', 'scicomp']
series:
  id: one-gpu-n-qubits
  part: 1
draft: true
---

There's a particular kind of fun in pointing expensive consumer hardware at a
problem it was never marketed for. I have an RTX 5090 that nominally exists for
games and AI workloads, so the obvious question was: how big a quantum circuit
can I *actually* simulate on it, on my desk, without touching a cluster?

The answer is more interesting than a single number, because statevector
simulation hits a wall that has almost nothing to do with how fast the GPU is.

## The exponential lives in memory, not in time

A full statevector simulation represents the quantum state of `n` qubits as a
vector of `2^n` complex amplitudes. Every amplitude is a complex number. That
vector is the entire game, and it doubles in size with every qubit you add.

In double precision (complex128, 16 bytes per amplitude):

- 28 qubits → ~4.3 GB
- 29 qubits → ~8.6 GB
- 30 qubits → ~17.2 GB
- 31 qubits → ~34.4 GB

The 5090 has 32 GB of GDDR7. So before you've thought about gate speed at all,
the memory math has already decided your ceiling: right around **30 qubits** in
double precision, with a little headroom for workspace. Drop to single precision
and you buy roughly one more qubit. That's it. One qubit costs a doubling, and no
amount of GPU horsepower changes the size of the vector you have to store.

This is the thing people miss about statevector methods: the GPU isn't slow, the
state is just enormous. Compute is what you optimize *after* you've fit the state
in memory.

## Where cuQuantum comes in

NVIDIA's cuQuantum (specifically cuStateVec) is the library that makes the
on-device math fast once the state fits. Applying a gate is, under the hood, a
structured pass over that giant amplitude array, and the win is that these passes
are exactly the kind of memory-bandwidth-bound, massively parallel work a GPU is
built for. GDDR7 bandwidth on the 5090 is the resource that actually gets spent
per gate.

The practical takeaway: once you're GPU-resident, your runtime is dominated by
how many times you have to stream the whole statevector through memory — which
means circuit *depth* and gate locality matter as much as qubit count.

## What I measured

{This is where your numbers go. Run a benchmark sweep — e.g. a layered random
circuit or a QFT — across 24–30 qubits and record per-gate or per-layer timing in
both fp32 and fp64. A small table here of "qubits vs. wall-clock per layer" is the
whole point of the post and the thing readers will remember.}

A few things worth calling out once you have the data:

- The jump from "fits in VRAM" to "doesn't" is a cliff, not a slope. 30 qubits
  runs; 31 falls off the edge into host memory and the performance collapses.
- fp32 vs fp64 isn't just a memory trade — bandwidth-bound kernels move half the
  bytes, so single precision can be meaningfully faster, if your circuit tolerates
  the reduced precision.

## Why this is worth doing on consumer hardware

Not because you're going to out-simulate a supercomputer — you're capped at ~30
qubits and that's a hard cap. It's worth doing because that 30-qubit envelope
covers an enormous amount of real algorithm development, debugging, and intuition
building, and you can do all of it on a machine you already own, with a fast
iteration loop and no queue.

The frontier of quantum *advantage* is past where any classical simulator can
follow. But the frontier of quantum *learning* fits comfortably on a desk, and
the same GPU that trains your models will happily run your circuits between jobs.
