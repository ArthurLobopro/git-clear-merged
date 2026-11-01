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
