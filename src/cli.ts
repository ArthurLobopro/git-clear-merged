import { parseArgs, resolveMode } from "./args.ts";
import { classify } from "./classify.ts";
import { CliError } from "./errors.ts";
import {
  assertGitAvailable,
  assertInsideRepo,
  commitSha,
  currentBranch,
  deleteBranch,
  listMergedBranches,
  listWorktrees,
  loadWorktreeState,
  removeWorktree,
  resolveBase,
} from "./git.ts";
import pkg from "../package.json";
import { help } from "./help.ts";
import { t } from "./i18n/index.ts";
import { settingsCommand } from "./settings-cmd.ts";
import { settingsPath } from "./settings.ts";
import { bold, dim, green, red, yellow } from "./ui.ts";

/** Dependências de I/O injetáveis, para permitir testes sem terminal. */
export type Env = {
  cwd: string;
  /** Arquivo JSON de configurações do usuário. */
  configPath: string;
  interactive: boolean;
  ask: (question: string) => string | null;
  out: (line: string) => void;
  err: (line: string) => void;
};

export const defaultEnv = (): Env => ({
  cwd: process.cwd(),
  configPath: settingsPath(),
  interactive: Boolean(process.stdin.isTTY),
  ask: (q) => prompt(q),
  out: (l) => console.log(l),
  err: (l) => console.error(l),
});

const YES = ["s", "sim", "y", "yes"];

/** Executa a CLI e devolve o código de saída. */
export async function run(argv: string[], env: Env = defaultEnv()): Promise<number> {
  try {
    return await main(argv, env);
  } catch (e) {
    if (e instanceof CliError) {
      env.err(red(`✖ ${e.message}`));
      return e.exitCode;
    }
    throw e;
  }
}

async function main(argv: string[], env: Env): Promise<number> {
  const { cwd, out, err } = env;

  if (argv[0] === "settings") {
    return settingsCommand(argv.slice(1), { configPath: env.configPath, out });
  }

  const opts = parseArgs(argv);

  if (opts.help) {
    out(help());
    return 0;
  }

  if (opts.version) {
    out(pkg.version);
    return 0;
  }

  const mode = resolveMode(opts);

  assertGitAvailable();
  await assertInsideRepo(cwd);

  const base = await resolveBase(cwd, opts.base);
  const baseSha = await commitSha(cwd, base);
  const current = await currentBranch(cwd);

  if (current === null) {
    err(yellow(t().detached()));
  } else if (current !== base) {
    err(yellow(t().notOnBase(current, base)));
  }

  const branches = await listMergedBranches(cwd, base);
  const allWorktrees = await listWorktrees(cwd);
  const prunable = new Set(allWorktrees.filter((w) => w.prunable).map((w) => w.path));
  const worktrees = opts.includeWorktrees
    ? await loadWorktreeState(allWorktrees, branches)
    : undefined;
  const { toDelete, skipped } = classify({
    branches,
    base,
    baseSha,
    current,
    exclude: opts.exclude,
    includeEmpty: opts.includeEmpty,
    worktrees,
    prunable,
  });

  out(
    `${bold(t().summaryBase())} ${base}   ${bold(t().summaryMode())} -${mode}   ` +
      `${bold(t().summaryDryRun())} ${opts.dryRun ? t().yes() : t().no()}\n`,
  );

  if (skipped.length > 0) {
    out(dim(t().preserved()));
    for (const s of skipped) {
      const line = `  • ${s.name} — ${s.reason}`;
      out(s.warn ? yellow(line) : dim(line));
    }
    out("");
  }

  if (prunable.size > 0) {
    out(yellow(t().pruneTip()));
    out("");
  }

  if (toDelete.length === 0) {
    out(green(t().nothingToDelete()));
    return 0;
  }

  out(opts.dryRun ? t().wouldDelete(toDelete.length) : t().willDelete(toDelete.length));
  for (const b of toDelete) {
    const wt = b.worktree ? dim(t().worktreeSuffix(b.worktree)) : "";
    out(`  • ${b.name} ${dim(`(${b.sha.slice(0, 7)})`)}${wt}`);
  }
  out("");

  if (opts.dryRun) {
    out(yellow(t().dryRunNote()));
    return 0;
  }

  if (mode === "D") {
    err(yellow(t().forceWarning()));
  }

  if (!opts.yes) {
    if (!env.interactive) {
      throw new CliError(t().nonInteractive());
    }
    const answer = (
      env.ask(t().confirm(toDelete.length, mode)) ?? ""
    )
      .trim()
      .toLowerCase();
    if (!YES.includes(answer)) {
      out(t().cancelled());
      return 0;
    }
  }

  let ok = 0;
  const failures: { name: string; err: string }[] = [];

  for (const b of toDelete) {
    if (b.worktree) {
      const w = await removeWorktree(cwd, b.worktree);
      if (w.code !== 0) {
        failures.push({ name: b.name, err: t().worktreeFailure(b.worktree, w.err) });
        out(red(`✖ ${b.name}`));
        continue;
      }
    }
    const r = await deleteBranch(cwd, mode, b.name);
    if (r.code === 0) {
      ok++;
      out(green(`✔ ${b.name}`) + dim(t().was(b.sha.slice(0, 7))));
    } else {
      failures.push({ name: b.name, err: r.err });
      out(red(`✖ ${b.name}`));
    }
  }

  out(
    `\n${green(t().deletedCount(ok))}, ${
      failures.length > 0 ? red(t().failuresCount(failures.length)) : t().zeroFailures()
    }.`,
  );

  if (failures.length > 0) {
    err(red(t().failureDetails()));
    for (const f of failures) err(`  • ${f.name}: ${f.err}`);
    return 1;
  }
  return 0;
}
