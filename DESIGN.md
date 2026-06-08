# Tamaclaudie — design doc

A Tamagotchi you raise from baby to adult in your terminal. A small Node CLI is its
body: deterministic stats that decay in real time. Claude Code, running on a loop, is
its mind: it reads the body's state, decides how the creature *feels* about it, talks to
you, and grows up over days. You poke it with commands (`tama feed`, `tama talk "..."`);
it pokes back through a feed file and a diary.

The whole thing is one conceit taken seriously: **separate the body from the soul.**
Node owns physics (hunger goes up, energy goes down, time passes). Claude Code owns
psyche (what any of that *means* to a particular little creature with its own
temperament and dreams). Neither one pretends to do the other's job.

Broadly, your creature is aspiring to be a useful assistant, but with its own personalty and quirks. It seeks to empower itself to help you more. It acts independently.

## The honest catch (read this first)

The creature only lives while the loop is running. Claude Code isn't a daemon. It
advances the inner life only when a session is actively ticking, and every tick spends
tokens. So three things are true and shape the whole design:

1. **Wall-clock time is the body's clock; tick count is the soul's clock.** When you
   come back after 8 hours, Node has decayed the needs for 8 real hours, but the
   creature has no *memory* of those hours until the next tick interprets them. The tick
   narrates the gap ("you were gone a while, I got so hungry"), it doesn't relive it.
2. **Ticks should be cheap and infrequent.** Every few minutes while you're around, not
   every few seconds. The body keeps decaying between ticks for free, so we lose nothing
   by ticking slowly.
3. **The creature can sleep.** When no loop is running, it's not dead, it's asleep. This
   is a feature, not a bug, and we lean into it (life stages gate how fast it decays
   while unattended, so a baby left alone is in real trouble but an adult copes).

If this token/liveness cost feels wrong later, the fallback is the hybrid model: Node
handles canned reactions offline, Claude enriches them when a loop is live. Noted, not
chosen.

## File layout

Two zones, owned by two different brains, so neither stomps the other.

```
tamama-claudie/
  package.json
  src/                     # the body — deterministic TypeScript, no LLM, fully testable
    cli.ts                 # arg parsing, command dispatch
    sim/
      stats.ts             # needs model + decay math
      stages.ts            # life-stage rules (egg -> baby -> ... -> adult)
      health.ts            # sickness/recovery/death rules
      tick.ts              # advance(state, now) -> new state + what changed
    seed/
      generate.ts          # roll a personality at birth
    store/
      paths.ts             # where the creature lives on disk
      io.ts                # read/write json + markdown, append events
    commands/              # one file per command: feed, play, talk, status, tick, init
  src/**/*.test.ts         # tests next to the code they test
  creature/                # the SOUL — owned by Claude Code on its loop, plus the save
    CLAUDE.md              # current state of being; doubles as the loop's own context
    seed.json              # immutable: name, temperament, aspirations, preferences
    stats.json             # mutable mechanical state; owned by Node
    events.jsonl           # user actions waiting to be felt (the inbox)
    feed.md                # the creature's latest words to you
    history/
      2026-06-08.md        # dated diary: key moments, milestones, things it said
```

The split that matters: **`src/` never calls an LLM, `creature/` is never written by
hand-rolled simulation logic.** `stats.json` is the one shared surface, and Node owns
writes to it. Claude reads it, never edits it. That keeps the body honest and the soul
free.

`creature/CLAUDE.md` is the clever bit. It's both the human-readable "how is my pet
doing" save file *and* the context Claude Code loads when it loops inside `creature/`.
The creature's current mood, fixations, and recent memories live there, so each tick the
loop wakes up already knowing who it is. State and prompt are the same file.

## The body: simulation

### Needs

Each is 0–100, decays toward 0 over real time, and is raised by specific actions. Starting
set, trim later:

| Need | Decays | Raised by | Neglect means |
|------|--------|-----------|----------------|
| `fulfillment` | steadily | Successfully helping @mcclowes | Seeks ways to be able to be helpful |
| `happiness` | steadily | doing things it finds fun (specific on pet seed) | writes sad poetry in markdown files on device |
| `energy` | with activity, restores in sleep | rest, sleep | crankiness, refuses to play |
| `joy` | slowly | mainly solving problems & reaching goals (`task-done`, `goal-done`); a smaller lift from play, talk, favourite things | withdrawn, sad diary entries |
| `bond` | very slowly | attention of any kind | doesn't trust you, slow to grow |

Decay rates scale by life stage. A baby's `fullness` falls fast and it can't self-soothe;
an adult is steady and resilient. This is what makes the early days demanding and the
payoff real.

### Life stages

Driven by age in real (wall-clock) days, gated on not having been neglected into
sickness too often.

```
egg -> baby -> child -> teen -> adult
 0d    ~0.5d   ~2d      ~5d     ~9d      (tunable)
```

Each stage changes decay rates, unlocks behaviors (a baby babbles, a teen gets moody and
opinionated, an adult pursues its aspiration), and is a milestone worth a history entry.
Reaching adult with its aspiration met is the "win". There's no score, just a creature
you raised.

### Health and death

Needs pinned near 0 for too long -> `sick`. Sick + still neglected -> worse. We keep v1
forgiving: death is possible but slow and always preceded by clear warnings in the feed.
The threat is what gives feeding it actual stakes; a Tamagotchi you can't fail is a
screensaver. (Open question below on how punishing to make this.)

### Tick

The heart of the body. Pure function:

```
advance(state, now) -> { state, changes }
```

