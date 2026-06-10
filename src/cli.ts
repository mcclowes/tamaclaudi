#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultContext, type CommandContext } from "./commands/context.js";
import { init } from "./commands/init.js";
import { tick } from "./commands/tick.js";
import { queueAction } from "./commands/actions.js";
import { status, listen, diary } from "./commands/read.js";
import { watch } from "./commands/watch.js";
import { config } from "./commands/config.js";
import { achievementsView } from "./commands/achievements.js";
import {
  propose,
  ask,
  proposals,
  approve,
  deny,
  resolve,
  questions,
  answer,
  task,
  tasks,
  taskNote,
  taskDone,
  goal,
  goals,
  goalNote,
  goalDone,
  goalDrop,
} from "./commands/agency.js";
import {
  capabilities,
  deliver,
  deliverables,
  take,
  shelve,
  remember,
  mood,
  memory,
  wear,
} from "./commands/growth.js";

const HELP = `tamaclaudie — raise a creature in your terminal

Usage: tama <command> [args]

  init [name]      lay an egg and roll a personality
       --seed N        fix the random seed (reproducible creature)
       --real-stakes   neglect can be fatal (default: forgiving)
       --force         replace an existing creature (permanent)
  status           mechanical truth: needs, age, stage, health
  config [real-stakes on|off]   show or flip runtime config on a living creature
  watch            live dashboard: the pet, what it's saying, what needs you
                     (type a line and hit Enter to chat with it inline)
  feed [food]      raise fullness; a favourite food raises more
  play [game]      raise joy, costs energy
  clean            raise hygiene
  wear [item|off]  put a cosmetic accessory on (e.g. a hat), or take it off
  rest             settle down to recover energy (quiet ticks also recover it)
  talk "..."       say something; the next tick replies in feed.md
  tick             advance the body (the soul loop calls this; you can too)
  listen           print what it's saying to you (feed.md)
  diary [date]     print a history page (default: today, YYYY-MM-DD)
  capabilities     what your creature has learned to do for you (its skills)
  achievements     the trophy cabinet: milestones earned and still to earn

 hand it a problem to work on:
  task "..."             give the creature a problem to pursue across ticks
  tasks [--all]          list tasks (default: open ones)
  task-note <id> "..."   (soul) log progress on a task
  task-done <id> "..."   (soul) close a task with an outcome

 its own goals (the creature forms these itself; you just watch):
  goals [--all]          what your creature wants right now (default: active)
  goal "..." [--origin reactive|owner|organic --spark ".."]
                         (soul) form a goal of its own
  goal-note <id> "..."   (soul) log a step or reflection on a goal
  goal-done <id> "..."   (soul) fulfil a goal it reached
  goal-drop <id> "..."   (soul) let go of a goal that no longer fits

 finished work it hands back (the soul files these; you pick them up):
  deliverables [--all]   work it's finished and offered you (default: ready ones)
  take <id> ["note"]     accept a deliverable into your hands
  shelve <id> ["note"]   set one aside for now
  deliver "..." [--summary .. --path ..]   (soul) hand back a finished piece of work

 what it carries across ticks (the soul tends these; you watch):
  memory                 the mood and beats it's carrying right now
  remember "..."         (soul) keep a durable beat across ticks
  mood "..."             (soul) set its standing mood

 the creature's agency (the soul files these; you adjudicate):
  proposals [--all]      external actions it wants to take (default: open ones)
  approve <id>           approve a proposal; the loop may then run it
  deny <id>              decline a proposal
  resolve <id> "..."     (soul) record an approved proposal's outcome, mark done
  questions [--all]      questions it has asked you (default: unanswered)
  answer <id> "..."      answer a question
  propose "..." [--why .. --cmd ..]   (soul) file an external action for approval
  ask "..."              (soul) ask @mcclowes a question

  help             show this
`;

/** Flags that consume the following argument as their value. */
const VALUE_FLAGS = new Set(["seed", "why", "cmd", "origin", "spark", "summary", "path"]);

