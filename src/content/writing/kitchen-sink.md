---
title: Kitchen sink — the rendering test plate
description: Every piece of markup the tutorial stack has to render — math, code frames, tables, footnotes, figures — on one page. Permanent draft; never publish.
pubDate: 2026-07-02
tags: ['meta', 'test']
topics: ['quantum']
draft: true
---

This page is deliberately never published (`draft: true` stays). It exists so
every rendering feature the tutorials rely on can be eyeballed on one page
after any dependency or theme change. If something here looks wrong, fix the
stack before publishing anything real.

## Inline and display math

The state of $n$ qubits is a vector of $2^n$ complex amplitudes
$|\psi\rangle = \sum_i \alpha_i |i\rangle$ with $\sum_i |\alpha_i|^2 = 1$.
Inline math should sit on the text baseline without jumping lines.

Display math gets room to breathe:

$$
|\psi\rangle = \alpha|0\rangle + \beta|1\rangle,
\qquad
\begin{pmatrix} \alpha' \\ \beta' \end{pmatrix}
=
\frac{1}{\sqrt{2}}
\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}
\begin{pmatrix} \alpha \\ \beta \end{pmatrix}
$$

And something longer, to check horizontal overflow scrolling on phones:

$$
F(\rho, \sigma) = \left( \operatorname{tr} \sqrt{ \sqrt{\rho}\, \sigma \sqrt{\rho} } \right)^2
\leq 1 - \frac{1}{2} \lVert \rho - \sigma \rVert_1^2 + \mathcal{O}\!\left(\epsilon^{2n}\right)
$$

## Code frames

A titled editor frame with highlighted lines:

```python title="statevector.py" {6-7}
import cupy as cp

def hadamard_all(state: cp.ndarray, n: int) -> cp.ndarray:
    """Apply H to every qubit of an n-qubit statevector."""
    h = cp.array([[1, 1], [1, -1]]) / cp.sqrt(2)
    for q in range(n):                      # these two lines are the hot loop
        state = apply_single_qubit(state, h, q)
    return state
```

A terminal frame:

```bash frame="terminal"
nvidia-smi --query-gpu=name,memory.total --format=csv
# name, memory.total [MiB]
# NVIDIA GeForce RTX 5090, 32607 MiB
```

An `ansi` fence (used for annotated error output in tutorials):

```ansi frame="terminal"
uv add nvidia-cublas-cu13
# error: Distribution `nvidia-cublas-cu13==0.0.1` can't be installed
```

Plain inline code like `cp.einsum` should still use the specimen-box style.

## Tables

| Qubits | fp64 statevector | Fits in 32 GB? |
| ------ | ---------------- | -------------- |
| 28     | 4.3 GB           | comfortably    |
| 30     | 17.2 GB          | with headroom  |
| 31     | 34.4 GB          | no             |

## Footnotes and quotes

Statevector simulation is a memory problem before it is a compute
problem[^memory], which is the whole reason this series exists.

> The exponential lives in memory, not in time. Compute is what you optimize
> *after* you've fit the state.

[^memory]: 16 bytes per amplitude in complex128; every added qubit doubles the
    vector. No amount of GPU horsepower changes the size of what you must store.

## Figures

<figure>
  <img src="/og-default.png" alt="Placeholder plate image" width="1200" height="630" />
  <figcaption>Fig. 1 — placeholder specimen; real figures are committed SVGs.</figcaption>
</figure>

## Lists

1. Ordered items with a second line that wraps far enough to check the hanging
   indent behaves.
2. Another item.
   - Nested unordered item
   - And a sibling

That's the whole bench. If it all looks right, ship the real thing.