It rolls time forward from `state.lastTick` to `now`: decays needs, applies queued
events from `events.jsonl`, recomputes stage and health, and returns a structured diff of
what changed. No randomness in decay (deterministic and testable); the only rolls are at
birth (the seed) and small flavour rolls the soul layer can make for itself.

## The soul: what a tick does in Claude Code

The loop runs `/loop` inside `creature/`, every few minutes. Each tick:

1. **Run `tama tick`** — Node advances the body, drains the event inbox, writes
   `stats.json`, and prints a diff: time elapsed, needs now, what you did since last tick,
   any stage/health change.
2. **Read the soul** — `seed.json` (who it is), `stats.json` (how its body is), and the
   current `creature/CLAUDE.md` (who it was last tick, what it was fixating on).
3. **Interpret, in character** — turn raw numbers into feeling, filtered through the
   seed. `fullness: 20` for a creature that loves routine reads as anxious; for an
   easygoing one, mild. The seed is the lens.
4. **Write back three things**:
   - `creature/CLAUDE.md` — updated current state of being (mood, what it wants, what
     it's thinking about, short-term memory of you).
   - `feed.md` — what it actually says to you right now, in its voice.
   - `history/<today>.md` — append only the genuinely notable: milestones, first words,
     a day it was sad you were gone, a dream about its aspiration.
5. **Sleep** until the next tick.

Claude writes prose, never numbers, into the soul files. It never edits `stats.json`. If
it wants to nudge the body (the creature decides to nap), it does so by *suggesting an
action you or the loop runs*, not by editing stats directly. Body stays authoritative.

## The seed: a personality rolled at birth

`tama init` rolls `seed.json` once and never changes it. This is the DNA that makes two
creatures feel different:

- **name** — generated, or you pass one.
- **temperament** — a few axes (e.g. bold↔timid, sunny↔melancholy, calm↔excitable,
  cuddly↔aloof). Drives tone.
- **aspiration** — what it dreams of becoming by adulthood (e.g. "a great explorer", "the
  world's most beloved napper"). The long arc the soul layer steers toward.
- **likes / dislikes** — favourite foods, activities, topics. Hitting a like gives a
  bigger need boost *and* better dialogue; a dislike, the opposite.
- **quirks** — one or two oddities (afraid of the dark, hiccups when excited).
- **love language** — which interaction raises `bond` most (talk vs play vs feed).

These bias both the math (likes give bigger boosts) and the narration (everything is
spoken through this lens). The seed is small, fixed, and the single source of "why is
mine like this".

## CLI commands (v1)

```
tama init [name]      # roll the seed, lay an egg, write the creature/ files
tama status           # mechanical truth: needs, age, stage, health. no voice.
tama feed [food]      # raise fullness; favourite food raises more
tama play [game]      # raise joy, cost energy
tama clean            # raise hygiene
tama talk "..."       # log something you said; the next tick responds in feed.md
tama tick             # advance the body (the loop calls this; you can too)
tama listen           # print feed.md — what it's saying to you
tama diary [date]     # print a history file
```

Commands other than `tick`/`status` just append an event to `events.jsonl` and confirm.
The body feels them on the next tick, the soul reacts to them the tick after. That small
delay is fine and even nice: you feed it, and a minute later it thanks you.

## State and history formats

`stats.json` — machine-owned, boring on purpose:

```json
{
  "bornAt": "2026-06-08T16:00:00Z",
  "lastTick": "2026-06-08T17:30:00Z",
  "stage": "baby",
  "health": "well",
  "needs": { "fullness": 62, "energy": 40, "hygiene": 80, "joy": 55, "bond": 30 }
}
```

`creature/CLAUDE.md` — soul-owned, human-readable, and the loop's own standing context.
Rough shape:

```markdown
# <name>, a <stage>

## Right now
One or two lines on mood and what it wants.

## On my mind
What it's fixating on this tick: a memory of you, a worry, a small joy.

## What I remember about you
Short, rolling. Last few notable interactions, in its words.

## My dream
Its aspiration and how close it feels.
```

`history/<date>.md` — append-only diary. Only notable beats, dated and timestamped, so
months from now you can read the story of raising it.

## Open questions for you

1. **How punishing is death?** Forgiving (warnings, easy recovery, basically can't lose by
   accident) or real stakes (neglect a baby for a day and it can actually die)? I lean
   forgiving for v1, real-stakes as a toggle.
2. **Tick cadence and cost.** Every ~3 min while a loop runs feels right. Fine with that,
   or do you want a slower, cheaper heartbeat?
3. **One creature or many?** v1 assumes a single creature at a fixed path. Multiple saves
   is easy to add but adds surface. Single for now?
4. **Git + issues?** This isn't a repo yet. Your global workflow tracks work in GitHub
   issues. Want me to `git init` and open issues per milestone, or keep it local for now?

## Build plan

Once this doc is agreed, milestones in order:

1. **Body, tested.** `sim/` + `store/` + `tama init/status/tick/feed/play/clean/talk`.
   Pure TypeScript, Vitest, no LLM. The creature can be born, fed, and decay correctly.
2. **Seed.** `seed/generate.ts` and the personality roll, wired into `init`.
3. **Soul loop.** The `/loop` tick procedure above, writing `CLAUDE.md` / `feed.md` /
   diary in character. This is where it comes alive.
4. **Stages and stakes.** Stage transitions, health/death, the milestones that make a
   9-day arc feel like raising something.

Each milestone is a thing you can actually run and play with, not a layer you have to
wait on.
