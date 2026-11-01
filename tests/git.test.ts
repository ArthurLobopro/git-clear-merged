import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { CliError } from "../src/errors.ts";
import {
  assertInsideRepo, commitSha, currentBranch, deleteBranch,
  listMergedBranches, parseBranchList, resolveBase,
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
    await repo.git("worktree", "add", "-q", `${repo.dir}-wt`, "feat/wt");
    const wt = (await listMergedBranches(repo.dir, "main")).find((x) => x.name === "feat/wt");
    expect(wt?.worktree).toContain("-wt");
    await repo.git("worktree", "remove", "--force", `${repo.dir}-wt`);
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
