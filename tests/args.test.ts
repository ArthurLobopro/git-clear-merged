import { describe, expect, test } from "bun:test";
import { parseArgs, resolveMode } from "../src/args.ts";
import { CliError } from "../src/errors.ts";

describe("parseArgs", () => {
  test("defaults", () => {
    expect(parseArgs([])).toEqual({
      safe: false, force: false, dryRun: false, exclude: [],
      includeEmpty: false, includeWorktrees: false, yes: false, help: false, version: false,
    });
  });

  test("formas longas com valor", () => {
    expect(parseArgs(["--base", "dev"]).base).toBe("dev");
    expect(parseArgs(["--base=dev"]).base).toBe("dev");
  });

  test("formas curtas, agrupadas e com valor colado", () => {
    const o = parseArgs(["-ny", "-bmain", "-D"]);
    expect(o).toMatchObject({ dryRun: true, yes: true, base: "main", force: true });
  });

  test("--exclude é repetível", () => {
    expect(parseArgs(["-e", "a*", "--exclude=b"]).exclude).toEqual(["a*", "b"]);
  });

  test("--include-empty e --help", () => {
    expect(parseArgs(["--include-empty", "-h"])).toMatchObject({ includeEmpty: true, help: true });
  });

  test("-w e --include-worktrees", () => {
    expect(parseArgs(["-w"]).includeWorktrees).toBe(true);
    expect(parseArgs(["--include-worktrees"]).includeWorktrees).toBe(true);
    expect(parseArgs(["-wn"])).toMatchObject({ includeWorktrees: true, dryRun: true });
  });

  test("-v e --version", () => {
    expect(parseArgs(["-v"]).version).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  test.each([
    [["--base"]],
    [["-b"]],
    [["--base="]],
    [["--dry-run=1"]],
    [["--nope"]],
    [["-z"]],
    [["solto"]],
  ])("erro de uso: %j", (argv) => {
    expect(() => parseArgs(argv)).toThrow(CliError);
  });
});

describe("resolveMode", () => {
  const base = { mode: undefined, safe: false, force: false };
  test("padrão é d", () => expect(resolveMode(base)).toBe("d"));
  test("-D", () => expect(resolveMode({ ...base, force: true })).toBe("D"));
  test("--mode D", () => expect(resolveMode({ ...base, mode: "D" })).toBe("D"));
  test("repetir o mesmo modo é aceito", () =>
    expect(resolveMode({ ...base, mode: "d", safe: true })).toBe("d"));
  test("modos conflitantes", () =>
    expect(() => resolveMode({ ...base, safe: true, force: true })).toThrow(/conflitantes/));
  test("modo inválido", () =>
    expect(() => resolveMode({ ...base, mode: "x" })).toThrow(/inválido/));
});
