---
title: PurpleBrain
summary: A real-time pipeline that turns raw EEG into FM synthesis — brain activity driving sound with low enough latency to feel immediate.
role: Engineer
stack: ['Rust', 'DSP', 'Real-time audio', 'EEG']
year: 2025
length: '~4 months'
order: 2
glyph: waveform
draft: false
---

PurpleBrain takes a stream of EEG data and turns it into sound in real time —
specifically, it drives an FM synthesis engine from features pulled out of the
raw signal. The goal was to make the mapping feel *immediate*: move your
attention, hear the timbre shift, with no perceptible lag in between.

## The problem

Biosignal-to-audio is a latency game. EEG is noisy, non-stationary, and
low-amplitude; the interesting structure lives in frequency bands that you have
to extract on a moving window. Do that naively and you either smear the signal
with too much smoothing or chase noise with too little. Meanwhile the audio
thread cannot wait — if synthesis stalls for even a few milliseconds, you hear
it as a click or a dropout. The two halves want opposite things.

## The approach

I built the signal path in Rust to keep the real-time guarantees honest: a
fixed-budget processing stage that windows the incoming EEG, pulls out band
power and other features, and maps them onto FM synthesis parameters —
modulation index, carrier ratios, envelope. The audio callback stays lean and
allocation-free; the heavier analysis runs off the hot path and hands results
across without blocking the synth.

> Real-time means the deadline is part of the spec. A correct result that
> arrives late is a wrong result.

The fun is in the mapping design — which features should move which synthesis
parameters so that the result is both responsive and musical rather than just
a sonified data dump.

## What came out of it

A working instrument that plays your own brain activity, and a DSP foundation I
keep extending. {Add specifics here — measured end-to-end latency, the EEG
hardware you're reading from, sample rate / window size, and any performance
demos or recordings you want to link.}
