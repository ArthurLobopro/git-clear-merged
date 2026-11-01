import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { run } from "../src/cli.ts";
import { createRepo, testEnv } from "./helpers.ts";

let repo: Awaited<ReturnType<typeof createRepo>>;
beforeEach(async () => {
  repo = await createRepo();
  await repo.mergedBranch("feat/a");
  await repo.mergedBranch("feat/b");
  await repo.mergedBranch("release/1");
});
afterEach(() => repo.cleanup());

describe("cli run", () => {
  test("--help", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["--help"], t.env)).toBe(0);
    expect(t.text()).toContain("git-clean-merged");
  });

  test("erro de uso retorna 2", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["--nope"], t.env)).toBe(2);
    expect(t.errText()).toContain("desconhecida");
  });

  test("fora de repositório retorna 2", async () => {
    const t = testEnv("/");
    expect(await run(["-y"], t.env)).toBe(2);
    expect(t.errText()).toContain("repositório");
  });

  test("--dry-run não altera nada", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["-n"], t.env)).toBe(0);
    expect(t.text()).toContain("Seriam apagados (3)");
    expect(await repo.branches()).toEqual(["feat/a", "feat/b", "main", "release/1"]);
  });

  test("--yes apaga os mergeados e preserva main", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["-y"], t.env)).toBe(0);
    expect(await repo.branches()).toEqual(["main"]);
    expect(t.text()).toContain("3 apagado(s)");
  });

  test("--exclude preserva por glob", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["-y", "-e", "release/*"], t.env)).toBe(0);
    expect(await repo.branches()).toEqual(["main", "release/1"]);
  });

  test("sem TTY e sem --yes retorna 2", async () => {
    const t = testEnv(repo.dir);
    expect(await run([], t.env)).toBe(2);
    expect(t.errText()).toContain("--yes");
    expect((await repo.branches()).length).toBe(4);
  });

  test("confirmação positiva apaga", async () => {
    const t = testEnv(repo.dir, { interactive: true, ask: () => "s" });
    expect(await run([], t.env)).toBe(0);
    expect(await repo.branches()).toEqual(["main"]);
  });

  test("confirmação negativa cancela", async () => {
    const t = testEnv(repo.dir, { interactive: true, ask: () => "n" });
    expect(await run([], t.env)).toBe(0);
    expect(t.text()).toContain("Cancelado.");
    expect((await repo.branches()).length).toBe(4);
  });

  test("nada para apagar", async () => {
    const t = testEnv(repo.dir);
    await run(["-y"], t.env);
    const t2 = testEnv(repo.dir);
    expect(await run(["-y"], t2.env)).toBe(0);
    expect(t2.text()).toContain("Nenhum branch para apagar");
  });

  test("branch no mesmo commit do base é preservado, salvo --include-empty", async () => {
    await repo.git("branch", "novo");
    const t = testEnv(repo.dir);
    await run(["-y", "-e", "feat/*", "-e", "release/*"], t.env);
    expect(await repo.branches()).toContain("novo");
    const t2 = testEnv(repo.dir);
    await run(["-y", "--include-empty", "-e", "feat/*", "-e", "release/*"], t2.env);
    expect(await repo.branches()).not.toContain("novo");
  });

  test("branch atual não é apagado", async () => {
    await repo.git("checkout", "-q", "feat/a");
    const t = testEnv(repo.dir);
    expect(await run(["-y", "-e", "feat/b", "-e", "release/*"], t.env)).toBe(0);
    expect(await repo.branches()).toContain("feat/a");
    expect(t.errText()).toContain("Você está em 'feat/a'");
  });

  test("falha ao apagar retorna 1", async () => {
    // um lock no ref faz o git recusar a deleção
    const lock = `${repo.dir}/.git/refs/heads/feat/a.lock`;
    await Bun.write(lock, "");
    const t = testEnv(repo.dir);
    const code = await run(["-y", "-e", "feat/b", "-e", "release/*"], t.env);
    expect(code).toBe(1);
    expect(t.text()).toContain("1 falha(s)");
    expect(t.errText()).toContain("Detalhes das falhas");
  });

  test("base explícita inexistente retorna 2", async () => {
    const t = testEnv(repo.dir);
    expect(await run(["-y", "-b", "nada"], t.env)).toBe(2);
  });
});
