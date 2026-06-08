# Code review: tamaclaudie

A holistic review from someone seeing this codebase for the first time. The brief was to criticize hard and surface the edge cases nobody's caught yet. I've tried to make every criticism teach something, because a finding you can't learn from is just a complaint.

Read the verdict, then the findings by severity. Each finding has the same shape: what's wrong, why it bites, and the lesson to carry forward.

---

## Verdict

The concept is strong and the code is tidier than most. The body/soul split is a real architectural idea, held consistently: `src/` is pure and deterministic, `creature/` is the LLM's world, and `stats.json` is the one shared surface with a clear owner. The simulation core is a pure function with no I/O or clock reads, which is exactly how you make game logic testable, and the tests lean on that well. Comments explain *why*, not *what*. Credit where it's due.

But "tidy" is hiding three classes of problem that a senior reviewer should not let through:

1. **The persistence layer is unsafe.** Every write can corrupt the save file, and a routine race between the soul loop and a user command silently eats data. This is the one that'll actually hurt someone.
2. **There's a whole feature shipped as dead code.** The `Task` type, its store functions, and its path all exist, fully written, wired to nothing. Someone built a room with no door.
3. **The safety story is prose.** The "it can act outside its pen, but only with approval" contract, the headline feature, is enforced by an instruction file the LLM is asked to obey. Nothing in code stops the loop from doing whatever it wants.

None of this is hard to fix. But the gap between how polished the code *looks* and how it *behaves under stress* is the main lesson here: clean code and correct code are different axes, and reviewers get fooled by the first one all the time.

---

## Critical: data integrity

### 1. The tick/command race silently destroys user actions

`src/store/io.ts:91`

```ts
export function drainEvents(p: CreaturePaths = paths()): CreatureEvent[] {
  const events = readEvents(p);          // read the file
  if (existsSync(p.events)) rmSync(p.events);  // ...then delete the whole thing
  return events;
}
```

The design has the soul loop running `tama tick` every few minutes *while you're poking the creature* with `tama feed`, `tama talk`, and so on. Those are separate processes. Now picture this ordering:

1. `tama tick` reads `events.jsonl` (say, two queued feeds).
2. You run `tama talk "good morning"`, which appends a third line.
3. `tama tick` calls `rmSync` and deletes the file, third line and all.

Your "good morning" is gone. No error, no trace. This is a classic time-of-check-to-time-of-use bug, and it's not theoretical here, it's the *normal* operating mode of the app: a background loop and a human both touching one file.

**The lesson.** "Read everything, then delete everything" is only safe when you're the only writer. The moment two processes share a file, you need either a lock or an atomic claim. The cheap fix: `renameSync` the inbox to a temp name first (rename is atomic on the same filesystem), then read and delete the temp copy. Anything appended after the rename lands in a fresh `events.jsonl` and gets caught next tick. The lock-free trick is to make your "take" operation a single atomic syscall.

### 2. Every JSON write can corrupt the save

`src/store/io.ts:29`

```ts
function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}
```

`writeFileSync` truncates the file, then writes. If the process dies between those two (Ctrl-C, OOM, laptop sleep, a crash in the loop), `stats.json` is left empty or half-written. Next read:

```ts
function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;  // throws on a truncated file
}
```

A `SyntaxError` from `JSON.parse`, and the creature is bricked. Every command that reads stats now throws. For an app whose entire point is a pet you nurture over nine days, a corrupted save is the worst possible failure, and the current code makes it a single ill-timed Ctrl-C away.

**The lesson.** Saves are sacred. The standard pattern is write-temp-then-rename: write to `stats.json.tmp`, `fsync`, then `renameSync` over the real file. Rename is atomic, so a reader sees either the old complete file or the new complete file, never a torn one. This belongs in `writeJson` so every store gets it for free.

### 3. One bad line in the inbox breaks every future tick

`src/store/io.ts:82`

```ts
return readFileSync(p.events, "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line) as CreatureEvent);  // throws on any malformed line
```

