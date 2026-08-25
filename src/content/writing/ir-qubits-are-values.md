---
title: "Qubits are values, not registers"
description: The one data-structure choice that makes a quantum optimizer almost write itself. Qubits as SSA values, gates as pure functions, and the no-cloning theorem enforced by a linear-type verifier.
pubDate: 2026-07-08
tags: ['compilers', 'quantum', 'mlir', 'ssa', 'xdsl']
topics: ['compilers', 'quantum']
series:
  id: building-a-quantum-compiler
  part: 1
draft: true
---

I wanted to build a real optimizing compiler for quantum circuits: OpenQASM 3
in, optimized code out, benchmarked honestly against the tools people actually
use. The whole thing lives in one small repo,
[qcc](https://github.com/drishans/qcc), and this series walks it end to end.

The surprise, which is the subject of this first part, is that almost none of
the difficulty is in the optimizations. It's in the data structure you optimize
*over*. Pick the right intermediate representation and the passes turn into a
few lines each. Pick the obvious one and you spend all your time on bookkeeping
that has nothing to do with quantum computing.

## The obvious IR, and why it fights you

A circuit is usually written the way OpenQASM writes it: qubits are named
registers, and a gate mutates them in place.

```text title="bell.qasm"
qubit[2] q;
h q[0];
cx q[0], q[1];
```

Read literally, `h q[0]` reaches into a location called `q[0]` and changes it.
The circuit is a list of side effects on mutable cells. That's also how a
`QuantumCircuit` object stores its instruction list, and how the QIR we emit at
the end represents things at the machine level.

It reads fine. It optimizes badly. Ask the simplest possible optimizer question,
"what is the next gate acting on `q[0]`?", and there's no direct answer. You
scan forward through the instruction list, skipping every gate that touches
other qubits, until you find one that names `q[0]` again. Every peephole
rewrite starts with that scan. Worse, the thing that makes quantum circuits
quantum, the no-cloning theorem, is invisible here: nothing in the
representation stops you from writing a gate that reads `q[0]` twice, because
mutating a register twice is completely normal.

## The IR that helps: gates as pure functions

Borrow the idea classical compilers have used for forty years. Static Single
Assignment says every value is written exactly once; "updating" something means
producing a new value. Now apply it to qubits, which is the design behind
CUDA-Q's Quake dialect and the QIRO line of work on quantum SSA.

A qubit stops being a location you mutate. It becomes a *value* standing for the
state of one wire at one instant. A gate stops being a side effect and becomes a
pure function: it consumes the incoming qubit value and returns a fresh one for
the state afterward. Here is the same Bell circuit in qcc's dialect, printed by
the compiler:

```text title="the Bell pair as SSA, each %n is one wire-state"
%0 = qcc.alloc 0
%1 = qcc.alloc 1
%2 = qcc.h %0            // consumes %0, produces %2
%3, %4 = qcc.cx %2, %1  // consumes %2 and %1, produces two new values
```

The wire for qubit 0 is not the name `q[0]`. It's the chain of values
`%0 → %2 → %3`, threaded through the ops. Each value is used exactly once.

Three things fall out of this, and together they are the entire reason the rest
of the compiler is small.

**"The next gate on this wire" is a single pointer hop.** A gate produces a
value; in SSA that value has a list of *uses*, and here it has exactly one. That
one use *is* the next gate on the wire. No scanning, no skipping. The question
that had no direct answer in the register model is now one dereference. This is
why the cancellation, merging, and fusion passes in part 3 are about ten lines
apiece.

**No-cloning becomes a type rule you get for free.** Physics forbids copying an
unknown qubit state. In this IR, "copying a qubit" would mean two gates
consuming the same value `%n`. That is exactly what a *linear type* forbids: a
linear value must be consumed exactly once. So a law of quantum mechanics
becomes the same constraint compilers already use for file handles and unique
pointers. The verifier is the whole enforcement:

```python title="src/qcc/ir/dialect.py: no-cloning is one check"
for op in module.walk():
    for res in op.results:
        if res.type == qubit and len(tuple(res.uses)) > 1:
            raise ValueError(f"qubit value {res} is used more than once; "
                             "qubit values are linear")
```

In the register model you cannot even write this check, because the illegal
thing (two names aliasing one qubit) and the legal thing (operating on a
register repeatedly) look identical in the IR.

**Independence is explicit.** Two gates on different wires share no value, so the
IR states outright that they commute and can be reordered or run in parallel.
Two gates sharing a value are ordered by a true data dependency. No alias
analysis required; the def-use edges *are* the dependency graph.

## Why xDSL, and no LLVM in sight

"MLIR-style" needs a caveat, because real MLIR is a C++ framework that lives
inside the LLVM monorepo. Building an out-of-tree MLIR dialect means compiling
LLVM, writing the dialect in TableGen and C++, and driving it through CMake
before a single pass runs. Most of that effort is build infrastructure, not
compiler.

I used [xDSL](https://github.com/xdslproject/xdsl) instead: a Python library
that reimplements MLIR's core, the same dialects, ops, regions, SSA values,
traits, verifiers, and greedy pattern rewriter, and prints and parses the same
textual IR. You get the identical mental model and a design that ports back to
C++ MLIR later, without owning an LLVM build.

The trade is worth being explicit about. Staying in Python costs nothing at the
scale this compiler runs (part 4 shows it optimizing hundreds of gates faster
than a C++-cored tool). It would cost real time on circuits of millions of
gates, where MLIR's compiled passes pull ahead. That regime is a different
project. For a compiler you want to read and modify in an afternoon, the Python
version is the right tool, and the SSA design in this part is identical either
way.

## A dated note on xDSL's churn

xDSL moves fast and its op-definition API is the part most likely to have
shifted by the time you read this. As of xDSL 0.68 (July 2026), a constant on an
op class, like the gate name each op carries, must be an uppercase field with an
explicit `ClassVar` annotation, or the definition scanner rejects it as a
malformed operand:

```python title="the shape xDSL 0.68 wants"
class Gate1Op(IRDLOperation, abc.ABC):
    GATE_NAME: ClassVar[str]   # uppercase + ClassVar, or it won't load
```

If a future version changes the rule, the general recipe survives the specific
error message: any plain class attribute the IRDL scanner does not recognize as
an operand, result, or region must be marked so it reads as a constant rather
than IR structure. Find the scanner's list of accepted field kinds, and annotate
accordingly.

## Next

An IR is only as good as your confidence that lowering into it preserved the
circuit. Before writing a single optimization, I built the thing that proves it:
an independent reference simulator and a differential test harness that has
caught every real bug the compiler has had. That's part 2.
