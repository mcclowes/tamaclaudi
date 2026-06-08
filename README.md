# tamaclaudie

A Tamagotchi you raise from egg to adult in your terminal. A small Node CLI is its
body: deterministic stats that decay in real time. Claude Code, running on a loop, is
its mind: it reads the body's state, decides how the creature feels about it, talks to
you, and grows up over days.

The whole thing is one idea taken seriously: separate the body from the soul. Node owns
physics (hunger rises, energy falls, time passes). Claude owns psyche (what any of that
means to one little creature with its own temperament and dreams). Neither pretends to
do the other's job. See [DESIGN.md](DESIGN.md) for the full design.

## Quick start

```bash
npm install
npm run build      # compile to dist/
npm link           # optional: puts `tama` on your PATH

tama init          # lay an egg and roll a personality
tama status        # needs, age, stage, health
tama feed berries  # queue an action; the body feels it next tick
tama tick          # advance time
```

No build step needed for a quick poke: `npm run tama -- status` runs the CLI through
tsx.

By default the creature lives in `./creature`. Set `TAMA_HOME` to keep it somewhere
else (a real home directory, say): `export TAMA_HOME=~/.tama/creature`.

## Commands

```
tama init [name]      lay an egg and roll a personality
     --seed N           fix the random seed (reproducible creature)
     --real-stakes      neglect can be fatal (default: forgiving)
     --force            replace an existing creature (permanent)
tama status           mechanical truth: needs, age, stage, health
tama feed [food]      raise fullness; a favourite food raises more
tama play [game]      raise joy, costs energy
tama clean            raise hygiene
tama talk "..."       say something; the next tick replies in feed.md
tama tick             advance the body
tama listen           print what it's saying to you (feed.md)
tama diary [date]     print a history page (default: today)
```

Commands other than `tick` and `status` just append an event to the inbox and confirm.
The body feels it on the next tick, the soul reacts the tick after. So you feed it, and
a minute later it thanks you. That small delay is intentional.

## Bringing it to life: the soul loop

The body decays whether or not anyone's watching, but it has no inner life until Claude
Code is looping inside `creature/`:

```bash
cd creature
# in Claude Code:
/loop 3m tick
```

Each tick the loop runs `tama tick`, reads the diff and the soul files, and writes back
in character: its current state (`CLAUDE.md`), what it says to you (`feed.md`), and the
notable beats (`history/<date>.md`). The full procedure lives in `creature/TICK.md`,
written at birth and read every tick.

The honest catch: the creature only lives while the loop runs, and every tick spends
tokens. When no loop is running it's not dead, it's asleep. Life stage gates how fast it
decays unattended, so a baby left alone is in real trouble but an adult copes. Ticks are
meant to be cheap and a few minutes apart, not every few seconds.

## Growing up, and growing capable

The creature aspires to be useful to you, and it gets there by building a real mind
inside its own pen:

- `creature/knowledge/` — notes it researches and remembers.
- `creature/skills/` — reusable playbooks it writes for helping you.
- `creature/workshop/` — working tools and scripts it builds and tests.

### Hand it a problem

`tama talk` is a passing remark. A task is a standing goal you hand the creature to
work on across ticks until it's done:

```bash
tama task "improve the codebase"   # pose a problem
tama tasks                         # see what it's working on and its progress notes
```

Each tick the creature picks up open tasks ahead of its own pottering, makes real
progress in `workshop/`/`knowledge/`/`skills/`, logs notes (`tama task-note`), and
closes them out (`tama task-done`). A task is also the usual reason it proposes an
external action: when progress needs something outside the pen, it files a proposal and
waits for you.

### Watch what it wants

A task is something you hand it. A *goal* is something the creature wants for itself —
its own standing intention, formed and tended by the soul, never set by you. You only
watch:

```bash
tama goals          # what your creature wants right now
tama goals --all    # including the goals it's fulfilled or let go of
```

Goals arise three ways, and each one is tagged with which: **reacting** to something
that happened to its body (energy crashed, you were gone for hours), **sensing** what
would genuinely help you (its own read, not a task you gave it), or **organically**,
from its own curiosity, temperament, and the long arc of its aspiration. It forms them
with `tama goal`, makes progress with `tama goal-note`, reaches them with
`tama goal-done`, and — unlike a task — may gracefully `tama goal-drop` one it has
outgrown. The whole behaviour is steered by the soul's tick procedure (`creature/TICK.md`),
not by simulation; the body just keeps the list honest and durable.

### Acting beyond the pen

It can reach outside `creature/`, but only with your say-so. Nothing happens until you
approve it:

```bash
tama proposals          # external actions it wants to take
tama approve <id>       # let the loop carry one out
tama deny <id>          # decline
tama questions          # things it's curious about
tama answer <id> "..."  # answer one
```

When the creature wants to act outside its pen, it files `tama propose` and waits. The
loop only runs proposals you've approved. That gate is enforced by the loop's operating
procedure and by Claude Code's own permission prompts, not by a hard sandbox, so run the
loop in a permission mode you're comfortable with.

## How it's built

- `src/sim/` — the body. Pure, deterministic TypeScript: needs and decay (`stats.ts`),
  life stages (`stages.ts`), health and the forgiving-vs-real-stakes rules (`health.ts`),
  action effects through the seed (`effects.ts`), and the one tick function that rolls it
  all forward (`tick.ts`). No LLM, no clock reads, no randomness. Fully testable.
- `src/seed/` — the personality roll at birth, seeded so it's reproducible.
- `src/store/` — where the creature lives on disk and how it's read and written.
- `src/commands/` + `src/cli.ts` — the `tama` command surface.
- `creature/` — the soul's home. Owned by Claude Code on its loop, never by hand-rolled
  simulation. `stats.json` is the one shared surface, and Node owns every write to it.

The split that matters: `src/` never calls an LLM, and `creature/` is never written by
simulation logic. That keeps the body honest and the soul free.

```bash
npm test         # vitest, 76 tests
npm run typecheck
```