If `events.jsonl` ever gets a corrupt line (a half-flushed append from a crash, a manual edit, the race in finding #1 interleaving a write mid-line), `JSON.parse` throws and `tama tick` dies. Permanently, until someone hand-edits the file. The whole appeal of JSONL over a single JSON array is that it degrades line by line, and this code throws that away by letting one bad line kill the batch.

**The lesson.** When you choose a line-delimited format for resilience, parse it resiliently: wrap each line, skip and log the ones that don't parse, keep the rest. A format's robustness only exists if the reader honors it.

---

## High: the safety model is honor-system

### 4. "Acts only with approval" is enforced by an instruction file, not by code

`creature/TICK.md`, `README.md:96`, `src/types.ts:74`

The README is admirably honest about this:

> That gate is enforced by the loop's operating procedure and by Claude Code's own permission prompts, not by a hard sandbox.

So the headline safety feature, the creature can reach outside `creature/` but only once you approve, is a paragraph of prose asking the LLM to behave. The `Proposal` store records intent and the human's verdict, but nothing connects "approved" to "allowed to run." The loop is what runs the command, and the loop is the same agent that's being asked not to cheat. `tama resolve` is pure bookkeeping after the fact.

For a toy on your own machine this is a defensible v1, and the doc says so. But it's worth naming the risk plainly because the creature is explicitly told it "acts independently" and may "touch one of @mcclowes's repos." The blast radius is your filesystem, and the only seatbelt is Claude Code's own permission prompts plus the model's compliance.

**The lesson.** Security boundaries enforced by asking nicely aren't boundaries, they're suggestions. If the approval gate is meant to be real, the proposal's `command` has to be executed *by code that checks `status === "approved"` first*, ideally in a constrained runner (allowlisted commands, a working directory it can't escape). Until then, be precise in the docs: this reduces *accidental* overreach, it does not contain a determined or confused agent. The current docs mostly get this right, which is good. Don't let the framing drift toward "safe" in future copy.

---

## High: dead and phantom features

### 5. The entire task feature is wired to nothing

`src/store/agency.ts:113`, `src/types.ts:91`, `src/store/paths.ts:45`

There's a complete, careful implementation of tasks: the `Task` and `TaskStatus` types, `readTasks`, `writeTasks`, `addTask`, `noteTask`, `finishTask`, and a `tasks.json` path. It's good code. It's also unreachable. `cli.ts` has no `task` command, `commands/` has no handler, the README and `tama help` never mention it, and no test touches it. The `Task` import in `agency.ts:2` is the only thing keeping the type alive.

This is worse than a missing feature. A future reader (or the next agent) finds polished, tested-looking code and assumes it works end to end. It doesn't, and there's no signpost saying so. Dead code rots: it drifts out of sync with everything around it because nothing exercises it.

**The lesson.** Code that isn't reachable from an entry point isn't "done," it's a liability. Either finish the wiring (a `tama task` / `tama tasks` / `tama note` / `tama finish` surface) in the same change that adds the store, or don't commit the store yet. If you must land it ahead of the UI, leave a loud marker: a tracking issue, a `// not yet wired: see #N` comment, anything. Half-features should announce themselves.

### 6. The settings allowlist a `tama config` command that doesn't exist

`.claude/settings.local.json`

```json
"Bash(tama config *)"
```

There is no `config` case in `cli.ts`. So either this is a leftover from a renamed or abandoned command, or someone planned it and never built it. Allowlisting a command that doesn't exist is harmless today but it's a small lie in your config, and small lies accumulate into the kind of settings file nobody trusts or dares to clean up.

**The lesson.** Treat config as code. A permission entry for a phantom command is dead config, same problem as dead code. Grep your allowlist against your actual command surface now and then.

---

## Medium: correctness and edge cases the tests miss

### 7. `--seed abc` silently becomes seed 0

`src/cli.ts:95`, `src/seed/generate.ts:11`

```ts
rngSeed: typeof seedFlag === "string" ? Number(seedFlag) : undefined,
```

