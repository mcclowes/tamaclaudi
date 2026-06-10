import { DEFAULT_CONFIG, type Stats } from "../types.js";
import { startingNeeds } from "../sim/stats.js";
import { wellbeing } from "../sim/valence.js";
import { generateSeed, randomRngSeed } from "../seed/generate.js";
import {
  ensureDirs,
  exists,
  writeSeed,
  writeStats,
  writeConfig,
  writeFeed,
  writeClaudeMd,
  writeTickMd,
} from "../store/io.js";
import { initialClaudeMd, initialFeed, tickMd } from "../soul/templates.js";
import { creatureArt } from "../cli/art.js";
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
    valence: wellbeing(startingNeeds()),
  };

  writeSeed(seed, ctx.p);
  writeStats(stats, ctx.p);
  writeConfig({ ...DEFAULT_CONFIG, realStakes: opts.realStakes ?? false }, ctx.p);
  writeClaudeMd(initialClaudeMd(seed, stats), ctx.p);
  writeTickMd(tickMd(), ctx.p);
  writeFeed(initialFeed(seed), ctx.p);

  return [
    creatureArt(stats),
    "",
    `🥚 Laid an egg at ${ctx.p.dir}`,
    `   name: ${seed.name}`,
    `   temperament rolled, aspiration: ${seed.aspiration}`,
    `   love language: ${seed.loveLanguage}`,
    opts.realStakes ? "   real stakes: ON (neglect can be fatal)" : "   real stakes: off (forgiving)",
    "",
    "Run `tama tick` to let time pass, or start the soul loop inside creature/.",
  ].join("\n");
}
