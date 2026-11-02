import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { CliError } from "../src/errors.ts";
import {
  assertInsideRepo, commitSha, currentBranch, deleteBranch,
  isWorktreeClean, listMergedBranches, listWorktrees, loadWorktreeState,
  parseBranchList, parseWorktreeList, removeWorktree, resolveBase,
} from "../src/git.ts";
import { createRepo } from "./helpers.ts";

describe("parseBranchList", () => {
  test("interpreta linhas separadas por tab", () => {
    expect(parseBranchList("a\tsha1\t\nb\tsha2\t/wt\n\n")).toEqual([
      { name: "a", sha: "sha1", worktree: "" },
      { name: "b", sha: "sha2", worktree: "/wt" },
    ]);
  });
  test("saída vazia", () => expect(parseBranchList("")).toEqual([]));
});

describe("parseWorktreeList", () => {
  test("interpreta saída --porcelain", () => {
    const out = "worktree /r\nHEAD abc\nbranch refs/heads/main\n\nworktree /w\nHEAD def\nbranch refs/heads/x\nlocked motivo\n\n";
    expect(parseWorktreeList(out)).toEqual([
      { path: "/r", locked: false },
      { path: "/w", locked: true },
    ]);
  });
});

describe("operações git", () => {
  let repo: Awaited<ReturnType<typeof createRepo>>;
  beforeEach(async () => { repo = await createRepo(); });
  afterEach(() => repo.cleanup());

  test("assertInsideRepo falha fora de um repositório", async () => {
    await expect(assertInsideRepo("/")).rejects.toThrow(CliError);
    await expect(assertInsideRepo(repo.dir)).resolves.toBeUndefined();
  });

  test("resolveBase: main, master, explícito e inexistente", async () => {
    expect(await resolveBase(repo.dir)).toBe("main");
    expect(await resolveBase(repo.dir, "main")).toBe("main");
    await expect(resolveBase(repo.dir, "nada")).rejects.toThrow(/não existe/);
    await repo.git("branch", "-m", "main", "master");
    expect(await resolveBase(repo.dir)).toBe("master");
    await repo.git("branch", "-m", "master", "outro");
    await expect(resolveBase(repo.dir)).rejects.toThrow(/main.*master/);
  });

  test("currentBranch e HEAD destacado", async () => {
    expect(await currentBranch(repo.dir)).toBe("main");
    await repo.git("checkout", "-q", "--detach");
    expect(await currentBranch(repo.dir)).toBeNull();
  });

  test("commitSha", async () => {
    expect(await commitSha(repo.dir, "main")).toBe(await repo.git("rev-parse", "HEAD"));
  });

  test("listMergedBranches só traz mergeados", async () => {
    await repo.mergedBranch("feat/a");
    await repo.git("checkout", "-q", "-b", "wip");
    await repo.commit("wip");
    await repo.git("checkout", "-q", "main");
    const names = (await listMergedBranches(repo.dir, "main")).map((x) => x.name).sort();
    expect(names).toEqual(["feat/a", "main"]);
  });

  test("listMergedBranches informa worktree", async () => {
    await repo.mergedBranch("feat/wt");
    const path = await repo.addWorktree("feat/wt");
    const wt = (await listMergedBranches(repo.dir, "main")).find((x) => x.name === "feat/wt");
    expect(wt?.worktree).toBe(path);
  });

  test("listWorktrees: principal primeiro e flag de bloqueio", async () => {
    await repo.mergedBranch("feat/wt");
    const path = await repo.addWorktree("feat/wt");
    await repo.git("worktree", "lock", path);
    expect(await listWorktrees(repo.dir)).toEqual([
      { path: repo.dir, locked: false },
      { path, locked: true },
    ]);
  });

  test("isWorktreeClean detecta alterações e arquivos novos", async () => {
    await repo.mergedBranch("feat/wt");
    const path = await repo.addWorktree("feat/wt");
    expect(await isWorktreeClean(path)).toBe(true);
    await Bun.write(`${path}/novo.txt`, "x");
    expect(await isWorktreeClean(path)).toBe(false);
    expect(await isWorktreeClean(`${path}-inexistente`)).toBe(false);
  });

  test("loadWorktreeState e removeWorktree", async () => {
    await repo.mergedBranch("feat/a");
    await repo.mergedBranch("feat/b");
    const a = await repo.addWorktree("feat/a");
    const b = await repo.addWorktree("feat/b");
    await Bun.write(`${b}/sujo.txt`, "x");
    const branches = await listMergedBranches(repo.dir, "main");
    const state = await loadWorktreeState(repo.dir, branches);
    expect(state.main).toBe(repo.dir);
    expect([...state.clean]).toContain(a);
    expect([...state.clean]).not.toContain(b);

    expect((await removeWorktree(repo.dir, a)).code).toBe(0);
    expect(await Bun.file(`${a}/.git`).exists()).toBe(false);
    // sem --force, o git recusa remover worktree com arquivos novos
    expect((await removeWorktree(repo.dir, b)).code).not.toBe(0);
  });

  test("deleteBranch -d apaga mergeado e falha em não mergeado", async () => {
    await repo.mergedBranch("feat/a");
    expect((await deleteBranch(repo.dir, "d", "feat/a")).code).toBe(0);
    await repo.git("checkout", "-q", "-b", "wip");
    await repo.commit("wip");
    await repo.git("checkout", "-q", "main");
    const r = await deleteBranch(repo.dir, "d", "wip");
    expect(r.code).not.toBe(0);
    expect(r.err).not.toBe("");
    expect((await deleteBranch(repo.dir, "D", "wip")).code).toBe(0);
  });
});