`Number("abc")` is `NaN`. Then in `makeRng`, `NaN >>> 0` is `0`. So `tama init --seed abc` doesn't error, it quietly rolls the seed-0 creature, and the user who fat-fingered their reproducible seed has no idea they got a different pet than they asked for. The `--seed` flag's whole purpose is reproducibility, and this path defeats it silently.

**The lesson.** Validate at the boundary, fail loud. `Number()` returning `NaN` is one of JavaScript's quietest footguns. If a flag must be a number, check `Number.isFinite` and throw a clear message. Silent coercion to a wrong-but-plausible value is the worst kind of bug because nothing looks broken.

### 8. `--force` reincarnates the pet but keeps the old one's memories

`src/commands/init.ts:24`

`init` with `--force` overwrites `seed.json`, `stats.json`, `config.json`, `CLAUDE.md`, `TICK.md`, and `feed.md`. It does **not** touch `events.jsonl`, `proposals.json`, `questions.json`, `tasks.json`, `history/`, `knowledge/`, `skills/`, or `workshop/`. So your brand-new creature is born with the previous creature's queued feeds in its inbox, its pending proposals, its diary, and its accumulated "mind." `tama diary` will show a freshly hatched egg's memories of things the dead pet did.

The flag's own help text calls it "replace an existing creature (permanent)." Users will reasonably read that as a clean slate. It isn't.

**The lesson.** "Replace" means replace. When you reset an entity, enumerate everything that belongs to it and clear all of it, or explicitly document what survives and why. Partial resets that leave ghost state are confusing precisely because they *mostly* work. Either wipe the whole pen or rename `--force` to something honest about what it keeps.

### 9. Recovery is instant and total, which quietly removes the stakes

`src/sim/health.ts:53`

```ts
if (!inDanger) {
  return { health: "well", ailingSince: null, warning: null };
}
```

