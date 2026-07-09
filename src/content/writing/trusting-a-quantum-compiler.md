---
title: "How to trust a compiler you just wrote"
description: A frontend is easy to write and easy to get subtly wrong. Before optimizing anything, build an independent oracle and let random circuits attack it. The differential harness that caught every real bug in qcc.
pubDate: 2026-07-08
tags: ['compilers', 'quantum', 'testing', 'openqasm', 'simulation']
topics: ['compilers', 'quantum']
series:
  id: building-a-quantum-compiler
  part: 2
draft: true
---

Part 1 built an IR where qubits are SSA values and optimizations
are local rewrites. Before writing any of those rewrites, I wrote the thing that
tells me when one is wrong. A quantum optimizer that produces a plausible,
subtly incorrect circuit is worse than no optimizer, because the output still
runs and still returns numbers. The whole project rests on being able to check
equivalence cheaply and often.

This part is the frontend and the oracle. Code lives in
[`src/qcc/frontend`](https://github.com/drishans/qcc/tree/main/src/qcc) and
[`src/qcc/backend/sim.py`](https://github.com/drishans/qcc/blob/main/src/qcc/backend/sim.py).

## The frontend does less than you'd think, on purpose

The job is OpenQASM 3 to the dialect from part 1. I lower a deliberately tight
subset: register declarations, the standard gates with compile-time-constant
angles, barriers, measurement, and user `gate` definitions. Everything else is a
clear error with a line number. This is a compiler for circuits, not a general
OpenQASM interpreter, and pretending otherwise would mean a much larger surface
to test.

One decision matters for everything downstream: gates the dialect does not carry
natively get expanded here, at the boundary, into the core set. A Toffoli
becomes its standard six-CX-and-T decomposition; a controlled phase becomes its
two-CX form; the hardware-efficient ansatz's `rzz` blocks get inlined from their
definitions. By the time the optimizer sees a circuit, there is exactly one gate
vocabulary. The passes never grow a special case for a gate that some frontend
happened to emit.

```text title="what the frontend accepts, expanded to one vocabulary"
h x y z s sdg t tdg sx  rx ry rz p u3  cx cz swap  measure
```

## The oracle: a simulator that shares no code

To check that optimization preserved a circuit, I compare the state each version
produces. That needs a simulator, and the one requirement that makes it useful
is *independence*. The reference simulator is plain NumPy, a few dozen lines, and
it imports nothing from Qiskit, from pytket, from CUDA-Q, or from the frontend.
It shares no gate tables and no conventions with anything it will later judge. A
bug shared between the compiler and its checker is a bug neither can see; keeping
them independent is what makes agreement mean something.

It walks the instruction tape and applies each gate as a tensor contraction on
the state array:

```python title="src/qcc/backend/sim.py: the whole 1-qubit case"
u = gates.matrix_1q(ins.name, ins.params)
state = np.tensordot(u, state, axes=[(1,), (w,)])
state = np.moveaxis(state, 0, w)
```

It caps out around 16 qubits, which is plenty: correctness bugs show up on small
circuits, and every benchmark circuit small enough to simulate gets checked.

## Equivalence is up to global phase, and that's not a fudge

Two quantum states that differ only by an overall phase $e^{i\gamma}$ are
physically identical: no measurement can tell them apart. An optimizer is
allowed to change the global phase, and a good one often does. So the
equivalence check is not "are these state vectors equal" but

$$
|\langle \psi_A | \psi_B \rangle| = 1
\iff |\psi_B\rangle = e^{i\gamma}\,|\psi_A\rangle,
$$

the magnitude of the overlap. This is one line, and it is the invariant every
single pass in part 3 has to preserve:

```python title="src/qcc/verify.py"
def equivalent(a, b, tol=1e-8):
    return abs(fidelity(a, b) - 1.0) < tol   # |<psi_a|psi_b>|
```

Working up to global phase is also what *licenses* the aggressive rewrites later.
A rotation by $2\pi$ is $-I$ on the qubit, not the identity, so in a
phase-sensitive world you could not delete it. Up to global phase you can, and
the fused single-qubit gates in part 3 lean on exactly this freedom.

## Differential testing is the part that actually works

Unit tests on hand-built cases catch the bugs you thought of. The bugs that
matter are the ones you didn't. So the core of the test suite is differential:
generate a random circuit, optimize it, and assert the state is unchanged up to
global phase.

```python title="tests/test_equiv_random.py: the test that earns its keep"
for _ in range(30):
    circuit = random_circuit(rng, n_qubits, 80, barriers=True)
    before = extract(circuit)
    optimize(circuit)
    verify_linear(circuit)                       # still no cloning
    assert abs(fidelity(before, extract(circuit)) - 1) < 1e-9
    assert metrics(after).gates <= metrics(before).gates
```

Two assertions, both load-bearing. The fidelity check says the optimizer did not
change the circuit's meaning. The gate-count check says it did not quietly make
the circuit *worse*, which is its own class of bug. Across the whole random
suite the worst fidelity deviation I see is about $10^{-15}$, floating-point
noise and nothing more.

This harness has caught every real bug the passes have had, including one in
part 3 that no unit test would have: a rewrite that produced a valid-looking
circuit whose state was wrong on exactly the inputs I hadn't imagined. Random
circuits imagine them for you.

## Next

Now there is an IR that makes rewrites local, and an oracle that catches wrong
ones instantly. That combination is what makes it safe to be aggressive.
Part 3 is the optimizer: cancellation, rotation merging, single-qubit
fusion, and a commutation pass whose first version made circuits *worse* in a way
worth dwelling on.
