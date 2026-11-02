import { $ } from "bun";
import { CliError } from "./errors.ts";

export type GitResult = { code: number; out: string; err: string };

export type Branch = { name: string; sha: string; worktree: string };

/** Executa git via Bun Shell em `cwd`. Os argumentos do array são escapados individualmente. */
export async function git(cwd: string, args: string[]): Promise<GitResult> {
  const r = await $`git ${args}`.cwd(cwd).quiet().nothrow();
  return {
    code: r.exitCode,
    out: r.stdout.toString(),
    err: r.stderr.toString().trim(),
  };
}

export function assertGitAvailable(): void {
  if (!Bun.which("git")) {
    throw new CliError("O comando 'git' não foi encontrado no PATH.");
  }
}

export async function assertInsideRepo(cwd: string): Promise<void> {
  const r = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  if (r.out.trim() !== "true") {
    throw new CliError("Este diretório não está dentro de um repositório Git.");
  }
}

export async function resolveBase(cwd: string, explicit?: string): Promise<string> {
  const candidates = explicit ? [explicit] : ["main", "master"];
  for (const c of candidates) {
    const r = await git(cwd, ["rev-parse", "--verify", "--quiet", `${c}^{commit}`]);
    if (r.code === 0) return c;
  }
  throw new CliError(
    explicit
      ? `Branch base '${explicit}' não existe.`
      : "Não encontrei 'main' nem 'master'. Informe um branch com --base.",
  );
}

export async function commitSha(cwd: string, ref: string): Promise<string> {
  return (await git(cwd, ["rev-parse", `${ref}^{commit}`])).out.trim();
}

/** Nome do branch atual, ou null se HEAD está destacado. */
export async function currentBranch(cwd: string): Promise<string | null> {
  const r = await git(cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  return r.code === 0 ? r.out.trim() : null;
}

export function parseBranchList(out: string): Branch[] {
  return out
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => {
      const [name = "", sha = "", worktree = ""] = line.split("\t");
      return { name, sha, worktree: worktree.trim() };
    });
}

export async function listMergedBranches(cwd: string, base: string): Promise<Branch[]> {
  const r = await git(cwd, [
    "for-each-ref",
    `--merged=${base}`,
    "--format=%(refname:short)%09%(objectname)%09%(worktreepath)",
    "refs/heads",
  ]);
  if (r.code !== 0) throw new CliError(`Falha ao listar branches: ${r.err}`);
  return parseBranchList(r.out);
}

export function deleteBranch(cwd: string, mode: "d" | "D", name: string): Promise<GitResult> {
  return git(cwd, ["branch", `-${mode}`, name]);
}

/** `prunable`: o diretório do worktree foi apagado à mão (requer git ≥ 2.31 para ser detectado). */
export type Worktree = { path: string; locked: boolean; prunable: boolean };

/** Estado dos worktrees usado para decidir quais podem ser removidos. */
export type WorktreeState = {
  /** Worktree principal (nunca removível). */
  main: string;
  locked: Set<string>;
  /** Worktrees sem alterações não commitadas nem arquivos não rastreados. */
  clean: Set<string>;
};

export function parseWorktreeList(out: string): Worktree[] {
  return out
    .split("\n\n")
    .map((block) => block.split("\n"))
    .filter((lines) => lines[0]?.startsWith("worktree "))
    .map((lines) => ({
      path: lines[0]!.slice("worktree ".length),
      locked: lines.some((l) => l === "locked" || l.startsWith("locked ")),
      prunable: lines.some((l) => l === "prunable" || l.startsWith("prunable ")),
    }));
}

/** O primeiro item é sempre o worktree principal. */
export async function listWorktrees(cwd: string): Promise<Worktree[]> {
  const r = await git(cwd, ["worktree", "list", "--porcelain"]);
  if (r.code !== 0) throw new CliError(`Falha ao listar worktrees: ${r.err}`);
  return parseWorktreeList(r.out);
}

/** Limpo = sem alterações (staged ou não) e sem arquivos novos. Falha na consulta conta como sujo. */
export async function isWorktreeClean(path: string): Promise<boolean> {
  try {
    const r = await git(path, ["status", "--porcelain"]);
    return r.code === 0 && r.out.trim() === "";
  } catch {
    return false; // diretório do worktree não existe mais (prunable)
  }
}

export async function loadWorktreeState(all: Worktree[], branches: Branch[]): Promise<WorktreeState> {
  const clean = new Set<string>();
  for (const b of branches) {
    if (b.worktree && (await isWorktreeClean(b.worktree))) clean.add(b.worktree);
  }
  return {
    main: all[0]?.path ?? "",
    locked: new Set(all.filter((w) => w.locked).map((w) => w.path)),
    clean,
  };
}

/** Sem --force: o próprio git recusa remover worktree com alterações. */
export function removeWorktree(cwd: string, path: string): Promise<GitResult> {
  return git(cwd, ["worktree", "remove", path]);
}
