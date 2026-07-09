---
title: "Four rewrites and one hard lesson about ordering"
description: The qcc optimizer is four local def-use rewrites that cancel inverses, merge rotations, fuse single-qubit runs by ZYZ, and push gates through what they commute with. The commutation pass is where I learned a locally good rewrite can be globally bad.
pubDate: 2026-07-08
tags: ['compilers', 'quantum', 'optimization', 'rewriting']
topics: ['compilers', 'quantum']
series:
  id: building-a-quantum-compiler
  part: 3
draft: true
---

With an IR that makes "next gate on this wire" a pointer hop (part 1) and an
oracle that catches wrong rewrites instantly (part 2), the optimizer itself is
almost anticlimactic. It's four families
of local rewrite, each a short pattern over def-use edges, iterated to a
fixpoint. Passes live in
[`src/qcc/passes`](https://github.com/drishans/qcc/tree/main/src/qcc).

The last of the four is where the interesting failure lived, so I've saved it
for the end.

## Cancel adjacent inverses

The simplest rewrite: if a gate is immediately followed, on the same wire, by
its inverse, both vanish. `H·H`, `X·X`, and the like are self-inverse;
`S·S†` and `T·T†` are adjoint pairs. "Immediately followed on the same wire"
is the phrase the IR makes trivial: it's just the sole use of the gate's result
value.

```python title="the entire cancellation check"
partner = ADJOINT[op.gate_name]          # h→h, s→sdg, t→tdg, ...
nxt = sole_user(op.qout)
if isinstance(nxt, Gate1Op) and nxt.gate_name == partner:
    rewriter.replace_all_uses_with(nxt.qout, op.qin)   # splice both out
    rewriter.erase_op(nxt); rewriter.erase_op(op)
```

Two-qubit gates get the same treatment, with a wrinkle: `CX·CX` cancels only if
the second has the same control and target, while `CZ` and `SWAP` are symmetric
and cancel even when the wires are swapped. The verifier from part 2 keeps this
honest; get the orientation wrong and the differential test fails on the next
run.

## Merge rotations, drop the zeros

Same-axis rotations add: $R_z(\alpha)\,R_z(\beta) = R_z(\alpha+\beta)$, and
likewise for the other axes and the phase gate. Adjacent same-axis rotations
collapse to one, and if the merged angle is $0 \bmod 2\pi$ the gate disappears
entirely (legal because we work up to global phase, as part 2 argued). A long
chain of tiny rotations becomes a single gate or nothing at all.

## Fuse single-qubit runs into one gate

This is the workhorse. Any maximal run of single-qubit gates on one wire,
however long, is one $2\times 2$ unitary, and every $2\times 2$ unitary is a
single `u3` up to global phase. So multiply the run out and resynthesize.

The resynthesis is the standard ZYZ Euler decomposition. Strip the global phase
to land in $SU(2)$, then any such $V$ factors as

$$
V = R_z(\phi)\,R_y(\theta)\,R_z(\lambda),
\qquad
u_3(\theta,\phi,\lambda) = e^{i(\phi+\lambda)/2}\,V,
$$

which reads the three angles straight off the matrix entries. A run of five
gates, a run of fifty, all become one `u3`. If the product is the identity up to
phase, the run vanishes. The payoff is concrete: `H·S·H` is three "nice" gates
that fusion turns into one float-angled rotation, and a hidden identity like
`SX·SX·X` (since $SX^2 = X$) collapses to nothing.

```text title="uv run qcc compile examples/redundant.qasm --stats"
before: 13 gates
after:   2 gates          # a Bell pair, and nothing else survives
verified: optimized ≡ original (up to global phase)
```

## Push gates through what they commute with

The three passes above only fire on *adjacent* gates. The commutation pass
creates adjacency that wasn't there, by sliding a gate past a two-qubit gate it
commutes with. Two facts do the work: a diagonal gate ($Z$, $S$, $T$, $R_z$)
commutes through the *control* of a `CX` and through either wire of a `CZ`; an
$X$-type gate ($X$, $R_x$, $SX$) commutes through the *target* of a `CX`. Push
the gate to the far side and the passes above get a fresh neighbor to work with.

The motivating pattern is a rotation trapped between two CXs that would cancel if
it weren't in the way:

$$
\text{CX}\;\; R_z(\theta)_{\text{ctrl}} \;\;\text{CX}
\;\;\longrightarrow\;\;
\text{CX}\;\;\text{CX}\;\; R_z(\theta)
\;\;\longrightarrow\;\;
R_z(\theta).
$$

## The lesson: a good local move can be a bad global one

My first version pushed every commuting gate as far right as it could go. It was
correct (the differential harness confirmed it every time) and it made circuits
*worse*. On the hardware-efficient ansatz benchmark, the fully optimized circuit
went from 67 gates to 91. The optimizer was working perfectly and losing.

The reason is phase ordering, the oldest headache in compilers. Pushing a
rotation rightward moved it *away* from the neighboring rotation it was supposed
to fuse with. Each push was locally justified and globally destructive: it
dissolved fusion opportunities faster than it created cancellations. Unconditional
"always push" is a greedy heuristic optimizing the wrong thing.

The fix is to make the pass earn each move. Before pushing, walk forward along
the wire through the gates this one commutes with, and only push if the chain
ends where the move pays: a single-qubit gate to fuse into, or a matching
two-qubit gate that will cancel once the pusher is gone. Otherwise leave it
alone.

```python title="src/qcc/passes/commute_diagonals.py: push only if it pays"
merges  = _push_pays(diag, xax, two_qubit, op.qout)   # ends at a 1q merge?
cancels = _twin_immediately_before(op, two_qubit)      # or a cancelling pair?
if not (merges or cancels):
    return                                             # locally legal, globally bad
```

With the guard, the ansatz optimizes to 67 gates, matching Qiskit's `-O2` and
`-O3` (part 4 has the table). Flip the guard off and it's back to 91. The
committed code carries the guard and a comment recording the regression, so the
mistake stays visible.

## Iterate to a fixpoint

Each pass only removes gates or coarsens them, so the gate count is monotone
non-increasing, and the pipeline just runs the four passes in a loop until a
round changes nothing. Cancellation exposes new rotation merges; merges feed
fusion; commutation opens new cancellations; repeat. Termination is by counting,
because you cannot remove gates forever.

## Next

Four local rewrites, one oracle, one hard-won guard. Part 4 emits
QIR, runs it on CUDA-Q, and then does the thing this whole series was building
toward: measures qcc against the Qiskit transpiler and pytket on ten circuit
families, and is honest about the one place it loses.
