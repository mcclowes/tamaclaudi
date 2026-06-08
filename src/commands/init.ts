import { DEFAULT_CONFIG, type Stats } from "../types.js";
import { startingNeeds } from "../sim/stats.js";
import { generateSeed, randomRngSeed } from "../seed/generate.js";
import {
  ensureDirs,
  exists,
  writeSeed,
  writeStats,
  writeConfig,
  writeFeed,
  writeClaudeMd,
} from "../store/io.js";
import { initialClaudeMd, initialFeed } from "../soul/templates.js";
import type { CommandContext } from "./context.js";

export interface InitOptions {
  name?: string;
  rngSeed?: number;
  realStakes?: boolean;
  force?: boolean;
}

export function init(opts: InitOptions, ctx: CommandContext): string {
  if (exists(ctx.p) && !opts.force) {
    throw new Error(
      `A creature already lives at ${ctx.p.dir}. Use --force to replace it (this is permanent).`,
    );
  }

  ensureDirs(ctx.p);

  const bornAt = ctx.now.toISOString();
  const seed = generateSeed({
    rngSeed: opts.rngSeed ?? randomRngSeed(),
    name: opts.name,
    bornAt,
  });

  const stats: Stats = {
    bornAt,
    lastTick: bornAt,
    stage: "egg",
    health: "well",
    needs: startingNeeds(),
    ailingSince: null,
  };

  writeSeed(seed, ctx.p);
  writeStats(stats, ctx.p);
  writeConfig({ ...DEFAULT_CONFIG, realStakes: opts.realStakes ?? false }, ctx.p);
  writeClaudeMd(initialClaudeMd(seed, stats), ctx.p);
  writeFeed(initialFeed(seed), ctx.p);

  return [
    `🥚 Laid an egg at ${ctx.p.dir}`,
    `   name: ${seed.name}`,
    `   temperament rolled, aspiration: ${seed.aspiration}`,
    `   love language: ${seed.loveLanguage}`,
    opts.realStakes ? "   real stakes: ON (neglect can be fatal)" : "   real stakes: off (forgiving)",
    "",
    "Run `tama tick` to let time pass, or start the soul loop inside creature/.",
  ].join("\n");
}
