import { exists, readConfig, writeConfig } from "../store/io.js";
import type { CommandContext } from "./context.js";

const ON = new Set(["on", "true", "yes", "1"]);
const OFF = new Set(["off", "false", "no", "0"]);

function describeStakes(realStakes: boolean): string {
  return realStakes
    ? "real-stakes: on (neglect can be fatal)"
    : "real-stakes: off (forgiving)";
}

/**
 * Read or flip runtime config on a living creature. Until now real-stakes could
 * only be chosen at `tama init --real-stakes` or by hand-editing config.json;
 * this lets you toggle it on a creature that's already hatched. The only knob
 * today is real-stakes, so the surface stays small.
 */
export function config(args: string[], ctx: CommandContext): string {
  if (!exists(ctx.p)) {
    throw new Error("No creature lives here yet — run `tama init` first.");
  }

  const [key, value] = args;

  if (key === undefined) {
    return describeStakes(readConfig(ctx.p).realStakes);
  }

  if (key !== "real-stakes") {
    throw new Error(`Unknown config key: ${key}. Known keys: real-stakes.`);
  }

  if (value === undefined) {
    return describeStakes(readConfig(ctx.p).realStakes);
  }

  const v = value.toLowerCase();
  if (!ON.has(v) && !OFF.has(v)) {
    throw new Error(`real-stakes takes on|off, got "${value}".`);
  }
  const realStakes = ON.has(v);

  writeConfig({ ...readConfig(ctx.p), realStakes }, ctx.p);
  return realStakes
    ? "real-stakes: on — neglect can now be fatal. Tend carefully."
    : "real-stakes: off — back to forgiving.";
}
