---
title: The Scanner Went Down Mid-Event
description: A static import, a missing build step, and a 30-second triage from a phone
pubDate: 2026-06-12
tags: ['rust', 'wasm', 'postmortem', 'deploy']
draft: false
---

Mid-event, the scanner stopped working. Every ticket came back invalid. People were lined up at the prize desk. I was triaging from my phone on Claude Code, maybe had a few minutes of attention.

The scanner is a simple page: open the camera, scan a QR code, verify the ticket with WASM, show a green check or a red X. When something's wrong, it's usually the signature. That's the first place I'd look: key mismatch, bad encoding, something on the crypto side.

## What Looked Wrong

So I started with the obvious: are the signing and verification keys the same? They were. Were they using the same base64 variant? Yes. Was the algorithm consistent? Yes. The crypto looked fine. That was strange.

Then I remembered: the scanner page starts with a static top-level ES6 module import of the compiled WASM file. When I deployed, that file didn't exist. The Dockerfile never built it. The build CI never built it. The artifacts were gitignored, so I never noticed locally. A static import that 404s doesn't just fail gracefully—it stops the entire module from loading. The whole page dies before the first line of scan.js runs.

## What Was Actually Wrong

The worst part: there *was* fallback logic, and it was correct. If WASM failed to load, the page was supposed to hit `/api/verify` instead, using the exact same key that signed the tickets. It literally cannot have a key mismatch. But the static import at the top of the file was fatal—that fallback code never got a chance to execute.

The fallback existed. The design was sound. The code was right. It just never ran because the import chain broke before anything could try.

## The Thirty-Second Test

I had a couple minutes. I couldn't redeploy and watch the full Fly.io build pipeline. So I gave the organizers a quick triage command: open `https://spinwin.fly.dev/api/verify/<token>` in a browser. If it returns `valid:true`, it's the frontend (my code, I'll fix it). If `valid:false`, it's a key problem. That bought us a way to disambiguate without waiting for me.

## The Fix

I pushed two things. First, change the WASM import to a dynamic one wrapped in try/catch—a missing file doesn't kill the page, it just falls back. Second, fix the Dockerfile to actually build the WASM module in the builder stage and copy it into the image.

Then came the deploy dance. Merged to main, but prod doesn't auto-deploy—it needs a manual workflow_dispatch. Triggered the prod deploy, watched the build green, watched the Docker layer compile Rust and WASM, watched flyctl push the image. Prod came up clean.

## The Feedback Loop

The lesson stung because it was obvious in hindsight. A fallback that sits *downstream* of a fatal top-level import isn't a fallback. And "it works in dev" is a lie that hides missing pipeline steps—local builds of gitignored artifacts can mask broken deploys forever.

The static import plus the missing build step was a feedback loop. I never saw a warning. By the time the code shipped, it was too late to notice. And that's when 600 people were watching.

I'll never ship static imports that don't gracefully degrade again.
