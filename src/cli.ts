#!/usr/bin/env node
import { defaultContext } from "./commands/context.js";
import { init } from "./commands/init.js";
import { tick } from "./commands/tick.js";
import { queueAction } from "./commands/actions.js";
import { status, listen, diary } from "./commands/read.js";

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
  talk "..."       say something; the next tick replies in feed.md
  tick             advance the body (the soul loop calls this; you can too)
  listen           print what it's saying to you (feed.md)
  diary [date]     print a history page (default: today, YYYY-MM-DD)
  help             show this
`;

/** Pull `--flag` and `--flag value` out of args, returning the rest. */
function parseFlags(args: string[]): { positional: string[]; flags: Map<string, string | true> } {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (key === "seed" && next !== undefined) {
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

function run(argv: string[]): string {
  const [command, ...rest] = argv;
  const { positional, flags } = parseFlags(rest);
  const ctx = defaultContext();

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
    case "talk":
      return queueAction("talk", positional.join(" ") || undefined, ctx);
    case "tick":
      return tick(ctx);
    case "listen":
      return listen(ctx);
    case "diary":
      return diary(positional[0], ctx);

    default:
      throw new Error(`Unknown command: ${command}\n\n${HELP}`);
  }
}

try {
  const output = run(process.argv.slice(2));
  if (output) console.log(output);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
