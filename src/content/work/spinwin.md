---
title: Spin & Win
summary: Prize wheel app for a live event, with cryptographically signed offline-verifiable QR tickets
role: Solo build
stack: ['Rust', 'Axum', 'SQLite', 'WebAssembly', 'JavaScript', 'Ed25519']
year: 2026
length: Live event
order: 4
glyph: phases
live: https://spinwin.fly.dev
repo: https://github.com/drishans/spinwin
draft: false
---

I built this for WomenNowTV's live event at a venue with about 600–700 attendees. The idea was straightforward: people spin a wheel on their phone, win a prize, and walk away with a cryptographically signed QR code they can show at a prize desk. Staff verify the ticket by scanning it—no internet needed, right there in the scanner's browser.

## One Codebase, Two Runtimes

The interesting constraint was the architecture. I needed Ed25519 signing and verification to run in two places: on the server (to sign tickets after a spin) and in the browser (so staff can verify offline). Rather than implement it twice, I built a single Rust crate and compiled it to two targets—native binary for the server, WebAssembly for the scanner. One crypto implementation, impossible to drift or disagree.

The spin itself is atomic. When you land on a prize, one database transaction picks it, decrements the stock, generates a signed ticket, and emails you the QR. You can't refresh and re-spin; the outcome is locked in server-side before the wheel animation even starts. The animation is cosmetic.

## Staying Safe

Anti-fraud was the real work. Email uniqueness prevents double spins. One-time redemption flags stop someone from screenshot-sharing the same ticket. Stock management uses `UPDATE ... WHERE remaining > 0` with a checked row count—if you hit zero stock, the query fails, and no one gets oversold. There's a "Mystery Prize" fallback with unlimited stock, so if the necklaces sell out, people don't walk away empty-handed.

Registration was fail-closed: emails get validated against a Google Sheet. If the sheet fetch fails, the page denies *all* spins rather than going permissive. The list stays cached, so one bad network blip doesn't break the event.

> The trickier part was trust without blindness. The admin dashboard can adjust prize stock, but it rejects any adjustment that would set a total below tickets already issued—you can't retroactively unsell prizes.

It's live at https://spinwin.fly.dev. And yeah, [something broke mid-event](/writing/spinwin-scanner-outage/). But that's a different story.