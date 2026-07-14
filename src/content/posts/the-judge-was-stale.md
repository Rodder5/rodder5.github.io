---
title: "The judge was stale: how a frozen evaluator almost inverted a licensing decision"
description: "Every quality score in my TTS pipeline comes from a model. Models age. Mine aged silently and nearly flipped a real decision."
pubDate: 2026-07-14
---

*Field notes from building speech AI for a low-resource language, where every quality score
comes from a model, and models age.*

I build text-to-speech for a language I do not speak natively. That constraint shaped the
whole evaluation system: I cannot listen to a clip and know whether it said the right thing.
Nobody on the project can proofread by ear at volume, which, if you squint, is also the
situation of every team shipping TTS in 74 languages. So quality is measured, not vibed:
synthesize the line, transcribe it with the project's best ASR model, compute character error
rate against the target text. I call it round-trip gating. Low CER means the audio actually
contains the words. It has been the backbone of every TTS decision for months.

Here is the failure. The round-trip judge is itself a model, and my synthesis pipeline had
the judge pinned to a specific ASR checkpoint. Call it V72: the production model at the time
the harness was written, a strong model, 2.14% CER on its test set. Then ASR moved on. V74
shipped, then V77, each measurably better. The TTS pipeline kept calling V72. Nothing failed.
Nothing warned. Every TTS experiment for weeks was scored by an ASR model that was no longer
the best listener in the building.

The damage was not random noise. A weaker judge adds its own mis-hearing to every score, and
it adds more of it to voices it finds unfamiliar. When I finally re-judged the same audio
with V77, the size of the bias came out to roughly 0.09 CER, added to essentially everything.
That is not a rounding error. In this project 0.09 is the difference between "usable voice"
and "reject."

It gets worse, because the bias was not even. At the time I was comparing two candidate
voices for the same speaking role:

- A LoRA fine-tune on a cloning model with a non-commercial license. Its headline score was
  a spectacular 0.016 CER, measured in-domain, judged by V72.
- A tiny permissively-licensed VITS voice (Piper), trained from scratch on about five hours
  of clean speech. Best-of-4 on held-out text, judged by V72: 0.144.

On those numbers the conclusion writes itself. The NC model is nine times better. Licensing
is a problem for future me; quality wins today. That conclusion was heading into a real
decision about which stack to invest in.

Then I re-judged both voices with the current best ASR, on the same held-out set, same
best-of-4 protocol:

| Voice | Old judge (V72) | Current judge (V77) |
|---|---|---|
| Permissive VITS voice | 0.144 | **0.047** |
| NC cloning fine-tune | 0.016 (in-domain) | 0.137 (held-out) |

The leaderboard did not shift. It inverted. The permissive voice had been nearly three times
better on honest held-out material the entire time, and the "champion" number was a stack of
two artifacts: an in-domain test set flattering the fine-tune, and a stale judge whose
mis-hearings happened to penalize the voice with the cleaner prosody. The licensing decision
I nearly made was wrong, and I would have paid for it in both money and architecture.

## What actually went wrong

Nothing exotic. Three small, boring things compounded:

1. **The judge was hardcoded.** A path to a checkpoint, written once, correct on the day it
   was written. Configuration rot with a scientific-looking output.
2. **Scores were treated as absolute.** A CER of 0.144 got compared against a CER of 0.016
   from a different eval context as if they were the same instrument. They were not even the
   same test set.
3. **History was never re-scored.** When the judge improved, old numbers stayed in the
   comparison tables. Old numbers do not age gracefully; they age silently.

If you have spent time with LLM-as-judge evaluation, this whole story should feel familiar.
The judge model version, the judge's systematic preferences, in-domain flattery, frozen
baselines quoted forever: same disease, different modality. Speech just makes it concrete
enough to measure. My judge's bias was 0.09 CER. What is yours?

## The fixes, all cheap

- **The judge is a required argument now.** No default. Every synthesis-eval run states which
  ASR checkpoint scored it, and the scoreboard records it next to every number. A score
  without its judge version is treated as no score.
- **The judge tracks the best model by policy.** When a new ASR model wins on held-out data,
  the first thing that happens is not celebration; it is a re-judging pass over every TTS
  result that still matters.
- **Comparisons only within a judge.** Cross-judge deltas are meaningless and the tooling now
  refuses to print them side by side.
- **Held-out only, always.** In-domain numbers are allowed to exist for debugging and are
  banned from decisions.

None of this required new infrastructure. It required admitting that an evaluator is a
dependency with a version, like any other, and versioned dependencies go stale.

## The general rule

If a model scores your models, then your evaluation has a model in the loop, and every
property you worry about in production models applies to it: drift, bias, staleness, domain
sensitivity. The uncomfortable corollary is that improving your production model quietly
invalidates your historical evaluations, because your best judge just changed. Budget for
re-judging the past the same way you budget for retraining.

I got lucky: the stale judge under-scored the option I was about to reject, so curiosity
about one weird number saved the decision. Luck is not a process. Version your judge.

---

*I build offline speech and language tooling (ASR, TTS, voice cloning) for a low-resource
language on consumer hardware, solo. The round-trip gating harness from this post is open
source, with audible kept-versus-discarded examples: github.com/Rodder5/local-tts-router.*
