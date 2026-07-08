---
title: "The WSL2 field manual: cuQuantum on a Windows box"
description: The driver lives on Windows, the math lives in Linux, and pip carries everything in between. A three-layer mental model, a four-rung verification ladder, and a Bell state to prove the stack is real.
pubDate: 2026-07-06
tags: ['quantum', 'cuda', 'wsl2', 'setup']
topics: ['quantum', 'scicomp']
series:
  id: one-gpu-n-qubits
  part: 2
draft: false
---

Part 1 established the plan: statevector simulation on the 5090, measured
honestly. Before any measuring happens, the stack has to come up, and on a
Windows machine that means WSL2, because NVIDIA ships `cuquantum-python`
wheels for Linux only.

Setup posts rot faster than any other kind, so this one is organized around
the parts that don't. One mental model explains the whole install, and one
verification ladder debugs it, this year and in five years, whatever the
package names have mutated into by then.

## The three-layer model

Everything CUDA on a WSL2 box lives in exactly one of three layers:

1. **The driver.** It lives on Windows and moonlights inside every WSL2
   distro. You never install a driver inside Linux; if you do, you break
   the passthrough. Update it from the Windows side, nowhere else.
2. **The CUDA userland.** Runtime libraries like cuBLAS and cuFFT, plus the
   domain libraries (cuStateVec, cuTensorNet), all arrive as pip wheels
   inside a virtual environment. No system-wide CUDA toolkit exists
   anywhere on this machine, Windows or Linux.
3. **Your code**, in the same environment, pinned by a lockfile.

The consequences are pleasant. The machine stays clean. The environment is
disposable and rebuilds from the lockfile. And when something breaks, the
error always names its layer, which is what the ladder below exploits.

## Two WSL facts before they surprise you

- WSL gives Linux **half your RAM** by default. This 96 GB box shows about
  45 GiB inside Ubuntu (`free -g`). Irrelevant today, decisive in Part 4
  when we spill past VRAM. Raise it in `.wslconfig` when the time comes.
- The Windows filesystem is mounted at `/mnt/c`, and it is slow for the
  thousands of tiny files a venv is made of. Keep the repo on `/mnt/c` if
  you like (I do, since Windows tools can see it), but put the venv in the
  Linux home. With [uv](https://docs.astral.sh/uv/) that is one variable:

```bash title="~/.bashrc (or per-shell)"
export UV_PROJECT_ENVIRONMENT=$HOME/.venvs/one-gpu-n-qubits
```

## The verification ladder

Four rungs, one per layer boundary, each with a known correct answer.
Climb in order; when a rung fails, the fix lives in that rung's layer and
nowhere else. Package names go stale. This ladder does not.

**Rung 1: the driver sees the card.**

```bash frame="terminal"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
# NVIDIA GeForce RTX 5090, 32607 MiB
```

If this fails, nothing involving pip will help; the problem is the Windows
driver or WSL itself.

**Rung 2: the wheels resolve and load.**

```bash frame="terminal"
uv run python -c "import cupy; print('loaded')"
```

An `ImportError` here is a packaging problem. A `dlopen` error naming a
missing `.so` means some wheel assumed a library that nothing installed.
Either way the fix is in layer 2, in `pyproject.toml`, never in `apt`.

**Rung 3: a kernel actually runs.**

```bash frame="terminal"
uv run python -c "import cupy as cp; print(cp.arange(8).sum())"
# 28
```

Importing proves linking; arithmetic proves the runtime, the JIT, and the
driver agree with each other.

**Rung 4: the domain library computes something with a known answer.**
For quantum simulation the natural choice is a Bell state, because the
right answer is burned into memory: two amplitudes at $1/\sqrt{2} \approx
0.7071$. That test closes this post.

## What broke here, specifically (current as of cuQuantum 26.6)

A dated section, deliberately fenced off so the rot stays contained. On
this machine, rung 2 failed:

```ansi frame="terminal"
OSError: libcublasLt.so.13: cannot open shared object file: No such file or directory
```

The quantum wheels pulled in cuStateVec and cuTENSOR but assumed the
underlying CUDA runtime libraries were someone else's problem, and no one
else had claimed the job. The fix worth remembering is not a package name.
CuPy publishes an extra that installs the entire runtime toolkit it needs,
version-matched, in one move:

```bash frame="terminal"
uv add 'cupy-cuda13x[ctk]'
```

One import also moved in cuQuantum 26.x; the bindings now live a level
down:

```python title="the imports that work (26.x)"
from cuquantum.bindings import custatevec as cusv
```

If you are reading this in 2029 and rung 2 fails with different names:
read the missing `.so` out of the error, ask which installed package ought
to ship it, and prefer the array library's own toolkit extra over
hand-assembling `nvidia-*` wheels. That recipe survives the churn; the
specific spellings above will not.

## Proof of life

Full script in the repo as
[`bench/00_hello.py`](https://github.com/drishans/one-gpu-n-qubits/blob/main/bench/00_hello.py);
the load-bearing part:

```python title="bell.py" {8-9}
import cupy as cp, numpy as np
import cuquantum
from cuquantum.bindings import custatevec as cusv

C64 = cuquantum.cudaDataType.CUDA_C_64F
sv = cp.zeros(4, dtype=np.complex128); sv[0] = 1     # |00⟩ on the GPU

handle = cusv.create()                                # H on q0, then CX
# ... apply_matrix(H, target=0), apply_matrix(X, target=1, control=0)
cusv.destroy(handle)
print(np.round(cp.asnumpy(sv), 4))
```

```ansi frame="terminal"
uv run python bench/00_hello.py
# amplitudes: [0.7071+0.j 0.    +0.j 0.    +0.j 0.7071+0.j]
# gpu: NVIDIA GeForce RTX 5090
# vram: 30.2 GiB free / 31.8 GiB
```

That is $\tfrac{1}{\sqrt{2}}\left(|00\rangle + |11\rangle\right)$, computed
by cuStateVec, on the card. Rung 4 passes, and the stack is verified from
driver to domain library.

Note the last line, because it is the first honest measurement of the
series: the "32 GB" card exposes **31.8 GiB**, and a warm CUDA context
leaves **30.2 GiB** actually free. Those missing gigabytes are exactly the
kind of detail the arithmetic in Part 1 glossed over, and at 31 qubits,
where the statevector is precisely the size of the card, they are the
whole story.

Next: real circuits, and what a gate actually costs as the state grows.
