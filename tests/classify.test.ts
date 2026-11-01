import { describe, expect, test } from "bun:test";
import { classify, protectedPatterns } from "../src/classify.ts";
import type { Branch } from "../src/git.ts";

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

  test("preserva branch em worktree", () => {
    const r = classify(input([b("feat/x", "bbbbbbb", "/tmp/wt")]));
    expect(r.toDelete).toEqual([]);
    expect(r.skipped[0]!.reason).toContain("/tmp/wt");
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
