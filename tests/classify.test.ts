import { describe, expect, test } from "bun:test";
import { classify, protectedPatterns } from "../src/classify.ts";
import type { Branch, WorktreeState } from "../src/git.ts";

const b = (name: string, sha = "bbbbbbb", worktree = ""): Branch => ({ name, sha, worktree });
const input = (branches: Branch[], over = {}) => ({
  branches, base: "main", baseSha: "aaaaaaa", current: "main", exclude: [], includeEmpty: false, ...over,
});

describe("classify", () => {
  test("apaga branches comuns", () => {
    const r = classify(input([b("feat/x")]));
    expect(r.toDelete.map((x) => x.name)).toEqual(["feat/x"]);
    expect(r.skipped).toEqual([]);
  });

  test("preserva branch atual", () => {
    const r = classify(input([b("feat/x")], { current: "feat/x" }));
    expect(r.skipped).toEqual([{ name: "feat/x", reason: "branch atual" }]);
  });

  test("preserva branch em worktree por padrão", () => {
    const r = classify(input([b("feat/x", "bbbbbbb", "/tmp/wt")]));
    expect(r.toDelete).toEqual([]);
    expect(r.skipped[0]!.reason).toContain("/tmp/wt");
    expect(r.skipped[0]!.reason).toContain("--include-worktrees");
  });

  test("worktree apagado à mão é marcado como apagado manualmente (warn)", () => {
    const wt = b("feat/x", "bbbbbbb", "/gone");
    for (const worktrees of [undefined, { main: "/r", locked: new Set<string>(), clean: new Set<string>() }]) {
      const r = classify(input([wt], { prunable: new Set(["/gone"]), worktrees }));
      expect(r.toDelete).toEqual([]);
      expect(r.skipped[0]).toEqual({
        name: "feat/x", reason: "worktree apagado manualmente /gone", warn: true,
      });
    }
  });

  describe("com --include-worktrees", () => {
    const state = (over: Partial<WorktreeState> = {}): WorktreeState => ({
      main: "/repo", locked: new Set(), clean: new Set(["/wt"]), ...over,
    });
    const wt = (path = "/wt", name = "feat/x") => b(name, "bbbbbbb", path);

    test("remove worktree limpo", () => {
      const r = classify(input([wt()], { worktrees: state() }));
      expect(r.toDelete.map((x) => x.name)).toEqual(["feat/x"]);
    });

    test("preserva worktree com alterações", () => {
      const r = classify(input([wt()], { worktrees: state({ clean: new Set() }) }));
      expect(r.toDelete).toEqual([]);
      expect(r.skipped[0]!.reason).toContain("não commitadas");
    });

    test("preserva worktree bloqueado", () => {
      const r = classify(input([wt()], { worktrees: state({ locked: new Set(["/wt"]) }) }));
      expect(r.skipped[0]!.reason).toContain("bloqueado");
    });

    test("nunca remove o worktree principal", () => {
      const r = classify(input([wt("/repo")], { worktrees: state({ clean: new Set(["/repo"]) }) }));
      expect(r.toDelete).toEqual([]);
      expect(r.skipped[0]!.reason).toContain("principal");
    });

    test("branch atual e protegidos continuam preservados", () => {
      const r = classify(
        input([wt("/wt", "cur"), wt("/wt", "develop")], { current: "cur", worktrees: state() }),
      );
      expect(r.toDelete).toEqual([]);
      expect(r.skipped.map((x) => x.reason)).toEqual(["branch atual", "protegido"]);
    });
  });

  test.each(["main", "master", "develop", "dev"])("protege %s", (name) => {
    const r = classify(input([b(name)], { current: null }));
    expect(r.skipped[0]).toEqual({ name, reason: "protegido" });
  });

  test("protege base customizada, inclusive o último segmento", () => {
    expect(protectedPatterns("origin/trunk", [])).toContain("trunk");
    const r = classify(input([b("trunk")], { base: "origin/trunk" }));
    expect(r.toDelete).toEqual([]);
  });

  test("--exclude aceita glob", () => {
    const r = classify(input([b("release/1.0"), b("feat/x")], { exclude: ["release/*"] }));
    expect(r.toDelete.map((x) => x.name)).toEqual(["feat/x"]);
    expect(r.skipped.map((x) => x.name)).toEqual(["release/1.0"]);
  });

  test("ignora branches no mesmo commit do base, salvo includeEmpty", () => {
    const same = b("novo", "aaaaaaa");
    expect(classify(input([same])).skipped[0]!.reason).toContain("--include-empty");
    expect(classify(input([same], { includeEmpty: true })).toDelete).toHaveLength(1);
  });
});
