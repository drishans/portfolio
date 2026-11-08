---
title: The interpreter is the specification
description: A thousand lines of Rust from source text to a WAV file, and the decision that shapes everything downstream. Backends that must agree bit for bit rule out calling the C standard library's sin.
pubDate: 2026-08-26
tags: ['compilers', 'audio', 'rust', 'dsp', 'determinism', 'testing']
topics: ['compilers', 'audio']
series:
  id: wub
  part: 2
draft: true
---

[Part 1](/writing/the-rate-knob-is-the-language) settled what
[wub](https://github.com/drishans/wub) is: a language whose central type is a
tempo-synced rate pattern, because wobble bass is a rhythm before it's a
timbre. This part is the machinery that turns that text into audio, and one
decision that constrains everything after it.

The pipeline is the boring one from the textbook, which is the point:

```text
source ──lex──▶ tokens ──parse──▶ AST ──check──▶ Patch IR ──▶ eval ──▶ WAV
```

Here's where the thousand lines actually went, measured rather than estimated:

| stage | lines |
| ----- | ----- |
| lexer | 128 |
| parser | 245 |
| checker | 170 |
| IR, evaluator, plumbing | 210 |
| DSP primitives | 78 |
| command line | 172 |
| **total** | **1003** |

I'd budgeted 1020 for the front end before writing any of it, which is the
sort of estimate that only looks impressive when you don't mention the ones
that missed.

## The checker is where the language happens

Parsing a small expression grammar is a solved problem and the parser is the
least interesting file in the repo. The checker is where the design lives,
because it turns a tree of names into something a code generator can walk
without asking questions.

It does three things. It resolves every identifier to a **binding index**, so
`Var("wob")` becomes `Ref(1)` and nothing downstream ever does a hash lookup.
It checks arity and shapes, so `lfo(8, wave)` fails with a message naming the
four legal shapes instead of producing silence. And it hands out **state
slots**: an oscillator needs one float of phase, the filter needs two, and the
checker assigns each a fixed offset into a single flat array.

That last one is the load-bearing decision. Because state is a flat array with
offsets known at compile time, the entire patch can be emitted later as
straight-line code with no allocation, no pointer chasing, and no branches:

```rust title="what check produces"
Node::Lpf { input, cutoff, res, state: 3 }   // reads and writes state[3..5]
```

A tree-walking interpreter and a WebAssembly module can both consume that, and
that's what makes it reasonable to demand they agree exactly.

## Bit-for-bit, or the whole plan collapses

wub is going to grow two more ways to run a patch: hand-written WebAssembly
for the browser, and emitted C for a native binary. Three implementations of
one language is three opportunities to disagree.

So the rule is that the reference interpreter is **normative**. Not "the
readable one" or "the slow one". It is the specification, and every backend has
to reproduce its output bit for bit, checked by hashing the rendered buffer.
Evaluation order, the order in which stateful nodes read and then advance
their state, even the order of the additions inside the filter: all of it is
spec, because all of it is observable in the low bits.

That sounds like a purity exercise. It's actually the cheapest testing strategy
available. A second implementation that must agree exactly is a far better bug
detector than any test I would think to write, because it checks every sample
of every patch instead of the cases I remembered to worry about.

## Which is why there's no libm

Here's the consequence I didn't see coming until I wrote the rule down.

If the interpreter and a WebAssembly module must produce identical bits, then
every function in the signal path must produce identical bits on both. And
`sin`, `tan`, and `tanh` from the C standard library do not. They're
correctly-rounded to within an ULP or two, and the exact ULP depends on the
platform, the libm version, and in the browser's case on the JavaScript engine.
That's fine for almost all software and fatal for a hash comparison.

So the compiler owns its transcendentals. Sine is a range reduction by symmetry
down to a quarter wave, then a seventh-order odd polynomial:

```rust title="src/dsp.rs"
th * (0.999_996_6 + t2 * (-0.166_648_24 + t2 * (0.008_306_29 + t2 * (-0.000_183_63))))
```

Worst absolute error, swept over four cycles at 200k points: **9.6e-7**, about
−120 dB. That's below the noise floor of a 16-bit file, so the approximation is
inaudible in the strict sense that it cannot be represented in the output
format.

Saturation uses the old rational tanh, $x(27 + x^2)/(27 + 9x^2)$, which reaches
exactly ±1 at $|x| = 3$ and is clamped past it. Filter coefficients get tangent
as a ratio of the same sine polynomial. Nothing in the audio path calls
anything I didn't write, so the whole render is plain arithmetic on 32-bit
floats, and plain arithmetic on 32-bit floats is defined exactly by IEEE 754.

### The hazard waiting in the C backend

One trap worth writing down before I walk into it. GCC and Clang will contract
`a*b + c` into a fused multiply-add by default, which rounds once where the
interpreter rounds twice. The filter's inner loop is exactly that shape:

```c
v1 = a1 * ic1eq + a2 * v3;
```

So a C build will disagree with the interpreter in the low bits, the hash
comparison will fail, and it will look exactly like a code generation bug for
however long it takes to remember that `-ffp-contract=off` exists.
WebAssembly has no fused multiply-add instruction in its first version, so the
browser backend is safe by construction. This is the kind of thing that costs
an evening if you learn it the hard way.

## Two bugs I could not hear

The patch sounded fine. It was not fine. Both of these came out of measuring
the output rather than listening to it, which is a habit worth having whenever
the artifact is a sound.

**The output was wandering off zero.** Mean DC of 0.0077, and worse, the
per-100 ms figure swung between −0.042 and +0.054 against a peak of 0.5. A
resonant lowpass whose cutoff is being modulated at audio-adjacent speed does
not produce a symmetric waveform, and the asymmetry moves at the wobble rate,
so the whole-file average hides it almost perfectly. Roughly a tenth of the
available headroom was being spent on an offset nobody can hear.

The fix is a one-pole DC blocker on the output, which is unremarkable except
for two things I had to work out. The corner sits at 10 Hz rather than the
usual 20, because this is a sub-bass instrument and a 27.5 Hz sub loses 0.5 dB
at 10 Hz against 1.8 dB at 20. And the stage's impulse response sums to 2,
which means it can *overshoot*: a signal bounded at 0.8 came out at 0.9957 the
first time I ran it. A highpass gives back peak headroom in exchange for
removing offset. Patches need room above `out`.

**The saturator wasn't saturating.** The example patch was driving 1.34% of
its samples past $|x| = 3$, where the rational tanh stops curving and starts
returning exactly ±1. That's not soft clipping. That's a flat top, which is a
harsher sound and sprays broadband noise, and the giveaway was that peak level
landed on precisely 0.5000 rather than near it.

Gain staging fixed the patch. The more useful fix is that the renderer now
counts those samples and says so:

```text frame="terminal"
warning: drive saturates completely on 1.34% of samples,
         so the waveform flat-tops (hard limiting, not soft clip).
         Lower the mix into drive, or its amount.
```

Every render also drops a provenance sidecar next to the WAV with the source
verbatim, the compiler version and git SHA, and the measured statistics. Before
and after:

| | before | after |
| --- | --- | --- |
| peak | 0.0 dBFS | −1.84 dBFS |
| mean DC | +0.0077 | +0.000205 |
| worst 100 ms DC | +0.054 | +0.039 |
| flat-topped samples | 1.34% | 0.000% |

The worst-block figure barely moved, and that's honest rather than
disappointing: what's left isn't DC, it's waveform asymmetry at 4.67 Hz, and
removing it would need a corner high enough to thin the sub. Some of the
number is the bug and some of it is the instrument.

## Tests that pin meaning, not bytes

The obvious test for a renderer is to hash the output and check it against a
stored constant. I have that, and it's worth being clear about what it's for:
it is a **change detector**. It tells you the render moved. It says nothing
about whether the render was ever right, and when it fails the temptation is to
update the constant and move on. Its real job starts when a second backend
exists to disagree with the first.

The tests that carry weight assert the rules the backends will have to
preserve. My favourite one is nearly free. The language promises that a named
binding referenced twice is *one* instance, evaluated once per sample, not two
independent copies whose phases both advance. That's hard to observe directly
and trivial to observe indirectly, because in IEEE 754 arithmetic `x + x` is
exactly `2 * x`:

```rust title="tests/semantics.rs"
let shared = buf("o = saw(55)\nout = o + o", 4800);
let scaled = buf("o = saw(55)\nout = 2 * o", 4800);
assert_eq!(hash_buf(&shared), hash_buf(&scaled));
```

If sharing ever broke, the duplicate would advance its phase twice per sample,
the pitch would double, and the hashes would diverge. One line, no tolerance,
no fixture.

The rest are in the same spirit: oscillators emit before advancing phase, so
the first sample of `saw` is exactly −1.0; an LFO's measured period matches
$\text{tempo} \cdot d / 240$ across four tempo and division combinations; a
step pattern advances once per beat. Thirty-two tests total, and the front end
renders four bars at about 217 times real time, which matters only because it
sets the baseline the compiled backends have to beat.

### One test I had to throw away

Worth admitting, since it's the most common way a test suite rots. My first
attempt at "the wobble actually wobbles" measured total RMS in one half of the
LFO cycle against the other, and barely registered a difference. I lowered the
threshold until it passed.

That was the wrong move, and the reason it was wrong is interesting: wobble is
a *spectral* effect, not a loudness one. The 55 Hz fundamental sails through
the filter no matter where the cutoff sits, so overall level hardly moves while
brightness swings enormously. Worse, the saturator regrows harmonics exactly
when the filter closes, which pushes the two halves back together.

Measuring high-frequency energy in narrow windows instead, an unwired LFO
scores 1.0 and the real patch scores 3.4, so a threshold of 2.0 sits clear of
both with a reason attached. A threshold you picked because it passed is a
threshold that will pass forever.

## What's next

Part 3 emits WebAssembly by hand: sections, LEB128, opcodes, no toolchain and
no LLVM anywhere. The target is an AudioWorklet module, and the pass condition
is that its output hashes identically to everything above.
