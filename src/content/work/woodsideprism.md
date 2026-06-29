---
title: Woodside Prism
summary: A production RAG system on Vertex AI and Gemini for a deployment and orchestration platform — retrieval that holds up once real users and real documents arrive.
role: Early engineer
stack: ['Vertex AI', 'ADK', 'RAG', 'SAP BTP', 'Joule']
year: 2025
length: 'Ongoing'
order: 3
glyph: spectrum
draft: false
---

As one of the first engineers at the company, I built the retrieval-augmented
generation pipeline behind our product's assistant — the part that grounds model
answers in a customer's own documentation and operational data instead of letting
the model guess.

## The problem

RAG demos are easy and RAG in production is not. The gap is everything that a toy
example ignores: documents that are messy, inconsistent, and constantly changing;
queries that are vaguer than any benchmark; retrieval that returns *plausible*
chunks rather than *correct* ones; and a model that will confidently stitch
together a wrong answer from almost-right context. When the output feeds real
decisions, "usually fine" isn't a bar you can ship against.

## The approach

I owned the pipeline end to end: ingestion and chunking, embeddings and the vector
store, the retrieval layer, and the prompt assembly that hands grounded context to
Gemini on Vertex AI. The work that mattered most wasn't the happy path — it was
making failure visible. That meant building evaluation into the loop so a change to
chunking or retrieval could be measured rather than eyeballed, and treating
retrieval quality as the thing to optimize, since a strong model on weak context
still produces weak answers.

> Garbage retrieval, confident answer. Most of the engineering in production RAG
> is making sure the model is arguing from the right evidence.

## What came out of it

A retrieval system that became core infrastructure for the product. {Add specifics
here — corpus size, the eval metrics you track, a latency or accuracy improvement,
or how it changed what the product could promise customers.}
