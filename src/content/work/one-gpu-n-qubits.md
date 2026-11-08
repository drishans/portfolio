---
title: One GPU, N Qubits
summary: How far quantum circuit simulation goes on a single consumer RTX 5090, measured end to end with cuQuantum, from the statevector memory wall to tensor-network contraction past 100 qubits.
role: Solo build
stack: ['Python', 'CUDA', 'cuQuantum', 'CuPy', 'Qiskit']
year: 2026
order: 4
glyph: polar
topics: ['quantum', 'scicomp']
repo: https://github.com/drishans/one-gpu-n-qubits
draft: true
---

A benchmark suite and a five-part write-up answering one question: how big a
quantum circuit can one consumer graphics card simulate, at a desk, with no
cluster? Every number comes from scripts in the repo, stamped with the driver,
library versions, and git SHA that produced it.

## What it found

**The gate is a memcpy.** A statevector simulator stores all $2^n$ amplitudes
and rewrites them for every gate, so it runs at the speed of memory, not
arithmetic. One-qubit gates sustained about 1.45 TiB/s effective, 87% of the
card's paper bandwidth, flat across six doublings of state size. Thirty qubits
in double precision is the comfortable ceiling.

**The wall is soft.** Past the card's 31.8 GiB the driver no longer refuses
the allocation; it quietly pages the state over PCIe. The first spilled qubit
costs 7× per gate and the second 72×. The cliff is priced in bytes, not
qubits: fp32 hits it one qubit later at exactly the same cost. CUDA's own
managed memory, the official tool for this job, measured slower than the
automatic spill at every size on WSL2.

**Width is free, depth is not.** Tensor-network contraction with cuTensorNet
never stores the state. A 100-qubit GHZ amplitude came back in 4.1 ms, correct
to six digits. Deep random circuits at a fixed 32 qubits climbed nine orders
of magnitude in cost instead: the exponential always collects, it just
changes currency.

## Why it's built this way

Benchmarks lie quietly. Timing uses CUDA events, never the wall clock; every
result is a JSON with provenance; and the memory-wall script refuses to start
on a busy GPU after an overlapping run poisoned a whole dataset mid-series.
