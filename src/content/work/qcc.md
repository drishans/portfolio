---
title: qcc
summary: A small optimizing quantum compiler. OpenQASM 3 to an MLIR-style SSA dialect, peephole passes, QIR, and CUDA-Q execution, benchmarked against the Qiskit and pytket transpilers.
role: Solo build
stack: ['Python', 'xDSL', 'OpenQASM 3', 'QIR', 'CUDA-Q']
year: 2026
length: 'ongoing'
order: 2
glyph: phases
topics: ['compilers', 'quantum']
repo: https://github.com/drishans/qcc
draft: true
---

qcc is a working optimizing compiler for quantum circuits, built small enough
to read end to end. It takes OpenQASM 3 in, lowers it to an MLIR-style
intermediate representation, runs peephole optimization passes, and emits QIR
that runs on CUDA-Q. Then it measures itself against the Qiskit transpiler and
pytket on the same circuits.

## Why build one

Production quantum compilers are large and their cleverness is buried under
device models, coupling maps, and pass hierarchies. I wanted the opposite: the
smallest thing that is honestly a *compiler*, with a real IR and verifier, real
optimization passes, and a real backend, small enough that you can hold the
whole pipeline in your head and see exactly where each gate goes.

## The one idea that does the work

Qubits are SSA values, not registers. Every gate consumes its qubit values and
produces new ones, so the wire is a chain of values threaded through the ops.
"The next gate on this wire" becomes a single def-use lookup, every peephole
optimization becomes a local rewrite, and the no-cloning theorem falls out as a
linearity rule the verifier checks for free. It's the design behind CUDA-Q's
Quake dialect, shrunk to its core.

## What it does, measured

On ten benchmark suites (GHZ, QFT, QAOA, random Clifford+T, a hardware-efficient
ansatz, a ripple-carry adder), four families of local rewrite match or beat the
Qiskit transpiler's `-O2`/`-O3` total gate count on eight of ten, at a fraction
of pytket's compile time. The honest gap is two-qubit-block resynthesis, which
this compiler doesn't attempt, and which is exactly where the other two win
the cases qcc loses. The
[companion series](/series/building-a-quantum-compiler/) walks the whole build,
and every number traces to a committed benchmark JSON in the repo.
