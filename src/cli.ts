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
import { bold, dim, green, red, yellow } from "./ui.ts";

/** Dependências de I/O injetáveis, para permitir testes sem terminal. */
export type Env = {
  cwd: string;
  interactive: boolean;
  ask: (question: string) => string | null;
  out: (line: string) => void;
  err: (line: string) => void;
};

export const defaultEnv = (): Env => ({
  cwd: process.cwd(),
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
    err(yellow("⚠ HEAD está destacado (detached); nenhum branch será tratado como 'atual'."));
  } else if (current !== base) {
    err(
      yellow(
        `⚠ Você está em '${current}', não em '${base}'. Com -d, o git pode recusar ` +
          `branches sem upstream que não estejam mergeados em HEAD.`,
      ),
    );
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
    `${bold("Base:")} ${base}   ${bold("Modo:")} -${mode}   ` +
      `${bold("Dry-run:")} ${opts.dryRun ? "sim" : "não"}\n`,
  );

  if (skipped.length > 0) {
    out(dim("Preservados:"));
    for (const s of skipped) {
      const line = `  • ${s.name} — ${s.reason}`;
      out(s.warn ? yellow(line) : dim(line));
    }
    out("");
  }

  if (prunable.size > 0) {
    out(yellow("Dica: para apagar worktrees deletadas manualmente, rode git worktree prune"));
    out("");
  }

  if (toDelete.length === 0) {
    out(green("✔ Nenhum branch para apagar."));
    return 0;
  }

  out(`${opts.dryRun ? "Seriam apagados" : "Serão apagados"} (${toDelete.length}):`);
  for (const b of toDelete) {
    const wt = b.worktree ? dim(` + worktree ${b.worktree}`) : "";
    out(`  • ${b.name} ${dim(`(${b.sha.slice(0, 7)})`)}${wt}`);
  }
  out("");

  if (opts.dryRun) {
    out(yellow("Dry-run: nada foi alterado."));
    return 0;
  }

  if (mode === "D") {
    err(
      yellow(
        "⚠ Modo -D ignora a checagem de merge do git. Commits exclusivos desses " +
          "branches só poderão ser recuperados pelo reflog.",
      ),
    );
  }

  if (!opts.yes) {
    if (!env.interactive) {
      throw new CliError("Sem terminal interativo para confirmar. Use --yes ou --dry-run.");
    }
    const answer = (
      env.ask(`Apagar ${toDelete.length} branch(es) com 'git branch -${mode}'? [s/N]`) ?? ""
    )
      .trim()
      .toLowerCase();
    if (!YES.includes(answer)) {
      out("Cancelado.");
      return 0;
    }
  }

  let ok = 0;
  const failures: { name: string; err: string }[] = [];

  for (const b of toDelete) {
    if (b.worktree) {
      const w = await removeWorktree(cwd, b.worktree);
      if (w.code !== 0) {
        failures.push({ name: b.name, err: `worktree ${b.worktree}: ${w.err}` });
        out(red(`✖ ${b.name}`));
        continue;
      }
    }
    const r = await deleteBranch(cwd, mode, b.name);
    if (r.code === 0) {
      ok++;
      out(green(`✔ ${b.name}`) + dim(` (era ${b.sha.slice(0, 7)})`));
    } else {
      failures.push({ name: b.name, err: r.err });
      out(red(`✖ ${b.name}`));
    }
  }

  out(
    `\n${green(`${ok} apagado(s)`)}, ${
      failures.length > 0 ? red(`${failures.length} falha(s)`) : "0 falhas"
    }.`,
  );

  if (failures.length > 0) {
    err(red("\nDetalhes das falhas:"));
    for (const f of failures) err(`  • ${f.name}: ${f.err}`);
    return 1;
  }
  return 0;
}