/** Pull `--flag` and `--flag value` out of args, returning the rest. */
export function parseFlags(args: string[]): { positional: string[]; flags: Map<string, string | true> } {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (VALUE_FLAGS.has(key) && next !== undefined) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, true);
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function strFlag(flags: Map<string, string | true>, key: string): string | undefined {
  const v = flags.get(key);
  return typeof v === "string" ? v : undefined;
}

export function run(argv: string[], ctx: CommandContext = defaultContext()): string {
  const [command, ...rest] = argv;
  const { positional, flags } = parseFlags(rest);

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return HELP;

    case "init": {
      const seedFlag = flags.get("seed");
      return init(
        {
          name: positional[0],
          rngSeed: typeof seedFlag === "string" ? Number(seedFlag) : undefined,
          realStakes: flags.has("real-stakes"),
          force: flags.has("force"),
        },
        ctx,
      );
    }

    case "status":
      return status(ctx);
    case "watch":
      return watch(ctx);
    case "config":
      return config(positional, ctx);
    case "feed":
      return queueAction("feed", positional[0], ctx);
    case "play":
      return queueAction("play", positional[0], ctx);
    case "clean":
      return queueAction("clean", undefined, ctx);
    case "rest":
      return queueAction("rest", undefined, ctx);
    case "talk":
      return queueAction("talk", positional.join(" ") || undefined, ctx);
    case "tick":
      return tick(ctx);
    case "listen":
      return listen(ctx);
    case "diary":
      return diary(positional[0], ctx);
    case "capabilities":
    case "skills":
      return capabilities(ctx);
    case "achievements":
    case "trophies":
      return achievementsView(ctx);

    case "deliver":
      return deliver(
        { title: positional.join(" "), summary: strFlag(flags, "summary"), path: strFlag(flags, "path") },
        ctx,
      );
    case "wear":
      return wear(positional[0], ctx);
    case "deliverables":
      return deliverables(ctx, flags.has("all"));
    case "take":
      return take(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "shelve":
      return shelve(positional[0], positional.slice(1).join(" ") || undefined, ctx);

    case "memory":
      return memory(ctx);
    case "remember":
      return remember(positional.join(" ") || undefined, ctx);
    case "mood":
      return mood(positional.join(" ") || undefined, ctx);

    case "proposals":
      return proposals(ctx, flags.has("all"));
    case "approve":
      return approve(positional[0], ctx);
    case "deny":
      return deny(positional[0], ctx);
    case "resolve":
      return resolve(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "questions":
      return questions(ctx, flags.has("all"));
    case "answer":
      return answer(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "task":
      return task(positional.join(" ") || undefined, ctx);
    case "tasks":
      return tasks(ctx, flags.has("all"));
    case "task-note":
      return taskNote(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "task-done":
      return taskDone(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "goal":
      return goal(
        { text: positional.join(" "), origin: strFlag(flags, "origin"), spark: strFlag(flags, "spark") },
        ctx,
      );
    case "goals":
      return goals(ctx, flags.has("all"));
    case "goal-note":
      return goalNote(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "goal-done":
      return goalDone(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "goal-drop":
      return goalDrop(positional[0], positional.slice(1).join(" ") || undefined, ctx);
    case "propose":
      return propose(
        { action: positional.join(" "), why: strFlag(flags, "why"), command: strFlag(flags, "cmd") },
        ctx,
      );
    case "ask":
      return ask(positional.join(" ") || undefined, ctx);

    default:
      throw new Error(`Unknown command: ${command}\n\n${HELP}`);
  }
}

/** Only drive the CLI when invoked directly, so the module is safe to import in tests. */
function main(): void {
  try {
    const output = run(process.argv.slice(2));
    if (output) console.log(output);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * True when this file is the process entrypoint. `process.argv[1]` may be a
 * symlink (e.g. the `tama` bin npm drops in node's bin dir), while
 * `import.meta.url` is always the resolved real path — so we resolve the
 * symlink before comparing, or a globally installed `tama` runs nothing.
 */
function isEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isEntrypoint()) main();
