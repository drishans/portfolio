---
title: "The WSL2 field manual: cuQuantum on a Windows box"
description: Linux-only wheels, a CUDA-13 packaging maze, and one renamed import between you and a GPU Bell state. Every error here is one I actually hit.
pubDate: 2026-07-02
tags: ['quantum', 'cuda', 'wsl2', 'setup']
topics: ['quantum', 'scicomp']
series:
  id: one-gpu-n-qubits
  part: 2
draft: true
---

Part 1 established the plan: statevector simulation on the 5090, measured
honestly. Before any measuring happens, the stack has to come up — and on a
Windows machine that means WSL2, because NVIDIA ships `cuquantum-python`
wheels for Linux. The good news: the Windows NVIDIA driver passes the GPU
straight through to WSL2, and *nothing else* needs installing on the Windows
side. No CUDA toolkit anywhere, in fact. The runtime libraries all arrive as
pip wheels.

This is the field manual: three real errors, in the order you'll meet them,
each with the fix. At the end, a Bell state.

## 0 · The lay of the land

Inside an Ubuntu WSL2 distro, the driver is already there — the Windows one
moonlights:

```bash frame="terminal"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
# NVIDIA GeForce RTX 5090, 32607 MiB
```

Two WSL facts worth knowing before they surprise you later:

- WSL only hands Linux **half your RAM** by default — this 96 GB box shows
  ~45 GiB inside Ubuntu (`free -g`). Irrelevant today, decisive in Part 4
  when we spill past VRAM. Raise it in `.wslconfig` if you need to.
- The Windows filesystem is mounted at `/mnt/c`, and it's *slow* for the
  thousands of tiny files a Python venv is made of. Keep the repo on
  `/mnt/c` if you like (I do — Windows tools can see it), but put the
  **venv in the Linux home**. With [uv](https://docs.astral.sh/uv/), that's
  one environment variable:

```bash title="~/.bashrc (or per-shell)"
export UV_PROJECT_ENVIRONMENT=$HOME/.venvs/one-gpu-n-qubits
```

## 1 · The install, and error number one

The obvious install is the one I typed:

```bash frame="terminal"
uv add cupy-cuda13x cuquantum-python-cu13 qiskit
uv run python -c "import cupy"
```

which detonates immediately:

```ansi frame="terminal"
OSError: libcublasLt.so.13: cannot open shared object file: No such file or directory
RuntimeError: Failed to dlopen .../cutensor/lib/libcutensor.so.2
```

Translation: CuPy preloads cuTENSOR at import, cuTENSOR needs cuBLAS, and
**nothing in the dependency chain actually ships cuBLAS**. The
`cuquantum-python-cu13` wheel pulls in `custatevec-cu13`, `cutensor-cu13`,
`cutensornet-cu13` — the quantum libraries — and assumes the CUDA runtime
libs are someone else's problem.

## 2 · The trap disguised as the fix

The reflex fix is to install the missing library directly, and here the
CUDA-13 era sets a small trap. The package name every blog post from the
CUDA-12 years suggests:

```ansi frame="terminal"
uv add nvidia-cublas-cu13
# error: Distribution `nvidia-cublas-cu13==0.0.1` can't be installed
# ... Build failures usually indicate a problem with the package
```

`nvidia-cublas-cu13` exists on PyPI as a **v0.0.1 squatter placeholder that
fails to build**. NVIDIA dropped the `-cuXX` suffix for CUDA 13: the real
wheel is plain `nvidia-cublas`, versioned `13.x`. You could add that — but
there's a cleaner move. CuPy publishes an extra that pulls the *entire*
runtime toolkit from PyPI in one go:

```bash frame="terminal"
uv add 'cupy-cuda13x[ctk]'
uv run python -c "import cupy; print('alive')"
# alive
```

`[ctk]` expands to `cuda-toolkit[cublas,cudart,cufft,curand,cusolver,cusparse,nvrtc]==13.*`.
One extra, no version archaeology, no system CUDA install. This is the line
that makes the whole "no toolkit anywhere" promise true.

## 3 · The import that moved

Last one. Every cuStateVec example older than a couple of years starts with:

```ansi frame="terminal"
uv run python -c "from cuquantum import custatevec"
# ImportError: cannot import name 'custatevec' from 'cuquantum'
```

cuQuantum 26.x reorganized: the low-level bindings live under
`cuquantum.bindings`, and the top level now hosts the newer high-level APIs
(`tensornet`, `densitymat`, `pauliprop` — we'll meet `tensornet` in Part 5).
The 2026 spelling:

```python title="the imports that work (cuquantum 26.6)"
import cuquantum
from cuquantum.bindings import custatevec as cusv

C64 = cuquantum.cudaDataType.CUDA_C_64F        # enums stayed top-level
```

## 4 · Proof of life

Full script in the repo as
[`bench/00_hello.py`](https://github.com/drishans/one-gpu-n-qubits/blob/main/bench/00_hello.py);
the load-bearing part:

```python title="bell.py" {8-9}
import cupy as cp, numpy as np
import cuquantum
from cuquantum.bindings import custatevec as cusv

C64 = cuquantum.cudaDataType.CUDA_C_64F
sv = cp.zeros(4, dtype=np.complex128); sv[0] = 1     # |00⟩ on the GPU

handle = cusv.create()                                # H on q0, then CX —
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

That's $\tfrac{1}{\sqrt{2}}\left(|00\rangle + |11\rangle\right)$, computed by
cuStateVec, on the card. Two amplitudes at $0.7071$, entanglement achieved,
stack verified.

Note the last line, because it's the first honest measurement of the series:
the "32 GB" card exposes **31.8 GiB**, and a warm CUDA context leaves
**30.2 GiB** actually free. Those missing gigabytes are exactly the kind of
detail the arithmetic in Part 1 glossed over — and at 31 qubits, where the
statevector is precisely the size of the card, they're the whole story.

Next: real circuits, and what a gate actually costs as the state grows.