A creature that's been `sick` from days of neglect becomes fully `well` the instant a single feed lifts the lowest need above 15. The ailing timer resets to null. There's no convalescence, no lingering effect. Combined with the fact that `sick` has *no mechanical consequence anywhere* (it doesn't change decay, behavior, or stage progression), "sick" is a cosmetic label that a single command erases.

The DESIGN.md asks the right question ("a Tamagotchi you can't fail is a screensaver") and then the health model mostly answers it the screensaver way. That may be a deliberate "forgiving v1" choice, but right now the forgiveness is so total that the threat the design wants doesn't exist in forgiving mode at all.

**The lesson.** Decide what your states are *for*. If `sick` should matter, it needs a cost (slower recovery, a stat penalty, a recovery period before it clears). If it shouldn't, don't model it as a health state with a timer. A state that has a timer but no consequence is a tell that the design and the code disagree about what the state means.

### 10. The clock can run backward and double-charge decay

`src/sim/tick.ts:75`

```ts
const hoursElapsed = Math.max(0, (nowMs - lastTickMs) / MS_PER_HOUR);
// ...
lastTick: now.toISOString(),
```

The `Math.max(0, ...)` guards against negative elapsed time (NTP correction, manual clock change, VM time sync), which is good. But the new `lastTick` is set to `now` unconditionally. So if `now` is *earlier* than the stored `lastTick`, the tick does no decay (fine) but rewinds `lastTick` to the earlier moment. The next real tick then measures elapsed time from that rewound point and decays the rewound interval a second time.

**The lesson.** Guarding the *output* of a time delta isn't the same as keeping your clock monotonic. If wall-clock time is your source of truth, your stored "last seen" timestamp should never move backward: `lastTick: new Date(Math.max(lastTickMs, nowMs)).toISOString()`. Defend the invariant, not just the symptom.

### 11. `hoursElapsed` and actual decay disagree across the hatch boundary

`src/sim/tick.ts:75` vs `:84`

`hoursElapsed` is measured from `lastTick`, but decay is measured from `max(lastTick, hatchMs)` because eggs don't decay. Correct for the math. But the diff handed to the soul reports `hoursElapsed` (say "112h elapsed") while the needs only moved for the post-hatch hours. The soul is told to narrate the gap from that number, so it'll narrate hunger that the body didn't actually accrue.

**The lesson.** When two numbers in your output are derived from different intervals, a consumer that assumes they agree will be subtly wrong. If the soul reasons from `hoursElapsed`, give it the decay-relevant elapsed time, or label both.

### 12. Substring matching makes short food/game/topic args match almost anything

`src/sim/effects.ts:17`

```ts
return a === i || a.includes(i) || i.includes(a);
```

The bidirectional `includes` is too eager. `tama feed f` matches any food containing "f" (and any one-letter arg matches a pile of likes/dislikes), so a typo can trigger a favourite-food bonus or a dislike sulk the user never intended. Fuzzy matching is nice, but `i.includes(a)` for a one-character `a` is matching noise.

**The lesson.** Fuzzy matching needs a floor. Require a minimum length before doing substring containment, prefer whole-word or prefix matching, or normalize and compare tokens. "Be lenient" shouldn't mean "match on a single letter."

### 13. The inbox model silently drops repeated actions

`src/sim/effects.ts`, `src/sim/tick.ts:89`

Every queued event is applied in sequence, each clamped to 100. Feed a hungry-but-not-starving creature three times before a tick and two of those feeds evaporate against the clamp. The user did three things; the creature reacts as if to one. The README sells "you feed it, and a minute later it thanks you," but it won't thank you for the other two.

**The lesson.** When you batch user intent, decide explicitly what batching means. Clamping after summing turns "I did this three times" into "I did this once," which may be fine, but it should be a decision, not a side effect of the data structure. At minimum the soul could be told "fed 3x" so the narration matches what the user actually did.

### 14. Diary dates are UTC, so "today" can be tomorrow

`src/store/paths.ts:57`

```ts
export function dateStamp(now: Date): string {
  return now.toISOString().slice(0, 10);  // always UTC
}
```

`tama diary` with no argument defaults to the UTC date. A user on the US west coast in the evening is already on the next UTC day, so "today's" diary is empty and yesterday's entries are filed under a date they wouldn't guess. For a feature whose value is "read the story months later," getting the day boundary wrong is a quiet papercut.

**The lesson.** "What day is it" is a UI question, and UI is local. Storing in UTC is fine; *defaulting the user-facing date* to UTC is the bug. Use local time for the default, or document that days roll at UTC midnight.

---

## Low: smaller things and good habits

- **`nextId` has a race and a fragile parse.** `src/store/agency.ts:15`. Two concurrent `propose` calls can mint the same id (read-max-then-increment across processes), same family of bug as #1. And `item.id.replace(prefix, "")` replaces the first occurrence of the prefix *anywhere*, which happens to work only because ids are `p1`, `q2`, `t3`. It's a latent trap if a prefix ever appears mid-id.

- **Stage logic is coupled to array order in two places.** `src/sim/stages.ts:33`. `stageForAge` relies on `STAGES` being declared in ascending-onset order. It is, today. But the correctness of the loop depends on a declaration order in a different file, with nothing enforcing it. A sort by onset, or a test that asserts the ordering, removes the footgun.

- **`tama approve p1 p2` silently ignores `p2`.** `src/commands/agency.ts:56`. Extra positional args to the agency commands are dropped without a word. Either support multiple ids or reject the extras.

- **No upper bound on input size.** `tama talk "...50KB..."` goes straight into `events.jsonl` and then into the diff and the soul context. Probably harmless, but unbounded user input flowing into an LLM's context is the kind of thing you bound on purpose, not by luck.

- **`creature/` is committed to this repo's working tree even though it's gitignored.** Not a bug (the ignore works), but it means `tama init` in a fresh clone here will hit "a creature already lives" against the on-disk sample. Worth a note in the README, or ship the sample under a different name.

---

## Test coverage: good where it is, absent where it matters

56 passing tests, and the sim math is genuinely well covered: decay, stages, health transitions, the seed roll, and a nice end-to-end "born → hatches → fed" path. That's the easy 80%.

The gaps line up exactly with the bugs above, which is not a coincidence, it's *why* they're still here:

- **`store/io.ts` has no tests.** The drain race (#1), non-atomic writes (#2), and brittle line parsing (#3) all live in untested code. The persistence layer is the riskiest part of the app and the least tested.
- **`cli.ts` arg parsing is untested.** The `--seed NaN` coercion (#7) would've been caught by one test.
- **`--force` is untested beyond "refuses without it."** The stale-state bug (#8) is wide open.
- **`render.ts` is untested.** Cosmetic, but it's the soul's only input.
- **The task store (#5) has no tests**, which is part of how it shipped unreachable without anyone noticing.

**The lesson for the team.** Test coverage clusters around the code that's *easy* to test, which is usually the pure logic, which is usually the part least likely to be wrong. The dangerous code, I/O, concurrency, process boundaries, is harder to test and therefore tends to be where the real bugs hide. When you see "56 tests passing" and a clean sim, ask where the *integration* and *failure-path* tests are. Here, they're missing exactly where the money is.

---

## Edge cases, collected

A checklist of inputs and conditions the current code handles wrong or surprisingly:

| Scenario | Current behavior | Should be |
|---|---|---|
| `feed` appended during `tick`'s drain | Action silently lost (#1) | Atomic claim, no loss |
| Process killed mid-write | `stats.json` corrupted, creature bricked (#2) | Atomic write, old state survives |
| One malformed line in `events.jsonl` | Every future tick throws (#3) | Skip the bad line, keep the rest |
| `tama init --seed abc` | Silently uses seed 0 (#7) | Error: not a number |
| `tama init --force` | Keeps old inbox, proposals, diary, mind (#8) | Clean slate, or documented |
| Sick creature fed once | Instantly fully well (#9) | Some recovery cost |
| System clock moves backward | `lastTick` rewinds, decay double-counts later (#10) | `lastTick` never regresses |
| `tama feed f` | Spurious like/dislike match (#12) | Minimum match length |
| Feed 3x before a tick | Two feeds vanish to the clamp (#13) | Decide and surface batching |
| `tama diary` after UTC midnight, local evening | Empty or misfiled (#14) | Local day default |
| Two `tama propose` at once | Possible duplicate ids | Atomic id allocation |

---

## What to fix first

If I were prioritizing this as the new owner:

1. **Make persistence safe** (#1, #2, #3). Atomic writes and an atomic inbox claim. This is the one that loses real user data, and it's a half-day of work that touches one file.
2. **Resolve the dead code** (#5, #6). Either wire up tasks or pull them, and clean the phantom `config` permission. Cheap, and it stops the codebase lying to the next reader.
3. **Fix `--force` and `--seed` validation** (#7, #8). Small, user-facing, and currently surprising.
4. **Decide what `sick` is for** (#9). A design call, not just a code fix, but the current model wants stakes it doesn't deliver.
5. **Backfill tests for `io.ts` and the CLI boundary.** So the next regression in the dangerous code gets caught by CI, not by a user with a corrupted pet.

---

## The through-line for the team

Three habits would've caught most of this:

**Assume two writers.** The moment you have a background loop and a user at a terminal, every shared file is a concurrency problem. "It works when I test it by hand" is the sound of a race you haven't hit yet.

**Untested I/O is where bugs live.** Pure functions are easy to test and rarely wrong. The crashes, the corruption, the lost data, that's in the boring file-handling code nobody wants to write tests for. Write them anyway.

**Clean isn't correct.** This codebase reads beautifully and behaves dangerously under stress. Those are independent properties. A reviewer's job is to resist being charmed by tidy code and go looking for what happens at the edges, on a crash, and when two things run at once.

The bones here are good. The fixes are small. Make the save layer bulletproof, delete the code that doesn't run, and stop trusting prose to enforce a boundary, and this goes from a charming demo to something you'd actually leave running.
