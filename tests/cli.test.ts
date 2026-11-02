import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import pkg from "../package.json";
import { rm } from "node:fs/promises";
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

  test.each(["-v", "--version"])("%s mostra a versão do package.json", async (flag) => {
    const t = testEnv(repo.dir);
    expect(await run([flag], t.env)).toBe(0);
    expect(t.out).toEqual([pkg.version]);
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

  describe("--include-worktrees", () => {
    const keep = ["-e", "feat/b", "-e", "release/*"];

    test("sem a flag, branch em worktree é preservado", async () => {
      const wt = await repo.addWorktree("feat/a");
      const t = testEnv(repo.dir);
      expect(await run(["-y", ...keep], t.env)).toBe(0);
      expect(await repo.branches()).toContain("feat/a");
      expect(await Bun.file(`${wt}/.git`).exists()).toBe(true);
    });

    test("remove worktree limpo e apaga o branch", async () => {
      const wt = await repo.addWorktree("feat/a");
      const t = testEnv(repo.dir);
      expect(await run(["-y", "-w", ...keep], t.env)).toBe(0);
      expect(await repo.branches()).not.toContain("feat/a");
      expect(await Bun.file(`${wt}/.git`).exists()).toBe(false);
    });

    test("--dry-run lista o worktree sem remover", async () => {
      const wt = await repo.addWorktree("feat/a");
      const t = testEnv(repo.dir);
      expect(await run(["-n", "-w", ...keep], t.env)).toBe(0);
      expect(t.text()).toContain(`worktree ${wt}`);
      expect(await Bun.file(`${wt}/.git`).exists()).toBe(true);
    });

    test("preserva worktree com arquivo não rastreado", async () => {
      const wt = await repo.addWorktree("feat/a");
      await Bun.write(`${wt}/novo.txt`, "x");
      const t = testEnv(repo.dir);
      expect(await run(["-y", "-w", ...keep], t.env)).toBe(0);
      expect(await repo.branches()).toContain("feat/a");
      expect(await Bun.file(`${wt}/novo.txt`).exists()).toBe(true);
      expect(t.text()).toContain("não commitadas");
    });

    test("preserva worktree com alteração em arquivo rastreado", async () => {
      await repo.git("checkout", "-q", "feat/a");
      await Bun.write(`${repo.dir}/f.txt`, "1");
      await repo.git("add", "f.txt");
      await repo.git("commit", "-q", "-m", "f");
      await repo.git("checkout", "-q", "main");
      await repo.git("merge", "-q", "--no-ff", "-m", "m", "feat/a");
      const wt = await repo.addWorktree("feat/a");
      await Bun.write(`${wt}/f.txt`, "2");
      const t = testEnv(repo.dir);
      await run(["-y", "-w", ...keep], t.env);
      expect(await repo.branches()).toContain("feat/a");
      expect(await Bun.file(`${wt}/f.txt`).text()).toBe("2");
    });

    test("preserva worktree bloqueado", async () => {
      const wt = await repo.addWorktree("feat/a");
      await repo.git("worktree", "lock", wt);
      const t = testEnv(repo.dir);
      await run(["-y", "-w", ...keep], t.env);
      expect(await repo.branches()).toContain("feat/a");
      expect(t.text()).toContain("bloqueado");
    });

    test("nunca remove o worktree principal ao rodar de um worktree", async () => {
      await repo.git("checkout", "-q", "feat/a"); // feat/a fica no worktree principal
      const linked = await repo.addWorktree("outro", true); // novo branch a partir de feat/a
      const t = testEnv(linked);
      expect(await run(["-y", "-w", "-b", "main", ...keep], t.env)).toBe(0);
      expect(await repo.branches()).toContain("feat/a");
      expect(await Bun.file(`${repo.dir}/.git/HEAD`).exists()).toBe(true);
      expect(t.text()).toContain("worktree principal");
    });
  });

  describe("worktree apagado à mão", () => {
    const gone = async () => {
      const wt = await repo.addWorktree("feat/a");
      await rm(wt, { recursive: true, force: true });
      return wt;
    };

    test.each([[[]], [["-w"]]])("marca na listagem e mostra a dica de prune (%j)", async (extra) => {
      const wt = await gone();
      const t = testEnv(repo.dir);
      expect(await run(["-y", "-e", "feat/b", "-e", "release/*", ...extra], t.env)).toBe(0);
      expect(t.text()).toContain(`feat/a — worktree apagado manualmente ${wt}`);
      expect(t.text()).toContain(
        "Dica: para apagar worktrees deletadas manualmente, rode git worktree prune",
      );
      expect(await repo.branches()).toContain("feat/a");
    });

    test("depois do prune o branch pode ser apagado", async () => {
      await gone();
      await repo.git("worktree", "prune");
      const t = testEnv(repo.dir);
      expect(await run(["-y"], t.env)).toBe(0);
      expect(t.text()).not.toContain("git worktree prune");
      expect(await repo.branches()).toEqual(["main"]);
    });

    test("sem worktrees apagados, o aviso não aparece", async () => {
      const t = testEnv(repo.dir);
      await run(["-n"], t.env);
      expect(t.text()).not.toContain("git worktree prune");
    });
  });
});
