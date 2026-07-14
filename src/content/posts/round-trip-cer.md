---
title: "Round-trip CER: shipping TTS in a language you cannot listen-check"
description: "The quality gate I use for text-to-speech when no human can proofread the audio: synthesize, transcribe, score, gate."
pubDate: 2026-07-14
---

*The quality gate I use for text-to-speech when no human can proofread the audio, and why I
think it belongs in every multilingual TTS pipeline.*

Every TTS demo sounds great. That is what demos are for. The problem starts when you generate
ten thousand lines in a language where you cannot personally verify a single one of them,
which is my situation: I build speech tools for a low-resource language I do not natively
speak. It is also, quietly, the situation of any team shipping voices in dozens of languages.
Nobody's QA bench speaks all 74. Past a very small scale, "someone listens to it" is not a
quality process. It is a hope.

My answer is a loop:

1. **Synthesize** the target text with the TTS model.
2. **Transcribe** the result with the best available ASR model for the language.
3. **Score** the transcript against the original text with character error rate.
4. **Gate**: keep the clip if CER is under threshold, reject or retry otherwise.

If the audio does not contain the words, the transcript will not contain them either. The
gate is objective, automatic, language-agnostic, and it runs at whatever scale your GPU does.
I have used the same loop to select TTS engines, to grade individual takes, to catch model
regressions after quantization, and to filter synthetic training data before it poisons a
dataset. Same harness every time; only the threshold changes.

## Best-of-N: the gate becomes a generator

Modern TTS is stochastic. The same model, same text, different sampling produces takes that
range from perfect to subtly broken, and occasionally to silent. Once you can score takes
automatically, the obvious move is to stop generating one:

- Generate N candidates per line (I use 4 to 6 for interactive work, up to 24 for hard lines).
- Score every candidate through the round-trip.
- Keep the winner. Optionally early-exit when a take clears a strict threshold.

The numbers this produces are not subtle. On one of my voices, single-shot synthesis averaged
0.30 CER while best-of-4 landed at 0.18, and with a better judge model the winning takes
measured under 0.05 on held-out text. Concretely: on a Spanish test line in my open-source
demo, three takes scored 0.02, 0.04, and 0.08, and the gate kept the first. No human compared
them. In practice best-of-N converts a mediocre-but-variable model into a reliable one, at
the cost of compute you were not otherwise using.

Two guards worth stealing even if you steal nothing else: an RMS-energy floor, because some
prompt phrasings intermittently produce silent audio that a transcript-based gate alone can
misread, and a per-take duration sanity check, because runaway generation is a failure mode
transcripts sometimes forgive.

## Calibrating the gate honestly

Three things will lie to you if you let them.

**Your judge is a model with a version.** The ASR model doing the transcription adds its own
error to every score, and when it improves, all your old numbers are stale. I learned this
the expensive way: a pinned judge added roughly 0.09 CER to everything for weeks and nearly
inverted an engine decision. The judge checkpoint is now a required, logged argument on every
run, and comparisons across different judges are banned. I wrote that incident up separately;
it is the companion piece to this one.

**Orthography is not intelligibility.** My target language has competing spelling systems,
and the ASR model was trained on one of them. Scored naively, a perfectly intelligible clip
takes a CER penalty for systematic spelling differences (a digraph rendered as a single
letter, consistently, every time). The fix is to normalize reference and hypothesis into a
shared orthographic skeleton before scoring. If your languages have flexible spelling,
romanization variants, or dialect orthographies, budget for this; it is the difference
between measuring the model and measuring the alphabet.

**CER is not beauty.** The round-trip gate measures whether the words survived. It does not
measure prosody, warmth, or whether the voice sounds like someone you would listen to. I have
had the best-scoring voice in a comparison be the worst-sounding one by ear. The division of
labor that works: the gate filters candidates at scale, and a human picks between the
survivors. Machines do volume; ears do taste, on a shortlist.

## What it catches in the wild

A non-exhaustive list from my own logs: silent takes triggered by particular emotion-control
phrasings; a diffusion TTS model that hallucinates syllables specifically on long compound
words; quality damage from an over-aggressive quantization pass that A/B listening missed;
synthetic training data whose transcripts had quietly diverged from their audio; and one
entire evaluation set that turned out to be misaligned, because the gate run on the *test*
data scored garbage and forced the question.

That last one generalizes: run the round-trip on any audio dataset you are about to trust,
including the ones you made yourself. Especially those.

## Try it

The harness is open source as a small, readable demo: a multi-model TTS router with
best-of-N generation and Whisper-based round-trip CER gating, using public models and
public-domain text. The repository includes kept-versus-discarded audio pairs from a real
run, same sentence, same model, different takes, so you can hear exactly what the gate
rejected without anyone having had to listen for it:

**github.com/Rodder5/local-tts-router**

It is deliberately small. The pattern is the product: synthesize, transcribe, score, gate.
If you ship TTS in languages your team cannot proofread, you already need it; you just may
not have written it yet.

---

*I build offline speech and language tooling (ASR, TTS, voice cloning, translation) for a
low-resource language on consumer hardware, solo. More field notes coming; the stale-judge
incident is the next post.*
