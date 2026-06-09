#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { defaultContext, type CommandContext } from "./commands/context.js";
import { init } from "./commands/init.js";
import { tick } from "./commands/tick.js";
import { queueAction } from "./commands/actions.js";
import { status, listen, diary } from "./commands/read.js";
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

const HELP = `tamaclaudie — raise a creature in your terminal

Usage: tama <command> [args]

  init [name]      lay an egg and roll a personality
       --seed N        fix the random seed (reproducible creature)
       --real-stakes   neglect can be fatal (default: forgiving)
       --force         replace an existing creature (permanent)
  status           mechanical truth: needs, age, stage, health
  feed [food]      raise fullness; a favourite food raises more
  play [game]      raise joy, costs energy
  clean            raise hygiene
  rest             settle down to recover energy (quiet ticks also recover it)
  talk "..."       say something; the next tick replies in feed.md
  tick             advance the body (the soul loop calls this; you can too)
  listen           print what it's saying to you (feed.md)
  diary [date]     print a history page (default: today, YYYY-MM-DD)

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
const VALUE_FLAGS = new Set(["seed", "why", "cmd", "origin", "spark"]);

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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
