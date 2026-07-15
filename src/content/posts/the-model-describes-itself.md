---
title: "Ask an AI to describe a writer's voice and it will describe itself"
description: "I asked a model to describe a novelist's voice. It gave six confident signature constructions. A grep of 414,000 words of her actual prose found every one of them exactly zero times."
pubDate: 2026-07-27
---

I asked a language model to characterize the prose style of a top-selling novelist. It gave me six signature constructions, confidently, with examples. They were specific enough to be useful and plausible enough that I believed them.

Then I grepped 414,000 words of her actual prose to check.

**All six appeared zero times.**

Not "rarely." Not "less than I expected." Zero. The model had handed me a detailed, confident, entirely fabricated account of how a real person writes, and every one of those six constructions turned out to be something the model itself does constantly.

It was not describing her. It was describing itself, with her name on it.

## Why I was asking

I was trying to get a model to write in a specific voice rather than a generic one, because the deepest cause of AI-sounding prose is not grammar. It is that a model writes the statistically safest sentence available. It aims at the average of the genre. The result is competent and completely interchangeable, and readers feel it immediately even when they cannot name why.

The obvious fix is to give generation a specific target to hit instead of an average. So I needed a description of a real voice. And the obvious way to get one, when you have a language model sitting right there, is to ask it.

That is the mistake. It is a very natural mistake and I walked straight into it.

## The method that actually works

The fix turned out to be almost embarrassingly simple: **do not ask the model. Grep the corpus.**

The rule I settled on:

> A signature counts only if it actually recurs in the corpus. Cite the hit count. Cite verbatim samples. If you cannot find it in the text, it is not part of the voice.

And then the inversion, which is the part I think is genuinely reusable:

> **Anything the model produces that is absent from the corpus is not a style feature. It is the model's fingerprint, and it goes on the ban list.**

That is a general technique, and I want to state it plainly because I have not seen it written down anywhere. The diff between *what the model generates* and *what the corpus actually contains* is a direct measurement of the model's own tells in that domain. You do not need a detector. You do not need a classifier. You need a corpus and `grep`, and the model will happily hand you a labeled sample of its own reflexes if you ask it to imitate someone.

## What the model's fingerprints turned out to be

Here is a sample of what it attributed to her, and what it actually does. I am comfortable quoting these because they are not her prose. That is the entire point: they are the model's.

- **The capitalized mental-filing gag.** "Filed it under Later." "Filed under Facts I Did Not Ask For." A bureaucratic category invented for a punchline. Corpus hits: zero.
- **The self-annotating construction.** "Which is a sentence." "Which was another sentence I did not expect to say today." The prose stepping outside itself to comment on itself.
- **The legal-record hedge.** "I want to be clear that..." "I want the record to show..."
- **The mundane-object deflection.** "I told myself it was the low blood sugar." Reaching for a trivial physical cause to avoid naming a feeling.
- **Stock lyricism.** "Contains multitudes." "The breath she did not know she was holding."

Every blind reader panel I ran named these as the loudest AI tells in the drafts. They are not the romance voice. They are not her voice. They are *this model's* voice, and it had been quietly attributing them to a human being.

## Why this happens

I do not think the model is lying, and I do not think it is broken. I think the failure is structural, and once you see it you cannot unsee it.

The model has no privileged access to that author. When you ask it to describe her voice, it is not consulting a representation of her prose. It is generating **the kind of text that a description of a distinctive prose voice looks like**. It needs concrete-sounding specifics to fill that shape, so it produces the most available concrete specifics it has, which are its own priors about what distinctive prose looks like.

It is doing statistics, and the nearest statistics to hand are its own.

The tell is the confidence. It does not hedge. It does not say "I have not read her closely enough to say." It produces six crisp, quotable signatures with examples, because producing crisp quotable signatures with examples is what the question calls for.

## The second finding: you cannot blocklist your way out

Once I had the real list of the model's tics, I banned them by name in the prompt.

The model immediately invented fresh ones of the same kind.

Ban "filed it under Later" and you get a different bureaucratic-category joke. Ban the specific phrasing and you get the same move in new clothes. I named this whack-a-mole in my notes and eventually just accepted it as a law:

> **Banning named tics makes the model substitute new tics of the same family. You have to ban the family.**

So the ban list stopped being a list of phrases and became a list of *classes*:

- **Negation-restatement fragments.** "Not warmth. The opposite of warmth." Once is a voice. Twice in a chapter is machine cadence.
- **"Did the thing" scaffolding.** "My eyes did the thing." "Her voice did something I had not authorized."
- **Rule-of-three joke escalation.** Three swings at the same joke, each one more elaborate. Take one.
- **Self-naming metaphors.** "This felt like a metaphor I did not have the energy to unpack." Never announce your own figurative move.

The underlying principle, which survives any specific list: **if a construction does the same "look how clever I am" job three times, it is a machine parameter rather than a stylistic choice.** Vary it or cut it.

## Why this matters outside fiction

I found this while doing something fairly niche, but the failure mode is not niche at all, and this is the part I would actually want someone to take away.

Any time you ask a model to characterize a style, you may be reading the model rather than the subject.

- "Describe this author's voice." You get the model's voice.
- "What are the conventions in this codebase?" You may get the model's conventions, asserted about your code.
- "Summarize how our brand writes." You may get the model's register with your logo on it.
- "What makes this writer distinctive?" You may get a description of what makes *model output* distinctive.

The model will be specific, confident, and plausible in every one of those cases, because specificity, confidence, and plausibility are what the question rewards. None of them are evidence.

**The defense is cheap and it is always the same: verify against the source.** Count the hits. If the model claims a pattern, go find it in the text. If it is not there, you have learned something more valuable than what you asked for, because you have just been handed a free sample of the model's own fingerprints.

## Honest limits

This is one model, one author, one 414,000-word corpus, in one genre. It is a finding, not a study. I have not tested whether it holds across model families, or whether a model with the author's text actually in its context does better. My guess is that grounding it in the real text helps a lot, and that the failure is specific to asking it to characterize from memory, but I have not run that and I am not going to claim it.

What I am confident of is narrower and, I think, sufficient: **an AI asked to describe a voice from memory produced six confident signatures, and the corpus says it invented every one of them.** I would not have believed the size of that gap if I had not counted.

So count.

---

*I build offline speech and language AI on consumer hardware, and the same discipline runs through everything I ship: generative output is only as good as the measurement that gates it. More field notes on the [home page](/), including the speech-side version of this lesson.*
