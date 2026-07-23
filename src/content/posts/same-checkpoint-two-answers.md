---
title: "Same checkpoint, two answers: a silent PyTorch bug on Blackwell"
description: "For three weeks the recipe 'didn't work.' Every hypothesis about the training was wrong, because the training was fine. The toolchain was silently miscomputing on new silicon and the loss curves never let on. Here's the bug, the one diagnostic that caught it, and the environment-acceptance test I now run before trusting any new box."
pubDate: 2026-07-23
---

For about three weeks, the recipe "didn't work."

I was fine-tuning a speech synthesis model on a single RTX 5090. The pipeline had trained cleanly on older hardware months earlier — a known-good baseline sat in the logs. On the new card, the same recipe produced garbage: round-trip CER hovering near 1.0, which is base-model-gibberish territory. The synthesized audio was noise wearing the shape of speech.

So I did what you do. I checked the obvious things, and then the less obvious things, and then the things you only check when you're out of ideas.

## Everything about the recipe was innocent

I retrained cleanly from the base checkpoint, in case my fine-tuned weights were poisoned. Same flat plateau. I assumed overfitting and pulled epochs back. No change. I assumed underfitting and pushed epochs out. No change — ten epochs of training moved the score by 0.00. I swept learning rate. I shrank the dataset to rule out a bad batch, then grew it to rule out too little signal. I re-derived the data manifests. I diffed configs against the last known-good run line by line.

Every hypothesis was about the *training*: the data, the epochs, the schedule, the loss. Every one was wrong, because the training was fine. I was debugging a healthy patient.

The reason this cost three weeks instead of three days is the part worth writing down: **the loss curves looked completely normal.** Loss went down. The gradients were finite. Nothing crashed, nothing NaN'd, nothing threw. If you'd shown me only the training telemetry, I'd have told you the run was converging beautifully. The metrics that are supposed to tell you something is wrong were, themselves, wrong — and they were wrong quietly.

## The diagnostic that cracked it

Out of hypotheses about the recipe, I finally questioned the thing underneath the recipe: the environment.

The test was almost embarrassingly simple. Take **one checkpoint** — a single fixed set of weights, no training involved — and synthesize the same evaluation set twice: once inside a container pinned to stable CUDA wheels, once on the host environment I'd been training in.

Same weights. Same inputs. Same eval.

- Container (stable torch, cu128): **round-trip CER 0.163**
- Host (nightly torch, cu128): **round-trip CER 1.415**

That's the whole bug in two numbers. Inference alone, no training, produced a nearly ten-fold difference in error depending only on which environment ran the forward pass. Weights can't be the problem — they were byte-identical. The recipe can't be the problem — there was no recipe, just a forward pass. The environment was silently computing a different answer.

## Root cause: a nightly build that was wrong, not broken

The host was running `torch 2.11.0.dev+cu128` — a nightly build. On brand-new silicon this isn't a careless choice; it's often the only choice. Blackwell (compute capability `sm_120`) was new enough that stable PyTorch wheels with proper support didn't exist yet, so the nightly channel is where you end up if you want the card to run at all.

The nightly build ran. It didn't error. It produced plausible loss curves and finite gradients. And it silently miscomputed on `sm_120` — corrupting **both training and inference** in a way that never surfaced as an exception, only as results that were subtly, comprehensively wrong. The model never actually converged; the telemetry just said it did.

The fix was to stop trusting the host and do everything — training and inference — inside a Docker image pinned to stable `cu128` wheels. At flow epoch 5, the containerized model immediately matched the known-good baseline from months earlier. The recipe had been correct the entire time.

## The rule I follow now

This is the one that transfers, so it's the reason I wrote the post: **the most dangerous bug is the one that corrupts your results while leaving your metrics healthy.** A crash is a gift — it points at itself. A silent numerical error on an accelerator points at nothing, and every instinct you have sends you to debug the layer above it (your code, your data, your hyperparameters) while the real fault sits below it in a library you didn't write and can't see into.

The defense is cheap and I now run it before trusting any new machine, driver, container, or nightly build:

> **Environment acceptance test.** Before you believe a single number a fresh environment gives you, make it reproduce a *known-good result* first. Take a checkpoint whose output you already trust, run it through the new environment, and confirm the metric lands where it should. Only then are you allowed to trust anything new that environment produces.

A known-good checkpoint is a fixed point. If the environment can't reproduce a fixed point, it cannot be trusted to produce a moving one — and no amount of debugging your *training* will fix a *toolchain* that's lying to you. On mature hardware you can usually skip this. On the first year of a new architecture, where you're forced onto dev builds, it's the difference between three weeks and one afternoon.

## Two more Blackwell container gotchas, while you're here

The same move-everything-into-a-pinned-image fix surfaced two smaller traps that cost hours each, in case you're setting up an `sm_120` box:

- **`torchcodec` must come from the cu128 index.** The default install pulls a `cu13` build, and the dataloader dies at runtime on a missing `libnvrtc.so.13`. Pin the index, not just the package.
- **Run the container with `--ipc=host`.** Otherwise the DataLoader workers exhaust the default 64 MB `/dev/shm` and you get failures that look like data-pipeline bugs but are shared-memory starvation.

Both are the same lesson in miniature: on new silicon, the failures don't announce what they are. Assume the toolchain is guilty until it reproduces something you already trust.

---

*This is part of a series of field notes on building offline speech systems for a low-resource language, solo, on consumer hardware. The round-trip CER metric I used as the diagnostic here is described in [its own post](/posts/round-trip-cer/).*
