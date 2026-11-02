import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli.ts";
import { detectLocale, getLocale, setLocale } from "../src/i18n/index.ts";
import { loadSettings, settingsPath } from "../src/settings.ts";
import { testEnv } from "./helpers.ts";

let dir: string;
let configPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "gcm-cfg-"));
  configPath = join(dir, "nested", "settings.json");
  setLocale("pt");
});
afterEach(async () => {
  setLocale("pt");
  await rm(dir, { recursive: true, force: true });
});

const exec = (args: string[]) => {
  const t = testEnv(process.cwd(), { configPath });
  return run(args, t.env).then((code) => ({ code, text: t.text(), err: t.errText() }));
};

test("settingsPath usa XDG_CONFIG_HOME ou ~/.config", () => {
  expect(settingsPath({ XDG_CONFIG_HOME: "/x/cfg" })).toBe("/x/cfg/git-clean-merged/settings.json");
  expect(settingsPath({})).toMatch(/\/\.config\/git-clean-merged\/settings\.json$/);
});

test("set language grava JSON e troca o idioma da confirmação", async () => {
  const r = await exec(["settings", "set", "language", "en"]);
  expect(r.code).toBe(0);
  expect(await Bun.file(configPath).json()).toEqual({ language: "en" });
  expect(getLocale()).toBe("en");
  expect(await loadSettings(configPath)).toEqual({ language: "en" });
});

test("aceita pt-BR e normaliza", async () => {
  await exec(["settings", "set", "language", "pt-BR"]);
  expect(await Bun.file(configPath).json()).toEqual({ language: "pt" });
});

test("get, list e unset", async () => {
  await exec(["settings", "set", "language", "pt"]);
  expect((await exec(["settings", "get", "language"])).text).toBe("pt");
  expect((await exec(["settings"])).text).toContain("language = pt");
  expect((await exec(["settings", "unset", "language"])).code).toBe(0);
  expect(await loadSettings(configPath)).toEqual({});
  expect((await exec(["settings", "get", "language"])).text).toContain("não definida");
});

test("chave, valor e comando inválidos", async () => {
  expect((await exec(["settings", "set", "foo", "x"])).code).toBe(2);
  expect((await exec(["settings", "set", "language", "fr"])).err).toContain("inválido");
  expect((await exec(["settings", "set", "language"])).code).toBe(2);
  expect((await exec(["settings", "bogus"])).code).toBe(2);
  expect(await Bun.file(configPath).exists()).toBe(false);
});

test("arquivo corrompido ou com valores inválidos é ignorado", async () => {
  await Bun.write(configPath, "{ não é json");
  expect(await loadSettings(configPath)).toEqual({});
  await Bun.write(configPath, JSON.stringify({ language: "fr" }));
  expect(await loadSettings(configPath)).toEqual({});
});

test("prioridade: env > settings > locale do sistema > en", () => {
  expect(detectLocale({ LANG: "pt_BR.UTF-8" }, "en")).toBe("en");
  expect(detectLocale({ GIT_CLEAN_MERGED_LANG: "en", LANG: "pt_BR.UTF-8" }, "pt")).toBe("en");
  expect(detectLocale({}, "pt")).toBe("pt");
  expect(detectLocale({ LANG: "pt_BR.UTF-8" })).toBe("pt");
  expect(detectLocale({})).toBe("en");
});
