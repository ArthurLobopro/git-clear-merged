import { $ } from "bun";
import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Env } from "../src/cli.ts";

/** Cria um repositório git temporário com um commit inicial em `main`. */
export async function createRepo() {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "gcm-")));
  const sh = async (...args: string[]) => (await $`git ${args}`.cwd(dir).quiet()).stdout.toString().trim();
  await sh("init", "-q", "-b", "main");
  await sh("config", "user.email", "t@t.dev");
  await sh("config", "user.name", "Test");
  await sh("config", "commit.gpgsign", "false");
  await sh("commit", "-q", "--allow-empty", "-m", "init");
  const worktrees: string[] = [];
  return {
    dir,
    /** Cria um worktree (fora do repo) com o branch indicado em checkout; removido no cleanup. */
    async addWorktree(branch: string, newBranch = false) {
      const path = `${dir}-wt-${worktrees.length}`;
      worktrees.push(path);
      await sh("worktree", "add", "-q", ...(newBranch ? ["-b", branch, path] : [path, branch]));
      return path;
    },
    git: sh,
    commit: (msg: string) => sh("commit", "-q", "--allow-empty", "-m", msg),
    /** Cria um branch com um commit próprio e o mergeia em main (voltando para main). */
    async mergedBranch(name: string) {
      await sh("checkout", "-q", "-b", name);
      await sh("commit", "-q", "--allow-empty", "-m", name);
      await sh("checkout", "-q", "main");
      await sh("merge", "-q", "--no-ff", "-m", `merge ${name}`, name);
    },
    async branches() {
      return (await sh("branch", "--format=%(refname:short)")).split("\n").filter(Boolean).sort();
    },
    cleanup: async () => {
      for (const p of [dir, ...worktrees]) await rm(p, { recursive: true, force: true });
    },
  };
}

/** Env de teste que captura saída e simula a resposta do prompt. */
export function testEnv(cwd: string, over: Partial<Env> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const env: Env = {
    cwd,
    interactive: false,
    ask: () => null,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    ...over,
  };
  return { env, out, err, text: () => out.join("\n"), errText: () => err.join("\n") };
}
