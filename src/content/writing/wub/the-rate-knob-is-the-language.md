---
title: The rate knob is the language
description: Wobble bass is a gesture before it is a sound. This is what happens when you build a small compiled language around the one knob that matters, and write the wobble as note divisions instead of hertz.
pubDate: 2026-08-25
tags: ['compilers', 'audio', 'dsl', 'rust', 'synthesis']
topics: ['compilers', 'audio']
series:
  id: wub
  part: 1
draft: true
---

On my Korg Volca Bass, making a wub is a two-handed operation. The left hand
plays notes. The right hand rides the LFO rate knob, and that hand is doing the
actual musical work: opening the filter slowly through a bar, then doubling up
into the last beat, then tearing into something too fast to count. The notes
are the easy part. The knob is the performance.

Every software synth I've reached for turns that hand into a number in a
modulation matrix. You get an LFO, a rate field in hertz, a destination, a
depth. All the information is there, and the gesture is gone.

So I built a language where the knob *is* the syntax. It's called
[wub](https://github.com/drishans/wub), it's about a thousand lines of Rust
with no dependencies, and this series builds it from the grammar up to a
compiler that runs inside a browser tab. This part is about the one design
decision everything else hangs off: what the central type should be.

## The central type is not the oscillator

Ask what a synthesizer language is made of and the obvious answer is
oscillators, filters, envelopes. That's what the DSP textbooks are organized
around, and what Faust, Csound, and SuperCollider give you. It's a good answer
for building any sound.

It's the wrong answer for building *this* sound, because it puts the wobble in
the wrong place. In an oscillator-first language the wobble is a property of a
modulation source that happens to be attached to a filter. In the way a player
thinks about it, the wobble is a rhythm. It's the thing you'd clap.

So the central type in wub is the **rate pattern**: a sequence of note
divisions saying when the filter opens and closes, one step per beat. Here is a
bar of it.

```text title="the rhythm, and nothing else"
pat[8 8 8 16]
```

Three beats of eighth-note wobble, then a beat of sixteenths. That's a whole
musical idea, written the way you'd count it in.

## Divisions, not hertz

The first consequence is that rates are never written in hertz. A division `d`
means one LFO cycle per $1/d$ note, so the frequency falls out of the tempo:

$$f_{\text{LFO}} = \frac{\text{tempo} \cdot d}{240}$$

At 140 bpm that gives the vocabulary a bass producer actually uses:

| division | frequency at 140 bpm | what it sounds like |
| -------- | -------------------- | ------------------- |
| 4 | 2.33 Hz | one slow yawn per beat |
| 8 | 4.67 Hz | the classic wub |
| 16 | 9.33 Hz | the double-time answer |
| 32 | 18.67 Hz | stops being rhythm, starts being timbre |

Writing `4.67` instead of `8` would be worse in three separate ways. It breaks
when you change the tempo. It hides the relationship between the rows above,
which are the *same idea* at different resolutions. And it's a number nobody can
hear as a rhythm, which means you can't write it down from memory after playing
it.

The knob on the Volca has that last problem too. It's continuous and
unlabelled, so a wub you find by ear is a wub you can't reproduce next week.
Divisions are the part of the gesture worth keeping. Continuous drift is the
part worth throwing away.

## The accident that makes it work

Here's the property that turned a naming convention into a design.

An LFO at division `d` runs at $\text{tempo} \cdot d / 240$ Hz, and a beat
lasts $60 / \text{tempo}$ seconds. Multiply those and the tempo cancels:

$$\text{cycles per beat} = \frac{\text{tempo} \cdot d}{240} \cdot
\frac{60}{\text{tempo}} = \frac{d}{4}$$

For the divisions anyone actually uses (4, 8, 16, 32) that's a whole number.
Two LFO cycles per beat at division 8, four at 16. Which means a **free-running
phase is already aligned to the beat**. It arrives back at zero exactly when the
beat does, with no reset, no retrigger, no sequencer telling it where to be.
When a pattern steps from 8 to 16 at a beat boundary, the phase is at zero
anyway, so the change is seamless for free.

Triplet divisions behave correctly too: 6 gives one and a half cycles per beat,
so it realigns every two beats, which *is* the triplet feel.

This is also how the hardware behaves. The Volca's LFO free-runs; set it to a
rate that divides the tempo and it locks itself. wub keeps that and throws away
the part where you have to find the rate by hand.

### Where "exactly" is a small lie

I should be honest about that word, because I measured it and it isn't quite
true. Phase accumulates in 32-bit floats, one addition per sample. The
increment is computed exactly, but adding it forty-eight thousand times a
second loses low bits, so the period drifts:

| tempo | measured drift |
| ----- | -------------- |
| 120 bpm | +65 ppm |
| 70 bpm | −242 ppm |

That's about 0.4 cents, or twenty samples of slip across a seven-second loop.
Inaudible, including at a loop point, which is where you would expect to catch
it. But "realigns at every beat boundary" is an approximation rather than a
theorem, and a language whose entire thesis is *beat-synced wobble* should say
so out loud. The fix is to hold phase in 64-bit floats while keeping the signal
math at 32. It changes the shape of the compiler's state array, so it's a
decision to make before there are two backends encoding the old shape, not
after.

## The whole grammar fits on a screen

Small language, small grammar. This is all of it:

```text title="wub v0, complete"
program  := line*
line     := "tempo" NUM | ident "=" expr
expr     := pipe
pipe     := add ("|>" call)*          # x |> f(a) is f(x, a)
add      := mul (("+" | "-") mul)*
mul      := unary (("*" | "/") unary)*
unary    := "-" unary | atom
atom     := NUM | ident | call | "pat" "[" NUM+ "]" | "(" expr ")"
call     := ident "(" expr ("," expr)* ")"
```

No types to declare, no blocks, no functions you can define yourself. A patch
is a list of named signals, one per line, and a binding called `out` is the one
that gets rendered.

Everything is a signal, including numbers. A number is just a constant signal,
which means any argument that takes a number will take an oscillator instead if
you hand it one. That single rule replaces a modulation matrix.

The one piece of syntax sugar earns its place. `|>` feeds a signal into the
first argument of a call, so a processing chain reads in the order the signal
travels through it:

```text
bass |> lpf(150 + 2200 * wob, 0.82) |> drive(1.4)
```

The alternative is the inside-out version, where you read the last thing first:

```text
drive(lpf(bass, 150 + 2200 * wob, 0.82), 1.4)
```

Signal flow goes left to right on a patch cable and left to right on the page.
That's the whole argument for it.

## The hello-world wub

Putting it together, here is `examples/first.wub` in the repo, the first thing
the compiler ever made a sound with:

```text title="examples/first.wub"
tempo 140

bass = 0.4 * saw(55) + 0.4 * saw(55.4) + 0.25 * sin(27.5)
wob  = lfo(pat[8 8 8 16], tri)
loud = bass |> lpf(150 + 2200 * wob, 0.82) |> drive(1.4)
out  = 0.65 * loud
```

Three oscillators, because the Volca has three: two saws detuned by 0.4 Hz so
they beat slowly against each other, and a sine an octave down for the part you
feel rather than hear. One resonant lowpass whose cutoff is a signal rather
than a setting. One saturator.

The interesting line is the third. `150 + 2200 * wob` is ordinary arithmetic
on a signal: the filter sits at 150 Hz when the LFO reads zero and opens to
2350 Hz when it reads one. Modulation is addition. Depth is multiplication.
There is nothing else to learn.

Rendering that patch and measuring the result, the brightness envelope peaks at
**4.67 Hz**, against the 4.6667 Hz the formula predicts for 140 bpm at division
8. The abstraction survives contact with the audio, which is not something to
take for granted.

## What's next

The language is decided. Part 2 builds the front end and the reference
interpreter, and gets to a more interesting question: what a *specification* is
when the artifact is a sound. The interpreter is normative, every backend has
to match it bit for bit, and that turns out to rule out calling the C standard
library's `sin`.

It also covers the two bugs I could only find by measuring the output instead
of listening to it. One of them had been quietly eating a tenth of the
headroom.
