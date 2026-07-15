---
title: "An LLM ensemble took 59 minutes to miss a bug that regex found in 0.03 seconds"
description: "For one very common class of continuity bug, two local LLMs and an hour of compute lost to 840 lines of standard-library Python. The lesson generalizes."
pubDate: 2026-08-03
---

I spent a couple of weeks building a system to generate novels with local models. It mostly worked, and I have paused it, and that is a different post. This one is about a single result that came out of it, because the result surprised me and I think it generalizes well past fiction.

The short version: for one specific and very common class of bug, a language model is not just unnecessary. It is worse than a few hundred lines of pattern matching and arithmetic.

## The bug

Continuity errors are the ones that survive every read. Not typos, not plot holes you can see, but the ones where two facts on different pages quietly cannot both be true. Readers find them. Reviews mention them. They are the specific reason authors pay human continuity editors.

Here is the one I kept using as a test case. It is planted in a manuscript, split across three chapters, and it looks like nothing:

> Chapter 2: "He wrote the first one at nineteen."
> Chapter 5: "That song's held eleven years."
> Chapter 9: "Oh-nine? I was twenty-two."
> (The present day of the story is 2024.)

Take the first two facts. Nineteen when he wrote it, plus eleven years since, means he is thirty.

Take the third. Twenty-two in 2009, and it is now 2024, means he is thirty-seven.

He cannot be both. Nothing on any single page is wrong. You have to hold three facts from three chapters and do two small pieces of arithmetic to see it. This is exactly the kind of thing a human writer cannot catch in their own manuscript, because they are reading their memory of the book rather than the book.

## Attempt one: ask the models

The obvious approach, and the one I built first, was to have language models read the manuscript and reason about it. I ran an ensemble: two local models in the 27 to 31 billion parameter range, one wide pass tuned for recall, one strict pass tuned for precision, with agreement voting between them.

It did not go well.

| | |
|---|---|
| Runtime | 59 minutes on 4,500 words |
| Extrapolated to a novel | roughly 20 hours |
| Times it found the age bug | **zero, out of three attempts** |
| False positives | 57 |

The false positives were the interesting part. Some were merely useless, subjective writing notes dressed up as continuity findings ("cranking a ramp is strenuous," "navigating by feel is improbable"). But the worst ones were a different species entirely. The model built itself a summary of the story's facts, got that summary wrong, decided a morning scene had happened in the evening, and then **confidently flagged the correct text for contradicting the facts it had just invented.**

That is a fatal result, not a promising one. The entire value of a continuity report is that it is a short list of real problems. A long list that is mostly wrong, including confident accusations against text that is fine, destroys trust on the first read. Worse, it can lead an author to "fix" things that were never broken. Recall without precision is not a weak version of the product. It is a negative version of it.

I want to be precise about what failed here, because "local models are bad" is not the lesson. The models were fine at reading. They were fine at noticing an object left in the wrong place inside a single scene. What they could not do was hold several numbers from several chapters and reliably do arithmetic on them. That is a known weakness, and I had walked straight into building a product whose flagship feature sat directly on top of it.

## Attempt two: let the model extract, let code decide

So I inverted the division of labor. Instead of asking the model to *reason*, I asked it only to *extract*: pull out every dated or aged fact, with the exact quote it came from, as JSON. Then Python does the arithmetic.

This is a much better shape, and it nearly worked. It ran in about 30 seconds instead of an hour. But the extraction itself was unreliable. The model read "forty-some songs" as somebody's age of forty. It missed one of the three key facts entirely. It invented a year that was not in the text.

Fast, and wrong.

## Attempt three: delete the model

At this point the obvious question is why a model is in the loop at all. The facts I need are extremely patterned. Ages and years and durations in English prose do not have infinite surface forms. They have a lot of forms, but a lot is a finite number, and finite is what regular expressions are for.

So I wrote the extraction as pattern matching, and left the arithmetic in Python.

| | |
|---|---|
| Runtime | **0.03 seconds** |
| Found the age bug | **yes** (derived 30 from one chain, 37 from another) |
| Stayed silent on the clean version | yes |
| Model calls | zero |
| Cost | zero |

Six orders of magnitude faster than the ensemble, free, entirely offline, and it actually found the thing.

## Why this works, and where it stops

The lesson I took, and the one I think travels:

> **A language model is an excellent extractor and a poor calculator. Continuity errors of this kind are calculations. So do the extraction however you like, but never let the model do the arithmetic.**

Better still: if the facts you need are patterned, you may not need a model for the extraction either. That is the part I did not expect. I assumed the model was load-bearing and the code was glue. It was the reverse.

Code has two properties here that no model has at any size. It never fumbles arithmetic, and it never invents a fact. The ensemble's very worst behavior, hallucinating a ledger and then prosecuting the text against it, is not a thing a regex can do. It cannot make things up, because making things up is not in its repertoire.

This does not generalize to everything. Plenty of continuity errors are genuinely semantic and I cannot pattern-match them. If a character sets down a thermos and then, three paragraphs later, unscrews "it" while both hands are busy, resolving that "it" is coreference, and coreference needs a model. I am not claiming the model tier is useless. I am claiming it is the *residual*, not the core, and I had those exactly backwards.

## What I actually built

Eight checkers, all pure Python standard library, no model, no network, no dependencies. They cover ages and timelines, weekday and date arithmetic, activities that last longer than the character has lived somewhere, life events pinned to two different dates, both-hands-occupied physical impossibilities, objects used after being set down, names spoken by characters who were never told them, and stated distances between real cities that are wildly wrong.

About 840 lines of code. It audits a full novel in a fraction of a second, on your own machine, for nothing.

## The hard part was not the catching. It was the silence.

This is the part I would tell anyone building something similar, because it took me longest to learn and cost me the most rework.

Getting a checker to catch its bug is easy. Getting it to shut up about everything else is the entire job.

Two of my checkers passed clean on the manuscript I built them against, and then fired on perfectly good prose in the very next manuscript I tried. One flagged a legitimate sequence of days ("Thursday... so Friday") as a same-moment contradiction. Another decided that "cupped both hands around a mug" meant a character's hands were occupied, and then complained when they picked something up.

Both were fixed by making the checker *narrower*: requiring a stronger cue before firing. And that is the actual trade. Every one of these checks buys precision by giving up recall. They catch the clear version of their error and stay quiet otherwise, deliberately.

The rule I ended up with, which is now non-negotiable in the codebase: **a checker does not ship until it has stayed silent across multiple full manuscripts it was not built against.** Not unit tests. Whole books. A checker tested only on the manuscript that inspired it has not been tested.

The reason is commercial as much as technical. One false positive teaches a writer to distrust the tool. Three teach them to uninstall it. Precision here is not a quality metric. It is the entire product.

## Honest limits

It does not judge prose. It does not rewrite anything. It does not catch every kind of continuity error, and it is not trying to. It catches the deterministic, checkable families: numbers, dates, durations, physical simultaneity, object placement, names, real distances. Phrase a real bug unusually enough and it will sail straight past.

What it does, it does exactly, instantly, offline, and for free.

The code is on GitHub as [throughline](https://github.com/Rodder5/throughline), MIT licensed. The test suite includes clean public-domain prose that every checker must stay silent on, because silence is the property that matters.

If you are building anything that asks a model to reason over scattered facts and produce a number, I would genuinely encourage you to try writing the check in code first. I expected that to be the boring fallback. It turned out to be the answer.

---

*I build offline speech and language AI on consumer hardware, and the same discipline runs through everything I ship: generative output is only as good as the measurement that gates it. More field notes on the [home page](/), including the speech-side version of this lesson.*
